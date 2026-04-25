import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { StockModule } from '../stock/stock.module.js';

@Module({
  imports: [DbModule, StockModule],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
