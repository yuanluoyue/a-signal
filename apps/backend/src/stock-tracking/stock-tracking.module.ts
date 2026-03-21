import { Module } from '@nestjs/common';
import { StockTrackingService } from './stock-tracking.service.js';
import { StockTrackingController } from './stock-tracking.controller.js';
import { StockTrackFetchConsumer } from './stock-track-fetch.consumer.js';
import { DatabaseModule } from '../database/database.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { NewsModule } from '../news/news.module.js';
import { BacktestModule } from '../backtest/backtest.module.js';

@Module({
  imports: [DatabaseModule, QueueModule, NewsModule, BacktestModule],
  controllers: [StockTrackingController],
  providers: [StockTrackingService, StockTrackFetchConsumer],
  exports: [StockTrackingService],
})
export class StockTrackingModule {}
