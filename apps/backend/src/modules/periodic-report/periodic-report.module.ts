import { Module, forwardRef } from '@nestjs/common';
import { DbModule } from '../../core/db/db.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PeriodicReportService } from './periodic-report.service.js';

@Module({
  imports: [DbModule, forwardRef(() => NotificationsModule)],
  providers: [PeriodicReportService],
  exports: [PeriodicReportService],
})
export class PeriodicReportModule {}
