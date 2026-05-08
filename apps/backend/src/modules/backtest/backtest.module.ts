import { Module } from '@nestjs/common';
import { BacktestService } from './backtest.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { KlinesModule } from '../klines/klines.module.js';
import { StrategyModule } from '../strategy/strategy.module.js';

@Module({
  imports: [DbModule, KlinesModule, StrategyModule],
  providers: [BacktestService],
  exports: [BacktestService],
})
export class BacktestModule {}
