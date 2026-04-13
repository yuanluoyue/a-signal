import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, sql, inArray, notInArray } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { signals, klines, type Signal, type Kline } from '../../core/db/schema.js';
import { KlinesService } from '../klines/klines.service.js';
import { BlacklistService } from '../blacklist/blacklist.service.js';
import { QueueService } from '../../core/queue/queue.service.js';

export interface StockWithSignals {
  stockCode: string;
  stockName: string;
  signalCount: number;
  latestSignalTime: Date | null;
}

export interface StockDetail {
  stockCode: string;
  stockName: string;
  signalCount: number;
  latestSignalTime: Date | null;
  signals: Signal[];
}

@Injectable()
export class StocksService {
  private readonly logger = new Logger(StocksService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly klinesService: KlinesService,
    private readonly blacklistService: BlacklistService,
    private readonly queueService: QueueService,
  ) {}

  async findAllWithSignals(): Promise<StockWithSignals[]> {
    const blacklistedCodes = await this.blacklistService.getAllBlacklistedStockCodes();

    const results = await this.dbService.db.execute(sql`
      SELECT 
        s.stock_code as "stockCode",
        latest.stock_name as "stockName",
        COUNT(*) as "signalCount",
        MAX(s.signal_time) as "latestSignalTime"
      FROM signals s
      INNER JOIN (
        SELECT DISTINCT ON (stock_code) stock_code, stock_name
        FROM signals
        ORDER BY stock_code, signal_time DESC
      ) latest ON s.stock_code = latest.stock_code
      GROUP BY s.stock_code, latest.stock_name
      ORDER BY MAX(s.signal_time) DESC
    `);

    let filteredResults = results.rows as unknown as StockWithSignals[];
    
    if (blacklistedCodes.length > 0) {
      filteredResults = filteredResults.filter(r => !blacklistedCodes.includes(r.stockCode));
    }

    return filteredResults.map(r => ({
      stockCode: r.stockCode,
      stockName: r.stockName,
      signalCount: Number(r.signalCount),
      latestSignalTime: r.latestSignalTime,
    }));
  }

  async findByCode(stockCode: string): Promise<StockDetail | null> {
    const isBlacklisted = await this.blacklistService.isBlacklisted(stockCode);
    if (isBlacklisted) {
      return null;
    }

    const stockSignals = await this.dbService.db
      .select()
      .from(signals)
      .where(eq(signals.stockCode, stockCode))
      .orderBy(desc(signals.signalTime));

    if (stockSignals.length === 0) {
      return null;
    }

    const latestSignal = stockSignals[0];

    return {
      stockCode,
      stockName: latestSignal.stockName,
      signalCount: stockSignals.length,
      latestSignalTime: latestSignal.signalTime,
      signals: stockSignals,
    };
  }

  async findSignalsByCode(stockCode: string): Promise<Signal[]> {
    const isBlacklisted = await this.blacklistService.isBlacklisted(stockCode);
    if (isBlacklisted) {
      return [];
    }

    return this.dbService.db
      .select()
      .from(signals)
      .where(eq(signals.stockCode, stockCode))
      .orderBy(desc(signals.signalTime));
  }

  async findKlinesByCode(
    stockCode: string,
    period: '1d' | '4h' = '4h',
    limit: number = 100,
  ): Promise<Kline[]> {
    const isBlacklisted = await this.blacklistService.isBlacklisted(stockCode);
    if (isBlacklisted) {
      return [];
    }

    return this.dbService.db
      .select()
      .from(klines)
      .where(
        and(
          eq(klines.stockCode, stockCode),
          eq(klines.period, period),
        ),
      )
      .orderBy(desc(klines.timestamp))
      .limit(limit);
  }

  async requestKlinesFetch(stockCode: string, period: '1d' | '4h' = '4h'): Promise<void> {
    this.logger.log(`Requesting klines fetch for ${stockCode} (${period})`);
    await this.queueService.sendToKlineFetch({ stockCode, period });
  }

  async deleteSignalsByStockCode(stockCode: string): Promise<number> {
    this.logger.log(`[StocksService] Deleting all signals for stock: ${stockCode}`);

    const result = await this.dbService.db
      .delete(signals)
      .where(eq(signals.stockCode, stockCode));

    const deletedCount = result.rowCount || 0;
    this.logger.log(`[StocksService] Deleted ${deletedCount} signals for ${stockCode}`);

    return deletedCount;
  }

  async deleteSignalById(signalId: string): Promise<boolean> {
    this.logger.log(`[StocksService] Deleting signal: ${signalId}`);

    const result = await this.dbService.db
      .delete(signals)
      .where(eq(signals.id, signalId));

    const deletedCount = result.rowCount || 0;
    return deletedCount > 0;
  }
}
