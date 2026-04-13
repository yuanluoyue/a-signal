import { Module } from '@nestjs/common';
import { StocksService } from './stocks.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { KlinesModule } from '../klines/klines.module.js';
import { BlacklistModule } from '../blacklist/blacklist.module.js';
import { QueueModule } from '../../core/queue/queue.module.js';

@Module({
  imports: [DbModule, KlinesModule, BlacklistModule, QueueModule],
  providers: [StocksService],
  exports: [StocksService],
})
export class StocksModule {}
