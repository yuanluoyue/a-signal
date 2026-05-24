import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { RedisService } from '../redis/redis.service.js';
import { QueueMessage, QueueConsumerOptions } from './queue.types.js';
import { DEFAULT_CONCURRENCY, DEFAULT_MAX_RETRIES, DEFAULT_BACKOFF_DELAY } from './queue.constants.js';

export abstract class QueueConsumer implements OnModuleInit, OnModuleDestroy {
  protected readonly logger: Logger;
  private worker: Worker | null = null;

  constructor(
    protected readonly redisService: RedisService,
    protected readonly options: QueueConsumerOptions,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async onModuleInit(): Promise<void> {
    await this.startConsuming();
  }

  async onModuleDestroy(): Promise<void> {
    await this.stopConsuming();
  }

  private async startConsuming(): Promise<void> {
    const { queueName, concurrency, maxRetries, backoff } = this.options;
    const connection = this.redisService.getClient();

    this.worker = new Worker(
      queueName,
      async (job: Job) => {
        const message = job.data as QueueMessage;
        this.logger.log(`[QueueConsumer] Processing message from ${queueName}: ${message.id}`);
        await this.processMessage(message);
        this.logger.log(`[QueueConsumer] Successfully processed message: ${message.id}`);
      },
      {
        connection,
        concurrency: concurrency ?? DEFAULT_CONCURRENCY,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `[QueueConsumer] Job ${job?.id} failed in queue ${queueName}: ${err.message}`,
      );
    });

    this.worker.on('error', (err) => {
      this.logger.error(`[QueueConsumer] Worker error for queue ${queueName}:`, err);
    });

    this.logger.log(
      `Started consuming from queue: ${queueName} (concurrency: ${concurrency ?? DEFAULT_CONCURRENCY}, maxRetries: ${maxRetries ?? DEFAULT_MAX_RETRIES})`,
    );
  }

  private async stopConsuming(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.close();
        this.logger.log(`Stopped consuming from queue: ${this.options.queueName}`);
      } catch (error) {
        this.logger.error('Error stopping consumer:', error);
      }
      this.worker = null;
    }
  }

  protected abstract processMessage<T>(message: QueueMessage<T>): Promise<void>;

  getQueueName(): string {
    return this.options.queueName;
  }
}

@Injectable()
export class QueueConsumerRegistry {
  private readonly logger = new Logger(QueueConsumerRegistry.name);
  private readonly consumers = new Map<string, QueueConsumer>();

  register(consumer: QueueConsumer): void {
    const queueName = consumer.getQueueName();
    if (this.consumers.has(queueName)) {
      this.logger.warn(`Consumer for queue ${queueName} already registered`);
      return;
    }
    this.consumers.set(queueName, consumer);
    this.logger.log(`Registered consumer for queue: ${queueName}`);
  }

  unregister(queueName: string): void {
    this.consumers.delete(queueName);
    this.logger.log(`Unregistered consumer for queue: ${queueName}`);
  }

  getConsumer(queueName: string): QueueConsumer | undefined {
    return this.consumers.get(queueName);
  }

  getAllConsumers(): QueueConsumer[] {
    return Array.from(this.consumers.values());
  }
}
