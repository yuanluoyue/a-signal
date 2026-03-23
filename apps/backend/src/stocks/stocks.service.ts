import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, sql, inArray, notInArray } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { signals, klines, type Signal, type Kline } from '../database/schema.js';
import { KlinesService } from '../klines/klines.service.js';
import { BlacklistService } from '../blacklist/blacklist.service.js';
import { QueueService } from '../queue/queue.service.js';

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
    private readonly databaseService: DatabaseService,
    private readonly klinesService: KlinesService,
    private readonly blacklistService: BlacklistService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * 获取有信号的股票列表（排除黑名单）
   */
  async findAllWithSignals(): Promise<StockWithSignals[]> {
    // 获取所有黑名单股票代码
    const blacklistedCodes = await this.blacklistService.getAllBlacklistedStockCodes();

    // 查询有信号的股票
    let query = this.databaseService.db
      .select({
        stockCode: signals.stockCode,
        stockName: signals.stockName,
        signalCount: sql<number>`COUNT(*)`,
        latestSignalTime: sql<Date>`MAX(${signals.signalTime})`,
      })
      .from(signals)
      .groupBy(signals.stockCode, signals.stockName)
      .orderBy(desc(sql`MAX(${signals.signalTime})`));

    // 如果有黑名单，排除这些股票
    if (blacklistedCodes.length > 0) {
      query = query.where(notInArray(signals.stockCode, blacklistedCodes)) as typeof query;
    }

    const results = await query;

    return results.map(r => ({
      stockCode: r.stockCode,
      stockName: r.stockName,
      signalCount: Number(r.signalCount),
      latestSignalTime: r.latestSignalTime,
    }));
  }

  /**
   * 获取股票详情
   */
  async findByCode(stockCode: string): Promise<StockDetail | null> {
    // 检查是否在黑名单中
    const isBlacklisted = await this.blacklistService.isBlacklisted(stockCode);
    if (isBlacklisted) {
      return null;
    }

    // 获取该股票的所有信号
    const stockSignals = await this.databaseService.db
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

  /**
   * 获取股票历史信号
   */
  async findSignalsByCode(stockCode: string): Promise<Signal[]> {
    // 检查是否在黑名单中
    const isBlacklisted = await this.blacklistService.isBlacklisted(stockCode);
    if (isBlacklisted) {
      return [];
    }

    return this.databaseService.db
      .select()
      .from(signals)
      .where(eq(signals.stockCode, stockCode))
      .orderBy(desc(signals.signalTime));
  }

  /**
   * 获取股票 K 线数据
   */
  async findKlinesByCode(
    stockCode: string,
    period: '1d' | '4h' = '4h',
    limit: number = 100,
  ): Promise<Kline[]> {
    // 检查是否在黑名单中
    const isBlacklisted = await this.blacklistService.isBlacklisted(stockCode);
    if (isBlacklisted) {
      return [];
    }

    return this.databaseService.db
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

  /**
   * 请求获取股票 K 线数据（发送到队列）
   */
  async requestKlinesFetch(stockCode: string, period: '1d' | '4h' = '4h'): Promise<void> {
    this.logger.log(`Requesting klines fetch for ${stockCode} (${period})`);
    await this.queueService.sendToKlineFetch({ stockCode, period });
  }

  /**
   * 删除股票的所有信号（清理脏数据）
   */
  async deleteSignalsByStockCode(stockCode: string): Promise<number> {
    this.logger.log(`[StocksService] Deleting all signals for stock: ${stockCode}`);

    const result = await this.databaseService.db
      .delete(signals)
      .where(eq(signals.stockCode, stockCode));

    const deletedCount = result.rowCount || 0;
    this.logger.log(`[StocksService] Deleted ${deletedCount} signals for ${stockCode}`);

    return deletedCount;
  }

  /**
   * 删除指定ID的信号
   */
  async deleteSignalById(signalId: string): Promise<boolean> {
    this.logger.log(`[StocksService] Deleting signal: ${signalId}`);

    const result = await this.databaseService.db
      .delete(signals)
      .where(eq(signals.id, signalId));

    const deletedCount = result.rowCount || 0;
    return deletedCount > 0;
  }
}
