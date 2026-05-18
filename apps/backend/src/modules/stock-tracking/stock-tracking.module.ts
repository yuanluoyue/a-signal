import { Module, forwardRef } from '@nestjs/common';
import { StockTrackingService } from './stock-tracking.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { QueueModule } from '../../core/queue/queue.module.js';
import { NewsModule } from '../news/news.module.js';
import { BacktestModule } from '../backtest/backtest.module.js';
import { StockModule } from '../stock/stock.module.js';

@Module({
  imports: [DbModule, QueueModule, forwardRef(() => NewsModule), BacktestModule, StockModule],
  providers: [StockTrackingService],
  exports: [StockTrackingService],
})
export class StockTrackingModule {}
