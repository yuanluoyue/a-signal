import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { DbModule } from '../../core/db/db.module.js';

@Module({
  imports: [DbModule],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
