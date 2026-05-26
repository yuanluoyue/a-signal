import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, eq, gte, lte } from 'drizzle-orm';
import { SchedulerService } from '../modules/scheduler/scheduler.service.js';
import { NewsService } from '../modules/news/news.service.js';
import { KlinesService } from '../modules/klines/klines.service.js';
import { SimulationService } from '../modules/simulation/simulation.service.js';
import { QueueService } from '../core/queue/queue.service.js';
import { DbService } from '../core/db/db.service.js';
import { news } from '../core/db/schema.js';

@Injectable()
export class SchedulerTasksService {
  private readonly logger = new Logger(SchedulerTasksService.name);

  constructor(
    private readonly schedulerService: SchedulerService,
    private readonly newsService: NewsService,
    private readonly klinesService: KlinesService,
    private readonly simulationService: SimulationService,
    private readonly queueService: QueueService,
    private readonly dbService: DbService,
  ) {}

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

  @Cron('0 0 20 * * *', {
    name: 'event-analyze',
    timeZone: 'Asia/Shanghai',
  })
  async handleEventAnalyze(): Promise<void> {
    const taskName = 'event-analyze';
    this.logger.log(`[${taskName}] Scheduled task triggered`);

    try {
      const enabled = await this.schedulerService.isTaskEnabled(taskName);
      if (!enabled) {
        this.logger.warn(`[${taskName}] Task is disabled, skipping execution`);
        return;
      }

      const pendingNews = await this.fetchPendingNewsFromLastTwoDays();

      if (pendingNews.length === 0) {
        this.logger.log(`[${taskName}] No pending news found for analysis`);
        await this.schedulerService.updateLastExecutedAt(taskName);
        return;
      }

      this.logger.log(`[${taskName}] Found ${pendingNews.length} pending news items to analyze`);

      for (const newsItem of pendingNews) {
        try {
          await this.queueService.sendToEventAnalyze({
            newsId: newsItem.id,
          });
          this.logger.debug(`[${taskName}] Queued news ${newsItem.id} for analysis`);
        } catch (error) {
          this.logger.error(
            `[${taskName}] Failed to queue news ${newsItem.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      await this.schedulerService.updateLastExecutedAt(taskName);
      this.logger.log(`[${taskName}] Task completed successfully, queued ${pendingNews.length} news items`);
    } catch (error) {
      this.logger.error(
        `[${taskName}] Task failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

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

  @Cron('0 0 */4 * * *', {
    name: 'simulation-refresh',
    timeZone: 'Asia/Shanghai',
  })
  async handleSimulationRefresh(): Promise<void> {
    const taskName = 'simulation-refresh';
    this.logger.log(`[${taskName}] Scheduled task triggered`);

    try {
      const enabled = await this.schedulerService.isTaskEnabled(taskName);
      if (!enabled) {
        this.logger.warn(`[${taskName}] Task is disabled, skipping execution`);
        return;
      }

      await this.executeSimulationRefresh();
      await this.schedulerService.updateLastExecutedAt(taskName);

      this.logger.log(`[${taskName}] Task completed successfully`);
    } catch (error) {
      this.logger.error(
        `[${taskName}] Task failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

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

  async manualEventAnalyze(): Promise<void> {
    const taskName = 'event-analyze';
    this.logger.log(`[${taskName}] Manual execution triggered`);

    try {
      const pendingNews = await this.fetchPendingNewsFromLastTwoDays();

      if (pendingNews.length === 0) {
        this.logger.log(`[${taskName}] No pending news found for analysis`);
        await this.schedulerService.updateLastExecutedAt(taskName);
        return;
      }

      this.logger.log(`[${taskName}] Found ${pendingNews.length} pending news items to analyze`);

      for (const newsItem of pendingNews) {
        await this.queueService.sendToEventAnalyze({
          newsId: newsItem.id,
        });
      }

      await this.schedulerService.updateLastExecutedAt(taskName);
      this.logger.log(`[${taskName}] Manual execution completed, queued ${pendingNews.length} news items`);
    } catch (error) {
      this.logger.error(
        `[${taskName}] Manual execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async manualSimulationRefresh(): Promise<void> {
    const taskName = 'simulation-refresh';
    this.logger.log(`[${taskName}] Manual execution triggered`);

    try {
      await this.executeSimulationRefresh();
      await this.schedulerService.updateLastExecutedAt(taskName);
      this.logger.log(`[${taskName}] Manual execution completed`);
    } catch (error) {
      this.logger.error(
        `[${taskName}] Manual execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async executeSimulationRefresh(): Promise<void> {
    const accounts = await this.simulationService.getAllAccounts();

    if (accounts.length === 0) {
      this.logger.log('[simulation-refresh] No simulation accounts found, skipping');
      return;
    }

    this.logger.log(`[simulation-refresh] Refreshing ${accounts.length} accounts`);

    let successCount = 0;
    let failCount = 0;

    for (const account of accounts) {
      try {
        await this.simulationService.refreshPositionPrices(account.id);
        await this.simulationService.checkTakeProfitStopLoss(account.id);
        successCount++;
      } catch (error) {
        failCount++;
        this.logger.error(
          `[simulation-refresh] Failed to refresh account ${account.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(
      `[simulation-refresh] Refresh completed: ${successCount} succeeded, ${failCount} failed`,
    );
  }

  private async fetchPendingNewsFromLastTwoDays(): Promise<{ id: string }[]> {
    try {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const results = await this.dbService.db
        .select({ id: news.id })
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
}
