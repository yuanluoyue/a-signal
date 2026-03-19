import { Injectable, Logger } from '@nestjs/common';
import { eq, gte, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { news, signals, webhooks } from '../database/schema.js';
import { DashboardStatsResponse, RecentSignalItem } from './dashboard.dto.js';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async getStats(): Promise<DashboardStatsResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalNewsResult,
      todayNewsResult,
      totalSignalsResult,
      todaySignalsResult,
      pendingAnalysisResult,
      activeWebhooksResult,
    ] = await Promise.all([
      this.getTotalNews(),
      this.getTodayNews(today),
      this.getTotalSignals(),
      this.getTodaySignals(today),
      this.getPendingAnalysis(),
      this.getActiveWebhooks(),
    ]);

    return {
      totalNews: totalNewsResult,
      todayNews: todayNewsResult,
      totalSignals: totalSignalsResult,
      todaySignals: todaySignalsResult,
      pendingAnalysis: pendingAnalysisResult,
      activeWebhooks: activeWebhooksResult,
    };
  }

  async getRecentSignals(limit: number = 10): Promise<RecentSignalItem[]> {
    const results = await this.databaseService.db
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
      stockCode: item.stockCode,
      stockName: item.stockName,
      direction: item.direction,
      confidence: item.confidence,
      sentiment: item.sentiment,
      signalTime: item.signalTime,
      createdAt: item.createdAt,
    }));
  }

  private async getTotalNews(): Promise<number> {
    const result = await this.databaseService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(news);
    return result[0]?.count || 0;
  }

  private async getTodayNews(today: Date): Promise<number> {
    const result = await this.databaseService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(news)
      .where(gte(news.createdAt, today));
    return result[0]?.count || 0;
  }

  private async getTotalSignals(): Promise<number> {
    const result = await this.databaseService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(signals);
    return result[0]?.count || 0;
  }

  private async getTodaySignals(today: Date): Promise<number> {
    const result = await this.databaseService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(signals)
      .where(gte(signals.createdAt, today));
    return result[0]?.count || 0;
  }

  private async getPendingAnalysis(): Promise<number> {
    const result = await this.databaseService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(news)
      .where(eq(news.analyzeStatus, 'pending'));
    return result[0]?.count || 0;
  }

  private async getActiveWebhooks(): Promise<number> {
    const result = await this.databaseService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(webhooks)
      .where(eq(webhooks.enabled, true));
    return result[0]?.count || 0;
  }
}
