import { Module } from '@nestjs/common';
import { DbModule } from '../../core/db/db.module.js';
import { TradingMemoryService } from './trading-memory.service.js';

@Module({
  imports: [DbModule],
  providers: [TradingMemoryService],
  exports: [TradingMemoryService],
})
export class TradingMemoryModule {}
