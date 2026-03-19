export interface QueueMessage<T = unknown> {
  id: string;
  data: T;
  timestamp: number;
  retryCount?: number;
}

export interface QueueConsumerOptions {
  queueName: string;
  prefetch?: number;
  autoAck?: boolean;
}

export interface SendMessageOptions {
  delay?: number;
  priority?: number;
  persistent?: boolean;
}

export type QueueName = 'news-crawl' | 'news-analyze' | 'kline-fetch';
