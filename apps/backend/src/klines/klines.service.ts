import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { klines, signals, NewKline, Kline } from '../database/schema.js';

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
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * 将股票代码转换为新浪格式
   * 600519 -> sh600519 (上海主板)
   * 000001 -> sz000001 (深圳主板)
   * 300001 -> sz300001 (创业板)
   * 688001 -> sh688001 (科创板)
   */
  private formatStockCode(code: string): string {
    const cleanCode = code.trim().toLowerCase();

    if (cleanCode.startsWith('sh') || cleanCode.startsWith('sz')) {
      return cleanCode;
    }

    // 6位数字代码
    if (/^\d{6}$/.test(cleanCode)) {
      // 上海: 600-609, 688(科创板), 689, 510-519(ETF)
      if (/^(6\d{5}|510\d{3}|511\d{3}|512\d{3}|513\d{3}|514\d{3}|515\d{3}|516\d{3}|517\d{3}|518\d{3}|519\d{3})$/.test(cleanCode)) {
        return `sh${cleanCode}`;
      }
      // 深圳: 000-009, 300-309(创业板), 001-009
      if (/^(0\d{5}|1\d{5}|2\d{5}|3\d{5})$/.test(cleanCode)) {
        return `sz${cleanCode}`;
      }
    }

    // 5位数字代码（港股）
    if (/^\d{5}$/.test(cleanCode)) {
      return `hk${cleanCode}`;
    }

    this.logger.warn(`Unknown stock code format: ${code}, using as-is`);
    return cleanCode;
  }

  /**
   * 获取周期对应的 scale 参数
   * Sina API: scale 单位为分钟
   * 参考其他项目实现：
   * - 日线使用 scale=240 (4小时线作为日线近似)
   * - 4小时线使用 scale=60 (1小时线聚合)
   */
  private getScale(period: KlinePeriod): number {
    const scaleMap: Record<KlinePeriod, number> = {
      '1d': 240,  // 日线使用 240 (4小时)
      '4h': 60,   // 4小时使用 60 (1小时)
    };
    return scaleMap[period];
  }

  /**
   * 从新浪财经获取K线数据
   */
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

  /**
   * 解析并保存K线数据
   */
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

        await this.databaseService.db
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

  /**
   * 获取并保存K线数据（公共方法）
   */
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

  /**
   * 查询K线数据
   */
  async getKlines(
    stockCode: string,
    period: KlinePeriod,
    startTime?: Date,
    endTime?: Date,
  ): Promise<Kline[]> {
    const cleanCode = stockCode.trim().toLowerCase();

    let query = this.databaseService.db
      .select()
      .from(klines)
      .where(and(eq(klines.stockCode, cleanCode), eq(klines.period, period)))
      .orderBy(klines.timestamp);

    if (startTime) {
      query = this.databaseService.db
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
      query = this.databaseService.db
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
      query = this.databaseService.db
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

  /**
   * 获取有信号的所有股票代码（用于定时更新）
   */
  async getStockCodesWithSignals(): Promise<string[]> {
    const results = await this.databaseService.db
      .selectDistinct({ stockCode: signals.stockCode })
      .from(signals);

    return results.map((r) => r.stockCode);
  }

  /**
   * 获取最新的K线数据时间
   */
  async getLatestKlineTime(stockCode: string, period: KlinePeriod): Promise<Date | null> {
    const cleanCode = stockCode.trim().toLowerCase();

    const result = await this.databaseService.db
      .select({ maxTimestamp: sql<Date>`MAX(${klines.timestamp})` })
      .from(klines)
      .where(and(eq(klines.stockCode, cleanCode), eq(klines.period, period)));

    return result[0]?.maxTimestamp || null;
  }

  /**
   * 删除指定股票和周期的K线数据
   */
  async deleteKlines(stockCode: string, period?: KlinePeriod): Promise<number> {
    const cleanCode = stockCode.trim().toLowerCase();

    let query;
    if (period) {
      query = this.databaseService.db
        .delete(klines)
        .where(and(eq(klines.stockCode, cleanCode), eq(klines.period, period)));
    } else {
      query = this.databaseService.db.delete(klines).where(eq(klines.stockCode, cleanCode));
    }

    const result = await query;
    return result.rowCount || 0;
  }
}
