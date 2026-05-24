import { Module } from '@nestjs/common';
import { TradingMemoryLogService } from './trading-memory-log.service.js';
import { TradingMemoryService } from './trading-memory.service.js';

@Module({
  providers: [TradingMemoryService, TradingMemoryLogService],
  exports: [TradingMemoryService, TradingMemoryLogService],
})
export class TradingMemoryModule {}
