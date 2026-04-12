import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueConsumer } from '../core/queue/queue.consumer.js';
import { QueueMessage } from '../core/queue/queue.types.js';
import { QUEUE_NAMES } from '../core/queue/queue.constants.js';
import { KlinesService, KlineFetchMessage } from '../modules/klines/klines.service.js';

@Injectable()
export class KlineFetchConsumer extends QueueConsumer {
  protected readonly logger = new Logger(KlineFetchConsumer.name);

  constructor(
    protected readonly configService: ConfigService,
    private readonly klinesService: KlinesService,
  ) {
    super(configService, {
      queueName: QUEUE_NAMES.KLINE_FETCH,
      prefetch: 1,
      autoAck: false,
    });
  }

  protected async processMessage<T>(message: QueueMessage<T>): Promise<void> {
    const data = message.data as KlineFetchMessage;

    if (!data || !data.stockCode || !data.period) {
      this.logger.error('Invalid kline fetch message format:', message);
      return;
    }

    const { stockCode, period } = data;

    this.logger.log(`Processing kline fetch task: ${stockCode} (${period})`);

    try {
      await this.klinesService.fetchKlines(stockCode, period);
      this.logger.log(`Successfully fetched klines for ${stockCode} (${period})`);
    } catch (error) {
      this.logger.error(`Failed to fetch klines for ${stockCode} (${period}):`, error);
      throw error;
    }
  }
}
