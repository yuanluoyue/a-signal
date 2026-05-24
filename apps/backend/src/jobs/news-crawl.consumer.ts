import { Injectable, Logger } from '@nestjs/common';
import { QueueConsumer } from '../core/queue/queue.consumer.js';
import { QueueMessage } from '../core/queue/queue.types.js';
import { QUEUE_NAMES } from '../core/queue/queue.constants.js';
import { RedisService } from '../core/redis/redis.service.js';
import { NewsService, type CrawlDetailTask, type NewsDetail } from '../modules/news/news.service.js';

@Injectable()
export class NewsCrawlConsumer extends QueueConsumer {
  protected readonly logger = new Logger(NewsCrawlConsumer.name);

  constructor(
    protected readonly redisService: RedisService,
    private readonly newsService: NewsService,
  ) {
    super(redisService, {
      queueName: QUEUE_NAMES.NEWS_CRAWL,
      concurrency: 1,
      maxRetries: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  protected async processMessage<T>(message: QueueMessage<T>): Promise<void> {
    const task = message.data as CrawlDetailTask;

    this.logger.log(`Processing crawl task: ${task.url}`);

    try {
      const uniqueKey = this.newsService.generateUniqueKey(task.url);
      const exists = await this.newsService.isNewsExists(uniqueKey);

      if (exists) {
        this.logger.debug(`News already exists, skipping: ${task.url}`);
        return;
      }

      const newsDetail = await this.newsService.crawlDetailPage(task.url);

      if (!newsDetail) {
        this.logger.warn(`Failed to crawl news detail: ${task.url}`);
        return;
      }

      await this.newsService.saveNews(newsDetail);

      this.logger.log(`Successfully processed and saved news: ${newsDetail.title}`);
    } catch (error) {
      this.logger.error(`Error processing crawl task for ${task.url}:`, error);
      throw error;
    }
  }
}
