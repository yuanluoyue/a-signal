import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../database/database.module.js';
import { NewsModule } from '../news/news.module.js';
import { SignalsModule } from '../signals/signals.module.js';
import { KlinesModule } from '../klines/klines.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { SchedulerService } from './scheduler.service.js';
import { SchedulerTasksService } from './scheduler-tasks.service.js';
import { SchedulerController } from './scheduler.controller.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    NewsModule,
    SignalsModule,
    KlinesModule,
    QueueModule,
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService, SchedulerTasksService],
  exports: [SchedulerService, SchedulerTasksService],
})
export class SchedulerModule {}
