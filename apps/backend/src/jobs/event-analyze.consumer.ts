import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { QueueConsumer } from '../core/queue/queue.consumer.js';
import { QueueMessage } from '../core/queue/queue.types.js';
import { QUEUE_NAMES } from '../core/queue/queue.constants.js';
import { VolcengineService, EventOutput } from '../core/volcengine/volcengine.service.js';
import { DbService } from '../core/db/db.service.js';
import { EventService, CreateEventDto } from '../modules/event/event.service.js';
import { news, News } from '../core/db/schema.js';

export interface EventAnalyzeMessage {
  newsId: string;
}

@Injectable()
export class EventAnalyzeConsumer extends QueueConsumer {
  protected readonly logger = new Logger(EventAnalyzeConsumer.name);

  constructor(
    protected readonly configService: ConfigService,
    private readonly volcengineService: VolcengineService,
    private readonly dbService: DbService,
    private readonly eventService: EventService,
  ) {
    super(configService, {
      queueName: QUEUE_NAMES.EVENT_ANALYZE,
      prefetch: 1,
      autoAck: false,
    });
  }

  protected async processMessage<T>(message: QueueMessage<T>): Promise<void> {
    const data = message.data as EventAnalyzeMessage;
    const { newsId } = data;

    this.logger.log(`[EventAnalyzeConsumer] Processing event analysis for newsId: ${newsId}`);

    try {
      const newsItem = await this.fetchNewsById(newsId);
      if (!newsItem) {
        this.logger.warn(`[EventAnalyzeConsumer] News not found: ${newsId}`);
        return;
      }

      if (newsItem.analyzeStatus === 'analyzed') {
        this.logger.log(`[EventAnalyzeConsumer] News ${newsId} already analyzed, skipping`);
        return;
      }

      this.logger.log(`[EventAnalyzeConsumer] Starting event extraction for news ${newsId}`);
      const analysisResult = await this.volcengineService.generateEventsFromNews({
        newsTitle: newsItem.title,
        newsContent: newsItem.content,
        publishTime: newsItem.publishTime.toISOString(),
      });
      this.logger.log(`[EventAnalyzeConsumer] Event extraction completed for news ${newsId}, got ${analysisResult.events.length} events`);

      await this.saveEvents(newsItem, analysisResult.events);

      await this.updateNewsAnalyzeStatus(newsId, 'analyzed');

      this.logger.log(`[EventAnalyzeConsumer] Successfully analyzed news ${newsId}, generated ${analysisResult.events.length} events`);
    } catch (error) {
      this.logger.error(
        `[EventAnalyzeConsumer] Failed to analyze news ${newsId}: ${error instanceof Error ? error.message : String(error)}`,
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

  private async saveEvents(newsItem: News, eventOutputs: EventOutput[]) {
    if (eventOutputs.length === 0) {
      this.logger.log(`No events generated for news ${newsItem.id}`);
      return [];
    }

    try {
      const eventDtos: CreateEventDto[] = eventOutputs.map((eventOutput) => {
        const effectivePeriodStart = new Date(newsItem.publishTime);
        let effectivePeriodEnd: Date | undefined;
        if (eventOutput.effectivePeriodDays) {
          effectivePeriodEnd = new Date(effectivePeriodStart.getTime() + eventOutput.effectivePeriodDays * 24 * 60 * 60 * 1000);
        }

        return {
          newsId: newsItem.id,
          occurredAt: new Date(newsItem.publishTime),
          category: eventOutput.category,
          subcategory: eventOutput.subcategory,
          subjects: eventOutput.subjects,
          sentimentDirection: eventOutput.sentimentDirection,
          sentimentConfidence: eventOutput.sentimentConfidence,
          sentimentRationale: eventOutput.sentimentRationale,
          importanceScore: eventOutput.importanceScore,
          importanceBenchmark: eventOutput.importanceBenchmark,
          surpriseScore: eventOutput.surpriseScore,
          surpriseBaseline: eventOutput.surpriseBaseline,
          effectivePeriodStart,
          effectivePeriodEnd,
          effectiveDecayType: eventOutput.effectiveDecayType,
          metrics: eventOutput.metrics,
          sourceUrl: newsItem.originalUrl,
          sourceTitle: newsItem.title,
          sourceSummary: newsItem.content.substring(0, 500),
          sourcePublisher: newsItem.source,
        };
      });

      const results = await this.eventService.createEventsBatch(eventDtos);
      this.logger.log(`Saved ${results.length} events for news ${newsItem.id}`);
      return results;
    } catch (error) {
      this.logger.error(
        `Failed to save events for news ${newsItem.id}: ${error instanceof Error ? error.message : String(error)}`,
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
