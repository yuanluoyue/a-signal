import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { QueueConsumer } from '../core/queue/queue.consumer.js';
import { QueueMessage } from '../core/queue/queue.types.js';
import { QUEUE_NAMES } from '../core/queue/queue.constants.js';
import { DbService } from '../core/db/db.service.js';
import { news, News } from '../core/db/schema.js';
import { QueueService } from '../core/queue/queue.service.js';

export interface NewsAnalyzeMessage {
  newsId: string;
}

@Injectable()
export class SignalAnalyzeConsumer extends QueueConsumer {
  protected readonly logger = new Logger(SignalAnalyzeConsumer.name);

  constructor(
    protected readonly configService: ConfigService,
    private readonly dbService: DbService,
    private readonly queueService: QueueService,
  ) {
    super(configService, {
      queueName: QUEUE_NAMES.NEWS_ANALYZE,
      prefetch: 1,
      autoAck: false,
    });
  }

  protected async processMessage<T>(message: QueueMessage<T>): Promise<void> {
    const data = message.data as NewsAnalyzeMessage;
    const { newsId } = data;

    this.logger.log(`[SignalAnalyzeConsumer] Processing news analysis for newsId: ${newsId}`);

    try {
      const newsItem = await this.fetchNewsById(newsId);
      if (!newsItem) {
        this.logger.warn(`[SignalAnalyzeConsumer] News not found: ${newsId}`);
        return;
      }

      this.logger.log(`[SignalAnalyzeConsumer] News ${newsId} current status: ${newsItem.analyzeStatus}`);

      if (newsItem.analyzeStatus === 'analyzed') {
        this.logger.log(`[SignalAnalyzeConsumer] News ${newsId} already analyzed, skipping`);
        return;
      }

      this.logger.log(`[SignalAnalyzeConsumer] Redirecting news ${newsId} to event analysis queue`);
      await this.queueService.sendMessage(QUEUE_NAMES.EVENT_ANALYZE, { newsId });
      this.logger.log(`[SignalAnalyzeConsumer] News ${newsId} redirected to event analysis`);
    } catch (error) {
      this.logger.error(
        `[SignalAnalyzeConsumer] Failed to analyze news ${newsId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.updateNewsAnalyzeStatus(newsId, 'failed');
      throw error;
    }
  }

  private async fetchNewsById(newsId: string): Promise<News | null> {
    try {
      const [result] = await this.dbService.db
        .select()
        .from(news)
        .where(eq(news.id, newsId));

      return result || null;
    } catch (error) {
      this.logger.error(
        `Failed to fetch news ${newsId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async updateNewsAnalyzeStatus(newsId: string, status: 'analyzed' | 'failed'): Promise<void> {
    try {
      await this.dbService.db
        .update(news)
        .set({ analyzeStatus: status })
        .where(eq(news.id, newsId));

      this.logger.log(`Updated news ${newsId} analyzeStatus to ${status}`);
    } catch (error) {
      this.logger.error(
        `Failed to update news ${newsId} status: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
