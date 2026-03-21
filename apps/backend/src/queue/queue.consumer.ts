import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { QueueMessage, QueueConsumerOptions } from './queue.types.js';

export abstract class QueueConsumer implements OnModuleInit, OnModuleDestroy {
  protected readonly logger: Logger;
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private isConsuming = false;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly options: QueueConsumerOptions,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
    await this.startConsuming();
  }

  async onModuleDestroy(): Promise<void> {
    await this.stopConsuming();
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

      const prefetch = this.options.prefetch ?? 1;
      await this.channel.prefetch(prefetch, false);

      this.connection.on('error', (err: Error) => {
        this.logger.error('RabbitMQ connection error:', err);
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
      });

      this.logger.log(`Connected to RabbitMQ for queue: ${this.options.queueName}`);
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
      this.logger.log(`Disconnected from RabbitMQ for queue: ${this.options.queueName}`);
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ:', error);
    }
  }

  private async startConsuming(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    if (this.isConsuming) {
      return;
    }

    const { queueName } = this.options;

    await this.channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': `${queueName}-dlq`,
      },
    });

    const { consumerTag } = await this.channel.consume(
      queueName,
      async (msg: amqp.Message | null) => {
        if (!msg) {
          this.logger.warn('Received null message');
          return;
        }

        try {
          const content = msg.content.toString();
          const message: QueueMessage = JSON.parse(content);

          this.logger.log(`[QueueConsumer] Processing message from ${queueName}: ${message.id}`);

          await this.processMessage(message);

          if (!this.options.autoAck) {
            this.channel!.ack(msg);
          }

          this.logger.log(`[QueueConsumer] Successfully processed message: ${message.id}`);
        } catch (error) {
          this.logger.error(`Error processing message from ${queueName}:`, error);

          if (!this.options.autoAck) {
            const retryCount = this.getRetryCount(msg);
            const maxRetries = this.options.maxRetries ?? 3;
            
            if (retryCount < maxRetries) {
              // 增加重试计数并重新入队
              const newHeaders = { ...msg.properties.headers };
              newHeaders['x-retry-count'] = retryCount + 1;
              
              // 重新发布消息到队列末尾，带上更新后的重试计数
              this.channel!.publish('', queueName, msg.content, {
                ...msg.properties,
                headers: newHeaders,
              });
              
              // 确认原消息
              this.channel!.ack(msg);
              
              this.logger.warn(`Message requeued with retry count ${retryCount + 1}/${maxRetries}`);
            } else {
              // 超过最大重试次数，发送到死信队列
              this.channel!.nack(msg, false, false);
              this.logger.warn(`Message moved to DLQ after ${retryCount} retries`);
            }
          }
        }
      },
      {
        noAck: this.options.autoAck ?? false,
      },
    );

    this.isConsuming = true;
    this.logger.log(`Started consuming from queue: ${queueName} (consumerTag: ${consumerTag})`);
  }

  private async stopConsuming(): Promise<void> {
    if (!this.channel || !this.isConsuming) {
      return;
    }

    try {
      await this.channel.cancel(this.options.queueName);
      this.isConsuming = false;
      this.logger.log(`Stopped consuming from queue: ${this.options.queueName}`);
    } catch (error) {
      this.logger.error('Error stopping consumer:', error);
    }
  }

  private getRetryCount(msg: amqp.Message): number {
    const headers = msg.properties.headers || {};
    return (headers['x-retry-count'] as number) || 0;
  }

  protected abstract processMessage<T>(message: QueueMessage<T>): Promise<void>;

  protected async ackMessage(msg: amqp.Message): Promise<void> {
    if (this.channel && !this.options.autoAck) {
      this.channel.ack(msg);
    }
  }

  protected async nackMessage(msg: amqp.Message, requeue = false): Promise<void> {
    if (this.channel && !this.options.autoAck) {
      this.channel.nack(msg, false, requeue);
    }
  }

  isConnected(): boolean {
    return this.connection !== null && this.channel !== null && this.isConsuming;
  }

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
