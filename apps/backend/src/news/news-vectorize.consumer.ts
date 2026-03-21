import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NewsService } from './news.service.js';
import { VolcengineEmbeddingService } from '../volcengine/volcengine-embedding.service.js';
import { VectorService } from '../vector/vector.service.js';
import { QueueConsumer } from '../queue/queue.consumer.js';
import { QueueMessage } from '../queue/queue.types.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';

export interface NewsVectorizeTask {
  newsId: string;
}

@Injectable()
export class NewsVectorizeConsumer extends QueueConsumer {
  constructor(
    protected readonly configService: ConfigService,
    private readonly newsService: NewsService,
    private readonly embeddingService: VolcengineEmbeddingService,
    private readonly vectorService: VectorService,
  ) {
    super(configService, {
      queueName: QUEUE_NAMES.NEWS_VECTORIZE,
      prefetch: 1,
      autoAck: false,
      maxRetries: 3,
    });
  }

  async processMessage<T>(message: QueueMessage<T>): Promise<void> {
    const task = message.data as NewsVectorizeTask;
    this.logger.log(`Processing vectorize task for news ${task.newsId}`);

    let embedding: number[] | null = null;

    // 第一步：获取新闻详情
    const news = await this.newsService.getNewsById(task.newsId);
    if (!news) {
      this.logger.error(`News ${task.newsId} not found`);
      return; // 新闻不存在，直接返回不重试
    }

    try {
      // 第二步：调用向量化服务（API 调用，需要重试）
      const textToVectorize = `${news.title}\n\n${news.content}`;
      this.logger.log(`Generating embedding for news ${task.newsId}`);
      embedding = await this.embeddingService.getTextEmbedding(textToVectorize);
    } catch (error) {
      this.logger.error(
        `Failed to generate embedding for news ${task.newsId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // API 调用失败，更新状态并抛出错误触发重试
      await this.newsService.updateVectorizeStatus(task.newsId, 'failed');
      throw error;
    }

    // 第三步：存储到 ChromaDB（存储操作，不重试）
    try {
      await this.vectorService.storeNewsEmbedding({
        id: news.id,
        embedding,
        metadata: {
          newsId: news.id,
          title: news.title,
          content: news.content.substring(0, 500),
          source: news.source,
          publishTime: news.publishTime.toISOString(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to store embedding for news ${task.newsId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // 存储失败，更新状态但不重试（避免重复调用 API）
      await this.newsService.updateVectorizeStatus(task.newsId, 'failed');
      // 不抛出错误，避免触发重试
      return;
    }

    // 第四步：更新状态为已完成
    try {
      await this.newsService.updateVectorizeStatus(task.newsId, 'vectorized');
      this.logger.log(`Successfully vectorized news ${task.newsId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update status for news ${task.newsId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // 状态更新失败，但向量已存储成功，不重试
    }
  }
}
