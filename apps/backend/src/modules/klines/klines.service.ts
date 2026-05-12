import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { CacheService } from '../../core/cache/cache.service.js';
import { klines, signals, NewKline, Kline } from '../../core/db/schema.js';

export type KlinePeriod = '1d' | '4h';

export interface SinaKlineData {
  day: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface KlineFetchMessage {
  stockCode: string;
  period: KlinePeriod;
}

@Injectable()
export class KlinesService {
  private readonly logger = new Logger(KlinesService.name);
  private readonly sinaApiUrl = 'https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData';

  constructor(
    private readonly httpService: HttpService,
    private readonly dbService: DbService,
    private readonly cacheService: CacheService,
  ) {}

  private formatStockCode(code: string): string {
    const cleanCode = code.trim().toLowerCase();

    if (cleanCode.startsWith('sh') || cleanCode.startsWith('sz')) {
      return cleanCode;
    }

    if (/^\d{6}$/.test(cleanCode)) {
      if (/^(6\d{5}|510\d{3}|511\d{3}|512\d{3}|513\d{3}|514\d{3}|515\d{3}|516\d{3}|517\d{3}|518\d{3}|519\d{3})$/.test(cleanCode)) {
        return `sh${cleanCode}`;
      }
      if (/^(0\d{5}|1\d{5}|2\d{5}|3\d{5})$/.test(cleanCode)) {
        return `sz${cleanCode}`;
      }
    }

    if (/^\d{5}$/.test(cleanCode)) {
      return `hk${cleanCode}`;
    }

    this.logger.warn(`Unknown stock code format: ${code}, using as-is`);
    return cleanCode;
  }

  private getScale(period: KlinePeriod): number {
    const scaleMap: Record<KlinePeriod, number> = {
      '1d': 240,
      '4h': 60,
    };
    return scaleMap[period];
  }

