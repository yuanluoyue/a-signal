import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { RedisService } from '../redis/redis.service.js';
import { QueueMessage, SendMessageOptions, QueueName } from './queue.types.js';
import { QUEUE_NAMES, QUEUE_DELAYS } from './queue.constants.js';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue>();
  private readonly queueEvents = new Map<string, QueueEvents>();
  private boardAdapter: ExpressAdapter | null = null;

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit(): Promise<void> {
    const connection = this.redisService.getClient();

    for (const queueName of Object.values(QUEUE_NAMES)) {
      const queue = new Queue(queueName, { connection });
      this.queues.set(queueName, queue);

      const queueEvents = new QueueEvents(queueName, { connection });
      this.queueEvents.set(queueName, queueEvents);

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        this.logger.warn(`Job ${jobId} in queue ${queueName} failed: ${failedReason}`);
      });

      this.logger.log(`Setup queue: ${queueName}`);
    }

    this.setupBullBoard();

    this.logger.log('All queues initialized');
  }

  private setupBullBoard(): void {
    const adapters = Array.from(this.queues.values()).map(
      (queue) => new BullMQAdapter(queue),
    );

    this.boardAdapter = new ExpressAdapter();
    this.boardAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: adapters,
      serverAdapter: this.boardAdapter,
    });

    this.logger.log('Bull Board initialized at /admin/queues');
  }

  async onModuleDestroy(): Promise<void> {
    for (const [name, queue] of this.queues) {
      try {
        await queue.close();
        this.logger.log(`Closed queue: ${name}`);
      } catch (error) {
        this.logger.error(`Error closing queue ${name}:`, error);
      }
    }

    for (const [name, events] of this.queueEvents) {
      try {
        await events.close();
        this.logger.log(`Closed queue events: ${name}`);
      } catch (error) {
        this.logger.error(`Error closing queue events ${name}:`, error);
      }
    }

    this.queues.clear();
    this.queueEvents.clear();
  }

  async sendMessage<T>(
    queueName: QueueName,
    data: T,
    options: SendMessageOptions = {},
  ): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not initialized: ${queueName}`);
    }

    const message: QueueMessage<T> = {
      id: crypto.randomUUID(),
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const defaultDelay = QUEUE_DELAYS[queueName] || 0;
    const delay = options.delay ?? defaultDelay;

    await queue.add(queueName, message, {
      delay: delay > 0 ? delay : undefined,
      priority: options.priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    this.logger.log(`[QueueService] Message sent to ${queueName} (delay: ${delay}ms), messageId: ${message.id}`);
  }

  async sendToNewsCrawl<T>(data: T, delay?: number): Promise<void> {
    await this.sendMessage(QUEUE_NAMES.NEWS_CRAWL, data, { delay });
  }

  async sendToEventAnalyze<T>(data: T): Promise<void> {
    await this.sendMessage(QUEUE_NAMES.EVENT_ANALYZE, data);
  }

  async sendToKlineFetch<T>(data: T, delay?: number): Promise<void> {
    await this.sendMessage(QUEUE_NAMES.KLINE_FETCH, data, { delay });
  }

  getQueue(queueName: string): Queue | undefined {
    return this.queues.get(queueName);
  }

  getBoardAdapter(): ExpressAdapter | null {
    return this.boardAdapter;
  }
}
