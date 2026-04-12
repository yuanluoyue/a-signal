import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { QueueConsumer } from '../core/queue/queue.consumer.js';
import { QueueMessage } from '../core/queue/queue.types.js';
import { QUEUE_NAMES } from '../core/queue/queue.constants.js';
import { VolcengineService, Signal as AnalysisSignal } from '../core/volcengine/volcengine.service.js';
import { DbService } from '../core/db/db.service.js';
import { SignalsService } from '../modules/signals/signals.service.js';
import { news, News } from '../core/db/schema.js';
import { QueueService } from '../core/queue/queue.service.js';
import { WebhooksService } from '../modules/notifications/webhooks.service.js';

export interface NewsAnalyzeMessage {
  newsId: string;
  skipWebhook?: boolean;
}

@Injectable()
export class SignalAnalyzeConsumer extends QueueConsumer {
  protected readonly logger = new Logger(SignalAnalyzeConsumer.name);

  constructor(
    protected readonly configService: ConfigService,
    private readonly volcengineService: VolcengineService,
    private readonly dbService: DbService,
    private readonly signalsService: SignalsService,
    private readonly queueService: QueueService,
    private readonly webhooksService: WebhooksService,
  ) {
    super(configService, {
      queueName: QUEUE_NAMES.NEWS_ANALYZE,
      prefetch: 1,
      autoAck: false,
    });
  }

  protected async processMessage<T>(message: QueueMessage<T>): Promise<void> {
    const data = message.data as NewsAnalyzeMessage;
    const { newsId, skipWebhook } = data;

    this.logger.log(`[SignalAnalyzeConsumer] Processing news analysis for newsId: ${newsId}, skipWebhook: ${skipWebhook}`);

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

      this.logger.log(`[SignalAnalyzeConsumer] Starting AI analysis for news ${newsId}`);
      const analysisResult = await this.volcengineService.analyzeNews({
        newsTitle: newsItem.title,
        newsContent: newsItem.content,
        publishTime: newsItem.publishTime.toISOString(),
      });
      this.logger.log(`[SignalAnalyzeConsumer] AI analysis completed for news ${newsId}, got ${analysisResult.signals.length} signals`);

      const createdSignals = await this.saveAnalysisResults(newsItem, analysisResult.signals);

      await this.triggerKlineFetchTasks(createdSignals);

      if (!skipWebhook) {
        await this.sendWebhookNotifications(newsItem, analysisResult.signals);
      } else {
        this.logger.log(`[SignalAnalyzeConsumer] Skipping webhook notifications for historical signals`);
      }

      await this.updateNewsAnalyzeStatus(newsId, 'analyzed');

      this.logger.log(`[SignalAnalyzeConsumer] Successfully analyzed news ${newsId}, generated ${analysisResult.signals.length} signals`);
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

  private async saveAnalysisResults(newsItem: News, analysisSignals: AnalysisSignal[]): Promise<Array<{ stockCode: string; stockName: string }>> {
    if (analysisSignals.length === 0) {
      this.logger.log(`No signals generated for news ${newsItem.id}`);
      return [];
    }

    try {
      const signalTime = this.getSignalTime(newsItem.publishTime);

      const signalDtos = analysisSignals.map((signal) => ({
        newsId: newsItem.id,
        stockCode: signal.stockCode,
        stockName: signal.stockName,
        direction: signal.direction,
        confidence: signal.confidence,
        sentiment: signal.sentiment,
        reasoning: signal.reasoning,
        keyFactors: signal.keyFactors,
        timeWindow: signal.timeWindow,
        signalTime,
      }));

      await this.signalsService.createSignalsBatch(signalDtos);

      this.logger.log(`Saved ${signalDtos.length} signals for news ${newsItem.id}`);
      
      return signalDtos.map(dto => ({ stockCode: dto.stockCode, stockName: dto.stockName }));
    } catch (error) {
      this.logger.error(
        `Failed to save analysis results for news ${newsItem.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async triggerKlineFetchTasks(signals: Array<{ stockCode: string; stockName: string }>): Promise<void> {
    if (signals.length === 0) return;

    const uniqueStocks = Array.from(new Map(signals.map(s => [s.stockCode, s])).values());

    for (const stock of uniqueStocks) {
      try {
        await this.queueService.sendMessage(QUEUE_NAMES.KLINE_FETCH, {
          stockCode: stock.stockCode,
          period: '1d',
        });
        this.logger.log(`[SignalAnalyzeConsumer] Triggered kline fetch for ${stock.stockCode} (${stock.stockName})`);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        this.logger.error(
          `Failed to trigger kline fetch for ${stock.stockCode}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
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

  private getSignalTime(publishTime: Date): Date {
    const date = new Date(publishTime);
    date.setMinutes(0, 0, 0);
    return date;
  }

  private async sendWebhookNotifications(newsItem: News, signals: AnalysisSignal[]): Promise<void> {
    if (signals.length === 0) {
      return;
    }

    this.logger.log(`[SignalAnalyzeConsumer] Sending webhook notifications for ${signals.length} signals`);

    for (const signal of signals) {
      try {
        await this.webhooksService.sendSignalNotifications({
          newsTitle: newsItem.title,
          stockCode: signal.stockCode,
          stockName: signal.stockName,
          direction: signal.direction,
          confidence: signal.confidence,
          sentiment: signal.sentiment,
          reasoning: signal.reasoning,
          signalTime: this.getSignalTime(newsItem.publishTime),
        });
      } catch (error) {
        this.logger.error(
          `[SignalAnalyzeConsumer] Failed to send webhook notification for ${signal.stockCode}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
