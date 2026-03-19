import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KlinesService } from './klines.service.js';
import { KlineFetchConsumer } from './kline-fetch.consumer.js';
import { DatabaseModule } from '../database/database.module.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [HttpModule, DatabaseModule, QueueModule],
  providers: [KlinesService, KlineFetchConsumer],
  exports: [KlinesService],
})
export class KlinesModule {}
