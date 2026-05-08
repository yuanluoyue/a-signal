import { Module } from '@nestjs/common';
import { StrategyService } from './strategy.service.js';
import { DbModule } from '../../core/db/db.module.js';

@Module({
  imports: [DbModule],
  providers: [StrategyService],
  exports: [StrategyService],
})
export class StrategyModule {}
