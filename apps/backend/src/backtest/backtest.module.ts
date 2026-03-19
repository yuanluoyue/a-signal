import { Module } from '@nestjs/common';
import { BacktestController } from './backtest.controller.js';
import { BacktestService } from './backtest.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { KlinesModule } from '../klines/klines.module.js';

@Module({
  imports: [DatabaseModule, KlinesModule],
  controllers: [BacktestController],
  providers: [BacktestService],
  exports: [BacktestService],
})
export class BacktestModule {}
