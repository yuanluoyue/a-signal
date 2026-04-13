import { Injectable, Logger } from '@nestjs/common';
import { and, eq, gte, lte } from 'drizzle-orm';
import { QueueService } from '../../core/queue/queue.service.js';
import { DbService } from '../../core/db/db.service.js';
import { news, News } from '../../core/db/schema.js';

@Injectable()
export class SignalAnalyzeService {
  private readonly logger = new Logger(SignalAnalyzeService.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly dbService: DbService,
  ) {}

  async analyzePendingNews(): Promise<void> {
    this.logger.log('Starting batch analysis of pending news');

    try {
      const pendingNews = await this.fetchPendingNewsFromLastTwoDays();

      if (pendingNews.length === 0) {
        this.logger.log('No pending news found for analysis');
        return;
      }

      this.logger.log(`Found ${pendingNews.length} pending news items to analyze`);

      for (const newsItem of pendingNews) {
        await this.sendNewsToAnalyzeQueue(newsItem);
      }

      this.logger.log(`Successfully sent ${pendingNews.length} news items to analyze queue`);
    } catch (error) {
      this.logger.error(
        `Failed to analyze pending news: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async fetchPendingNewsFromLastTwoDays(): Promise<News[]> {
    try {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const results = await this.dbService.db
        .select()
        .from(news)
        .where(
          and(
            eq(news.analyzeStatus, 'pending'),
            gte(news.publishTime, twoDaysAgo),
            lte(news.publishTime, now),
          ),
        );

      return results;
    } catch (error) {
      this.logger.error(
        `Failed to fetch pending news: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async sendNewsToAnalyzeQueue(newsItem: News): Promise<void> {
    try {
      await this.queueService.sendToNewsAnalyze({
        newsId: newsItem.id,
      });

      this.logger.log(`Sent news ${newsItem.id} to analyze queue`);
    } catch (error) {
      this.logger.error(
        `Failed to send news ${newsItem.id} to analyze queue: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async analyzeNewsById(newsId: string): Promise<void> {
    this.logger.log(`Sending news ${newsId} to analyze queue`);

    try {
      await this.queueService.sendToNewsAnalyze({
        newsId,
      });

      this.logger.log(`Successfully sent news ${newsId} to analyze queue`);
    } catch (error) {
      this.logger.error(
        `Failed to send news ${newsId} to analyze queue: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
