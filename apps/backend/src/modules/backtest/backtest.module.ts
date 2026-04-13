import { Module } from '@nestjs/common';
import { BacktestService } from './backtest.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { KlinesModule } from '../klines/klines.module.js';

@Module({
  imports: [DbModule, KlinesModule],
  providers: [BacktestService],
  exports: [BacktestService],
})
export class BacktestModule {}
