import { Module } from '@nestjs/common';
import { StocksService } from './stocks.service.js';
import { StocksController } from './stocks.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { KlinesModule } from '../klines/klines.module.js';
import { BlacklistModule } from '../blacklist/blacklist.module.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [DatabaseModule, KlinesModule, BlacklistModule, QueueModule],
  controllers: [StocksController],
  providers: [StocksService],
  exports: [StocksService],
})
export class StocksModule {}
