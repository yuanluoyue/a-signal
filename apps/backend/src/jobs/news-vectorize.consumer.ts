import { Injectable } from '@nestjs/common';
import { NewsService } from '../modules/news/news.service.js';
import { VectorService } from '../core/vector/vector.service.js';
import { QueueConsumer } from '../core/queue/queue.consumer.js';
import { QueueMessage } from '../core/queue/queue.types.js';
import { QUEUE_NAMES } from '../core/queue/queue.constants.js';
import { RedisService } from '../core/redis/redis.service.js';

export interface NewsVectorizeTask {
  newsId: string;
}

const EMBEDDING_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

@Injectable()
export class NewsVectorizeConsumer extends QueueConsumer {
  constructor(
    protected readonly redisService: RedisService,
    private readonly newsService: NewsService,
    private readonly vectorService: VectorService,
  ) {
    super(redisService, {
      queueName: QUEUE_NAMES.NEWS_VECTORIZE,
      concurrency: 1,
      maxRetries: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  async processMessage<T>(message: QueueMessage<T>): Promise<void> {
    const task = message.data as NewsVectorizeTask;
    this.logger.log(`Processing vectorize task for news ${task.newsId}`);

    let embedding: number[] | null = null;

    const news = await this.newsService.getNewsById(task.newsId);
    if (!news) {
      this.logger.error(`News ${task.newsId} not found`);
      return;
    }

    try {
      const textToVectorize = `${news.title}\n\n${news.content}`;
      this.logger.log(`Generating embedding for news ${task.newsId}`);
      embedding = await this.vectorService.generateEmbedding(textToVectorize);
    } catch (error) {
      this.logger.error(
        `Failed to generate embedding for news ${task.newsId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.newsService.updateVectorizeStatus(task.newsId, 'failed');
      throw error;
    }

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
      await this.newsService.updateVectorizeStatus(task.newsId, 'failed');
      return;
    }

    try {
      await this.newsService.updateEmbeddingModel(task.newsId, EMBEDDING_MODEL);
      this.logger.log(`Updated embedding model for news ${task.newsId} to ${EMBEDDING_MODEL}`);
    } catch (error) {
      this.logger.error(
        `Failed to update embedding model for news ${task.newsId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      await this.newsService.updateVectorizeStatus(task.newsId, 'vectorized');
      this.logger.log(`Successfully vectorized news ${task.newsId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update status for news ${task.newsId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
