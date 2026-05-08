import { Injectable, Logger } from '@nestjs/common';
import { eq, gte, sql } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { news, signals, backtestRecords } from '../../core/db/schema.js';
import { DashboardStatsResponse, RecentSignalItem } from '../../interfaces/admin/dashboard/dto/dashboard.dto.js';
import { StockService } from '../stock/stock.service.js';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly stockService: StockService,
  ) {}

  async getStats(): Promise<DashboardStatsResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalNewsResult,
      todayNewsResult,
      totalSignalsResult,
      todaySignalsResult,
      stockCountResult,
      pendingAnalysisResult,
      backtestBestResult,
    ] = await Promise.all([
      this.getTotalNews(),
      this.getTodayNews(today),
      this.getTotalSignals(),
      this.getTodaySignals(today),
      this.getStockCount(),
      this.getPendingAnalysis(),
      this.getBestBacktestRecord().catch(() => null),
    ]);

    return {
      totalNews: totalNewsResult,
      todayNews: todayNewsResult,
      totalSignals: totalSignalsResult,
      todaySignals: todaySignalsResult,
      stockCount: stockCountResult,
      pendingAnalysis: pendingAnalysisResult,
      backtestBestReturn: backtestBestResult?.totalReturn || 0,
      backtestBestWinRate: backtestBestResult?.winRate || 0,
    };
  }

  async getRecentSignals(limit: number = 10): Promise<RecentSignalItem[]> {
    this.logger.log('[DashboardService] Getting recent signals');

    const results = await this.dbService.db
      .select({
        id: signals.id,
        stockCode: signals.stockCode,
        stockName: signals.stockName,
        direction: signals.direction,
        confidence: signals.confidence,
        sentiment: signals.sentiment,
        signalTime: signals.signalTime,
        createdAt: signals.createdAt,
        symbol: signals.symbol,
        action: signals.action,
        score: signals.score,
        generatedAt: signals.generatedAt,
      })
      .from(signals)
      .orderBy(sql`${signals.generatedAt} DESC NULLS LAST, ${signals.signalTime} DESC NULLS LAST, ${signals.createdAt} DESC`)
      .limit(limit);

    const stockCodes = results
      .map((item) => item.symbol || item.stockCode)
      .filter((code): code is string => code !== null);

    const stockInfoMap = new Map<string, string>();
    if (stockCodes.length > 0) {
      const stockInfos = await this.stockService.findByCodes(stockCodes);
      stockInfos.forEach((info) => {
        stockInfoMap.set(info.code, info.name);
      });
    }

    return results.map((item) => {
      const code = item.symbol || item.stockCode || '';
      const stockName = stockInfoMap.get(code) || item.stockName || code;

      return {
        id: item.id,
        stockCode: code,
        stockName: stockName,
        direction: item.action || item.direction || '',
        confidence: item.score ? parseFloat(item.score.toString()) * 100 : (item.confidence || 0),
        sentiment: item.sentiment ?? '',
        signalTime: item.generatedAt || item.signalTime || item.createdAt || new Date(),
        createdAt: item.createdAt ?? new Date(),
      };
    });
  }

  private async getTotalNews(): Promise<number> {
    const result = await this.dbService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(news);
    return result[0]?.count || 0;
  }

  private async getTodayNews(today: Date): Promise<number> {
    const result = await this.dbService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(news)
      .where(gte(news.createdAt, today));
    return result[0]?.count || 0;
  }

  private async getTotalSignals(): Promise<number> {
    const result = await this.dbService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(signals);
    return result[0]?.count || 0;
  }

  private async getTodaySignals(today: Date): Promise<number> {
    const result = await this.dbService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(signals)
      .where(gte(signals.createdAt, today));
    return result[0]?.count || 0;
  }

  private async getStockCount(): Promise<number> {
    const result = await this.dbService.db
      .select({ count: sql<number>`COUNT(DISTINCT ${signals.stockCode})` })
      .from(signals);
    return result[0]?.count || 0;
  }

  private async getPendingAnalysis(): Promise<number> {
    const result = await this.dbService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(news)
      .where(eq(news.analyzeStatus, 'pending'));
    return result[0]?.count || 0;
  }

  private async getBestBacktestRecord(): Promise<{ totalReturn: number; winRate: number } | null> {
    try {
      const result = await this.dbService.db
        .select({
          totalReturn: sql<number>`MAX(${backtestRecords.totalReturn})`,
          winRate: sql<number>`MAX(${backtestRecords.winRate})`,
        })
        .from(backtestRecords)
        .limit(1);

      if (!result[0]?.totalReturn) {
        return null;
      }

      return {
        totalReturn: parseFloat(result[0].totalReturn.toString()),
        winRate: parseFloat(result[0].winRate.toString()),
      };
    } catch (error) {
      this.logger.warn('Failed to get backtest records, table may not exist yet');
      return null;
    }
  }
}
