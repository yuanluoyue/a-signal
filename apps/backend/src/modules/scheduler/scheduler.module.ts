import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule } from '../../core/db/db.module.js';
import { NewsModule } from '../news/news.module.js';
import { SignalsModule } from '../signals/signals.module.js';
import { KlinesModule } from '../klines/klines.module.js';
import { QueueModule } from '../../core/queue/queue.module.js';
import { SchedulerService } from './scheduler.service.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DbModule,
    NewsModule,
    SignalsModule,
    KlinesModule,
    QueueModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
