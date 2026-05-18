import { Module, forwardRef } from '@nestjs/common';
import { StockService } from './stock.service.js';
import { StocksService } from './stocks.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { KlinesModule } from '../klines/klines.module.js';
import { BlacklistModule } from '../blacklist/blacklist.module.js';
import { QueueModule } from '../../core/queue/queue.module.js';

@Module({
  imports: [DbModule, KlinesModule, forwardRef(() => BlacklistModule), QueueModule],
  providers: [StockService, StocksService],
  exports: [StockService, StocksService],
})
export class StockModule {}
