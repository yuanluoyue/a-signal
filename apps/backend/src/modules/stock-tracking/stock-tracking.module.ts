import { Module } from '@nestjs/common';
import { StockTrackingService } from './stock-tracking.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { QueueModule } from '../../core/queue/queue.module.js';
import { NewsModule } from '../news/news.module.js';
import { BacktestModule } from '../backtest/backtest.module.js';

@Module({
  imports: [DbModule, QueueModule, NewsModule, BacktestModule],
  providers: [StockTrackingService],
  exports: [StockTrackingService],
})
export class StockTrackingModule {}
