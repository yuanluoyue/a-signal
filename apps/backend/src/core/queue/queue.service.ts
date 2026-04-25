import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { randomUUID } from 'crypto';
import { QueueMessage, SendMessageOptions, QueueName } from './queue.types.js';
import { QUEUE_NAMES, QUEUE_DELAYS, DLQ_SUFFIX, DELAY_QUEUE_SUFFIX } from './queue.constants.js';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
    await this.setupQueues();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const host = this.configService.get<string>('RABBITMQ_HOST', 'localhost');
      const port = this.configService.get<number>('RABBITMQ_PORT', 5672);
      const username = this.configService.get<string>('RABBITMQ_USER', 'admin');
      const password = this.configService.get<string>('RABBITMQ_PASS', 'admin');

      const url = `amqp://${username}:${password}@${host}:${port}`;

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      this.connection.on('error', (err: Error) => {
        this.logger.error('RabbitMQ connection error:', err);
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
      });

      this.logger.log('Successfully connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ:', error);
    }
  }

  private async setupQueues(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    for (const queueName of Object.values(QUEUE_NAMES)) {
      const mainQueue = queueName;
      const dlqName = `${queueName}${DLQ_SUFFIX}`;
      const delayQueue = `${queueName}${DELAY_QUEUE_SUFFIX}`;

      await this.channel.assertQueue(mainQueue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': dlqName,
        },
      });

      await this.channel.assertQueue(dlqName, {
        durable: true,
      });

      const defaultDelay = QUEUE_DELAYS[queueName] || 0;
      if (defaultDelay > 0) {
        await this.channel.assertQueue(delayQueue, {
          durable: true,
          arguments: {
            'x-message-ttl': defaultDelay,
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': mainQueue,
          },
        });
      }

      this.logger.log(`Setup queue: ${mainQueue} with DLQ: ${dlqName}`);
    }
  }

  async sendMessage<T>(
    queueName: QueueName,
    data: T,
    options: SendMessageOptions = {},
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    const message: QueueMessage<T> = {
      id: randomUUID(),
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const defaultDelay = QUEUE_DELAYS[queueName] || 0;
    const delay = options.delay ?? defaultDelay;

    const buffer = Buffer.from(JSON.stringify(message));

    const publishOptions: Record<string, unknown> = {
      persistent: options.persistent ?? true,
      priority: options.priority,
    };

    if (delay > 0) {
      const delayQueue = `${queueName}${DELAY_QUEUE_SUFFIX}`;
      const success = this.channel.sendToQueue(delayQueue, buffer, {
        ...publishOptions,
        expiration: delay.toString(),
      });
      if (!success) {
        throw new Error(`Failed to send message to delay queue: ${delayQueue}`);
      }
    } else {
      const success = this.channel.sendToQueue(queueName, buffer, publishOptions);
      if (!success) {
        throw new Error(`Failed to send message to queue: ${queueName}`);
      }
    }

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

  getChannel(): amqp.Channel {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }
    return this.channel;
  }

  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}
