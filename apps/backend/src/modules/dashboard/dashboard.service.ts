import { Injectable, Logger } from '@nestjs/common';
import { eq, gte, sql } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { news, signals, backtestRecords } from '../../core/db/schema.js';
import { DashboardStatsResponse, RecentSignalItem } from '../../interfaces/admin/dashboard/dto/dashboard.dto.js';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly dbService: DbService) {}

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
      })
      .from(signals)
      .orderBy(sql`${signals.signalTime} DESC`)
      .limit(limit);

    return results.map((item) => ({
      id: item.id,
      stockCode: item.stockCode ?? '',
      stockName: item.stockName ?? '',
      direction: item.direction ?? '',
      confidence: item.confidence ?? 0,
      sentiment: item.sentiment ?? '',
      signalTime: item.signalTime ?? new Date(),
      createdAt: item.createdAt ?? new Date(),
    }));
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
