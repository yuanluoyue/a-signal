import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueConsumer } from '../queue/queue.consumer.js';
import { QueueMessage } from '../queue/queue.types.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';
import { NewsService, type CrawlDetailTask, type NewsDetail } from './news.service.js';

@Injectable()
export class NewsCrawlConsumer extends QueueConsumer {
  protected readonly logger = new Logger(NewsCrawlConsumer.name);

  constructor(
    protected readonly configService: ConfigService,
    private readonly newsService: NewsService,
  ) {
    super(configService, {
      queueName: QUEUE_NAMES.NEWS_CRAWL,
      prefetch: 1, // 串行消费，每次只处理一个消息
      autoAck: false, // 手动确认消息
    });
  }

  /**
   * 处理队列消息
   * @param message 队列消息
   */
  protected async processMessage<T>(message: QueueMessage<T>): Promise<void> {
    const task = message.data as CrawlDetailTask;

    this.logger.log(`Processing crawl task: ${task.url}`);

    try {
      // 检查新闻是否已存在
      const uniqueKey = this.newsService.generateUniqueKey(task.url);
      const exists = await this.newsService.isNewsExists(uniqueKey);

      if (exists) {
        this.logger.debug(`News already exists, skipping: ${task.url}`);
        return;
      }

      // 抓取详情页
      const newsDetail = await this.newsService.crawlDetailPage(task.url);

      if (!newsDetail) {
        this.logger.warn(`Failed to crawl news detail: ${task.url}`);
        return;
      }

      // 保存到数据库
      await this.newsService.saveNews(newsDetail);

      this.logger.log(`Successfully processed and saved news: ${newsDetail.title}`);

      // 消费者基类会自动确认消息
    } catch (error) {
      this.logger.error(`Error processing crawl task for ${task.url}:`, error);
      // 抛出错误让基类处理重试逻辑
      throw error;
    }
  }
}
