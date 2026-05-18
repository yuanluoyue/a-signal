import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, sql, inArray, notInArray, or } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { signals, klines, stocks, events, type Signal, type Kline } from '../../core/db/schema.js';
import { KlinesService } from '../klines/klines.service.js';
import { BlacklistService } from '../blacklist/blacklist.service.js';
import { QueueService } from '../../core/queue/queue.service.js';
import { StockService } from './stock.service.js';

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
    private readonly stockService: StockService,
  ) {}

  async findAllWithSignals(): Promise<StockWithSignals[]> {
    const blacklistedCodes = await this.blacklistService.getAllBlacklistedStockCodes();

    const results = await this.dbService.db.execute(sql`
      SELECT
        COALESCE(s.symbol, s.stock_code) as "stockCode",
        COUNT(*) as "signalCount",
        MAX(COALESCE(s.generated_at, s.signal_time, s.created_at)) as "latestSignalTime"
      FROM signals s
      WHERE COALESCE(s.symbol, s.stock_code) IS NOT NULL
      GROUP BY COALESCE(s.symbol, s.stock_code)
      ORDER BY MAX(COALESCE(s.generated_at, s.signal_time, s.created_at)) DESC
    `);

    let filteredResults = results.rows as unknown as Array<{
      stockCode: string;
      signalCount: number;
      latestSignalTime: Date | null;
    }>;

    if (blacklistedCodes.length > 0) {
      filteredResults = filteredResults.filter(r => !blacklistedCodes.includes(r.stockCode));
    }

    const stockCodes = filteredResults.map(r => r.stockCode);
    const stockNamesMap = await this.stockService.findByCodes(stockCodes);

    return filteredResults.map(r => ({
      stockCode: r.stockCode,
      stockName: stockNamesMap.get(r.stockCode)?.name || r.stockCode,
      signalCount: Number(r.signalCount),
      latestSignalTime: r.latestSignalTime,
    }));
  }

  async findByCode(stockCode: string): Promise<StockDetail | null> {
    const isBlacklisted = await this.blacklistService.isBlacklisted(stockCode);
    if (isBlacklisted) {
      return null;
    }

    const stockInfo = await this.stockService.findByCodes([stockCode]);
    const stockName = stockInfo.get(stockCode)?.name || stockCode;

    const stockSignals = await this.dbService.db
      .select({
        id: signals.id,
        newsId: signals.newsId,
        stockCode: signals.stockCode,
        stockName: signals.stockName,
        direction: signals.direction,
        confidence: signals.confidence,
        sentiment: signals.sentiment,
        reasoning: signals.reasoning,
        keyFactors: signals.keyFactors,
        timeWindow: signals.timeWindow,
        signalTime: signals.signalTime,
        eventId: signals.eventId,
        symbol: signals.symbol,
        action: signals.action,
        score: signals.score,
        generatedAt: signals.generatedAt,
        validFrom: signals.validFrom,
        validTo: signals.validTo,
        reason: signals.reason,
        ruleId: signals.ruleId,
        ruleSnapshot: signals.ruleSnapshot,
        weight: signals.weight,
        createdAt: signals.createdAt,
        updatedAt: signals.updatedAt,
        eventOccurredAt: events.occurredAt,
      })
      .from(signals)
      .leftJoin(events, eq(signals.eventId, events.id))
      .where(
        or(
          eq(signals.stockCode, stockCode),
          eq(signals.symbol, stockCode)
        )
      )
      .orderBy(desc(signals.signalTime));

    if (stockSignals.length === 0) {
      return {
        stockCode,
        stockName,
        signalCount: 0,
        latestSignalTime: null,
        signals: [],
      };
    }

    const latestSignal = stockSignals[0];

    return {
      stockCode,
      stockName: latestSignal.stockName ?? stockName,
      signalCount: stockSignals.length,
      latestSignalTime: latestSignal.signalTime,
      signals: stockSignals as Signal[],
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
      .where(
        or(
          eq(signals.stockCode, stockCode),
          eq(signals.symbol, stockCode)
        )
      )
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
      .where(
        or(
          eq(signals.stockCode, stockCode),
          eq(signals.symbol, stockCode)
        )
      );

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
