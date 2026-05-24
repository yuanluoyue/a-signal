export interface QueueMessage<T = unknown> {
  id: string;
  data: T;
  timestamp: number;
  retryCount?: number;
}

export interface QueueConsumerOptions {
  queueName: string;
  concurrency?: number;
  maxRetries?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
}

export interface SendMessageOptions {
  delay?: number;
  priority?: number;
}

export type QueueName = 'news-crawl' | 'kline-fetch' | 'news-vectorize' | 'stock-track-fetch' | 'event-analyze';