  async fetchKlinesFromSina(
    stockCode: string,
    period: KlinePeriod,
    dataLen = 500,
  ): Promise<SinaKlineData[]> {
    const symbol = this.formatStockCode(stockCode);
    const scale = this.getScale(period);
    const url = `${this.sinaApiUrl}?symbol=${symbol}&scale=${scale}&ma=no&datalen=${dataLen}`;

    this.logger.log(`[KlinesService] Fetching ${period} klines from Sina: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': `https://finance.sina.com.cn/realstock/company/${symbol}/nc.shtml`,
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          },
          timeout: 15000,
        }),
      );

      const data = response.data;

      this.logger.log(`[KlinesService] Response type: ${typeof data}, isArray: ${Array.isArray(data)}`);

      if (!data) {
        this.logger.warn(`Empty response for ${symbol} ${period}`);
        return [];
      }

      if (!Array.isArray(data)) {
        this.logger.warn(`Invalid response format for ${symbol} ${period}: ${JSON.stringify(data).substring(0, 200)}`);
        return [];
      }

      if (data.length === 0) {
        this.logger.warn(`Empty klines data for ${symbol} ${period}`);
        return [];
      }

      this.logger.log(`[KlinesService] Fetched ${data.length} ${period} klines for ${symbol}`);

      return data as SinaKlineData[];
    } catch (error) {
      this.logger.error(`Failed to fetch ${period} klines for ${symbol}:`, error);
      if ((error as any).response) {
        this.logger.error(`Response status: ${(error as any).response.status}, data: ${JSON.stringify((error as any).response.data).substring(0, 200)}`);
      }
      return [];
    }
  }

  async saveKlines(
    stockCode: string,
    period: KlinePeriod,
    klineData: SinaKlineData[],
  ): Promise<number> {
    if (!klineData || klineData.length === 0) {
      this.logger.warn(`No kline data to save for ${stockCode}`);
      return 0;
    }

    const cleanCode = stockCode.trim().toLowerCase();
    let savedCount = 0;

    for (const item of klineData) {
      try {
        const timestamp = new Date(item.day);

        if (isNaN(timestamp.getTime())) {
          this.logger.warn(`Invalid timestamp: ${item.day}`);
          continue;
        }

        const newKline: NewKline = {
          stockCode: cleanCode,
          period,
          timestamp,
          open: item.open,
          close: item.close,
          high: item.high,
          low: item.low,
          volume: item.volume,
        };

        await this.dbService.db
          .insert(klines)
          .values(newKline)
          .onConflictDoUpdate({
            target: [klines.stockCode, klines.period, klines.timestamp],
            set: {
              open: newKline.open,
              close: newKline.close,
              high: newKline.high,
              low: newKline.low,
              volume: newKline.volume,
            },
          });

        savedCount++;
      } catch (error) {
        this.logger.error(`Failed to save kline for ${stockCode} at ${item.day}:`, error);
      }
    }

    this.logger.log(`Saved ${savedCount} klines for ${stockCode} (${period})`);
    return savedCount;
  }

  async fetchKlines(stockCode: string, period: KlinePeriod): Promise<number> {
    this.logger.log(`Fetching klines for ${stockCode} (${period})`);

    try {
      const klineData = await this.fetchKlinesFromSina(stockCode, period);
      const savedCount = await this.saveKlines(stockCode, period, klineData);
      return savedCount;
    } catch (error) {
      this.logger.error(`Failed to fetch and save klines for ${stockCode}:`, error);
      throw error;
    }
  }

  async getKlines(
    stockCode: string,
    period: KlinePeriod,
    startTime?: Date,
    endTime?: Date,
  ): Promise<Kline[]> {
    const cleanCode = stockCode.trim().toLowerCase();

    let query = this.dbService.db
      .select()
      .from(klines)
      .where(and(eq(klines.stockCode, cleanCode), eq(klines.period, period)))
      .orderBy(klines.timestamp);

    if (startTime) {
      query = this.dbService.db
        .select()
        .from(klines)
        .where(
          and(
            eq(klines.stockCode, cleanCode),
            eq(klines.period, period),
            gte(klines.timestamp, startTime),
          ),
        )
        .orderBy(klines.timestamp);
    }

    if (endTime) {
      query = this.dbService.db
        .select()
        .from(klines)
        .where(
          and(
            eq(klines.stockCode, cleanCode),
            eq(klines.period, period),
            lte(klines.timestamp, endTime),
          ),
        )
        .orderBy(klines.timestamp);
    }

    if (startTime && endTime) {
      query = this.dbService.db
        .select()
        .from(klines)
        .where(
          and(
            eq(klines.stockCode, cleanCode),
            eq(klines.period, period),
            gte(klines.timestamp, startTime),
            lte(klines.timestamp, endTime),
          ),
        )
        .orderBy(klines.timestamp);
    }

    const results = await query;
    return results;
  }

  async getStockCodesWithSignals(): Promise<string[]> {
    const results = await this.dbService.db
      .selectDistinct({ stockCode: signals.stockCode })
      .from(signals);

    return results.map((r) => r.stockCode).filter((code): code is string => code !== null);
  }

  async getLatestKlineTime(stockCode: string, period: KlinePeriod): Promise<Date | null> {
    const cleanCode = stockCode.trim().toLowerCase();

    const result = await this.dbService.db
      .select({ maxTimestamp: sql<Date>`MAX(${klines.timestamp})` })
      .from(klines)
      .where(and(eq(klines.stockCode, cleanCode), eq(klines.period, period)));

    return result[0]?.maxTimestamp || null;
  }

  async deleteKlines(stockCode: string, period?: KlinePeriod): Promise<number> {
    const cleanCode = stockCode.trim().toLowerCase();

    let query;
    if (period) {
      query = this.dbService.db
        .delete(klines)
        .where(and(eq(klines.stockCode, cleanCode), eq(klines.period, period)));
    } else {
      query = this.dbService.db.delete(klines).where(eq(klines.stockCode, cleanCode));
    }

    const result = await query;
    return result.rowCount || 0;
  }

  async checkAndUpdateKlines(stockCode: string, period: KlinePeriod): Promise<{ updated: boolean; latestTime: Date | null; message: string }> {
    const cleanCode = stockCode.trim().toLowerCase();
    const cacheKey = `kline:check:${cleanCode}:${period}`;
    
    const cached = await this.cacheService.get<{ updated: boolean; latestTime: Date | null; message: string }>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    
    const latestTimeRaw = await this.getLatestKlineTime(cleanCode, period);
    const latestTime = latestTimeRaw ? new Date(latestTimeRaw) : null;
    
    const needsUpdate = this.checkIfNeedsUpdate(latestTime, period, now);
    
    if (!needsUpdate) {
      const result = {
        updated: false,
        latestTime,
        message: `K线数据已是最新，最新时间: ${latestTime ? latestTime.toISOString() : '无数据'}`,
      };
      await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
      return result;
    }
    
    this.logger.log(`K线数据需要更新，正在获取 ${cleanCode} (${period}) 的最新数据...`);
    
    const savedCount = await this.fetchKlines(cleanCode, period);
    
    const newLatestTimeRaw = await this.getLatestKlineTime(cleanCode, period);
    const newLatestTime = newLatestTimeRaw ? new Date(newLatestTimeRaw) : null;
    
    const result = {
      updated: savedCount > 0,
      latestTime: newLatestTime,
      message: savedCount > 0 
        ? `成功更新 ${savedCount} 条K线数据` 
        : '更新失败，未获取到新数据',
    };
    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
    return result;
  }

  private checkIfNeedsUpdate(latestTime: Date | null, period: KlinePeriod, now: Date): boolean {
    if (!latestTime) {
      return true;
    }
    
    const latest = new Date(latestTime);
    
    if (period === '1d') {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      
      if (latest < yesterdayStart) {
        return true;
      }
      
      const hour = now.getHours();
      if (hour >= 15 && latest < todayStart) {
        return true;
      }
      
      return false;
    }
    
    if (period === '4h') {
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      return latest < fourHoursAgo;
    }
    
    return false;
  }

  async checkAndUpdateKlinesForBacktest(stockCodes: string[]): Promise<{ updated: number; failed: number }> {
    const periods: KlinePeriod[] = ['1d', '4h'];
    let updated = 0;
    let failed = 0;
    
    const uniqueCodes = [...new Set(stockCodes.map(code => code.trim().toLowerCase()))];
    
    for (const code of uniqueCodes) {
      for (const period of periods) {
        try {
          const result = await this.checkAndUpdateKlines(code, period);
          if (result.updated) {
            updated++;
            this.logger.log(`Updated ${period} klines for ${code}: ${result.message}`);
          }
        } catch (error) {
          failed++;
          this.logger.error(`Failed to update ${period} klines for ${code}:`, error);
        }
      }
    }
    
    return { updated, failed };
  }
}
