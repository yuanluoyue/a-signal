import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service.js';
import { NewsService } from '../news/news.service.js';
import { SignalAnalyzeService } from '../signals/signal-analyze.service.js';
import { KlinesService } from '../klines/klines.service.js';
import { QueueService } from '../queue/queue.service.js';

@Injectable()
export class SchedulerTasksService {
  private readonly logger = new Logger(SchedulerTasksService.name);

  constructor(
    private readonly schedulerService: SchedulerService,
    private readonly newsService: NewsService,
    private readonly signalAnalyzeService: SignalAnalyzeService,
    private readonly klinesService: KlinesService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * 晚上7点新闻抓取定时任务
   * Cron: 0 0 19 * * * (每天19:00:00)
   */
  @Cron('0 0 19 * * *', {
    name: 'news-crawl',
    timeZone: 'Asia/Shanghai',
  })
  async handleNewsCrawl(): Promise<void> {
    const taskName = 'news-crawl';
    this.logger.log(`[${taskName}] Scheduled task triggered`);

    try {
      const enabled = await this.schedulerService.isTaskEnabled(taskName);
      if (!enabled) {
        this.logger.warn(`[${taskName}] Task is disabled, skipping execution`);
        return;
      }

      await this.newsService.crawlAndQueueNews(3);
      await this.schedulerService.updateLastExecutedAt(taskName);

      this.logger.log(`[${taskName}] Task completed successfully`);
    } catch (error) {
      this.logger.error(
        `[${taskName}] Task failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * 晚上8点新闻分析定时任务
   * Cron: 0 0 20 * * * (每天20:00:00)
   */
  @Cron('0 0 20 * * *', {
    name: 'news-analyze',
    timeZone: 'Asia/Shanghai',
  })
  async handleNewsAnalyze(): Promise<void> {
    const taskName = 'news-analyze';
    this.logger.log(`[${taskName}] Scheduled task triggered`);

    try {
      const enabled = await this.schedulerService.isTaskEnabled(taskName);
      if (!enabled) {
        this.logger.warn(`[${taskName}] Task is disabled, skipping execution`);
        return;
      }

      await this.signalAnalyzeService.analyzePendingNews();
      await this.schedulerService.updateLastExecutedAt(taskName);

      this.logger.log(`[${taskName}] Task completed successfully`);
    } catch (error) {
      this.logger.error(
        `[${taskName}] Task failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * 早上K线更新定时任务
   * Cron: 0 0 8 * * * (每天08:00:00)
   */
  @Cron('0 0 8 * * *', {
    name: 'kline-update',
    timeZone: 'Asia/Shanghai',
  })
  async handleKlineUpdate(): Promise<void> {
    const taskName = 'kline-update';
    this.logger.log(`[${taskName}] Scheduled task triggered`);

    try {
      const enabled = await this.schedulerService.isTaskEnabled(taskName);
      if (!enabled) {
        this.logger.warn(`[${taskName}] Task is disabled, skipping execution`);
        return;
      }

      const stockCodes = await this.klinesService.getStockCodesWithSignals();
      this.logger.log(`[${taskName}] Found ${stockCodes.length} stocks with signals`);

      if (stockCodes.length === 0) {
        this.logger.warn(`[${taskName}] No stocks with signals found, skipping`);
        await this.schedulerService.updateLastExecutedAt(taskName);
        return;
      }

      for (const stockCode of stockCodes) {
        try {
          await this.queueService.sendToKlineFetch({
            stockCode,
            period: '1d',
          });
          this.logger.debug(`[${taskName}] Queued kline fetch for ${stockCode}`);
        } catch (error) {
          this.logger.error(
            `[${taskName}] Failed to queue kline fetch for ${stockCode}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      await this.schedulerService.updateLastExecutedAt(taskName);
      this.logger.log(`[${taskName}] Task completed successfully, queued ${stockCodes.length} stocks`);
    } catch (error) {
      this.logger.error(
        `[${taskName}] Task failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * 手动执行新闻抓取任务
   */
  async manualNewsCrawl(): Promise<void> {
    const taskName = 'news-crawl';
    this.logger.log(`[${taskName}] Manual execution triggered`);

    try {
      await this.newsService.crawlAndQueueNews(3);
      await this.schedulerService.updateLastExecutedAt(taskName);
      this.logger.log(`[${taskName}] Manual execution completed`);
    } catch (error) {
      this.logger.error(
        `[${taskName}] Manual execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * 手动执行新闻分析任务
   */
  async manualNewsAnalyze(): Promise<void> {
    const taskName = 'news-analyze';
    this.logger.log(`[${taskName}] Manual execution triggered`);

    try {
      await this.signalAnalyzeService.analyzePendingNews();
      await this.schedulerService.updateLastExecutedAt(taskName);
      this.logger.log(`[${taskName}] Manual execution completed`);
    } catch (error) {
      this.logger.error(
        `[${taskName}] Manual execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * 手动执行K线更新任务
   */
  async manualKlineUpdate(): Promise<void> {
    const taskName = 'kline-update';
    this.logger.log(`[${taskName}] Manual execution triggered`);

    try {
      const stockCodes = await this.klinesService.getStockCodesWithSignals();

      if (stockCodes.length === 0) {
        this.logger.warn(`[${taskName}] No stocks with signals found`);
        await this.schedulerService.updateLastExecutedAt(taskName);
        return;
      }

      for (const stockCode of stockCodes) {
        await this.queueService.sendToKlineFetch({
          stockCode,
          period: '1d',
        });
      }

      await this.schedulerService.updateLastExecutedAt(taskName);
      this.logger.log(`[${taskName}] Manual execution completed, queued ${stockCodes.length} stocks`);
    } catch (error) {
      this.logger.error(
        `[${taskName}] Manual execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
