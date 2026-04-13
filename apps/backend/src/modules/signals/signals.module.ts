import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DbModule } from '../../core/db/db.module.js';
import { QueueModule } from '../../core/queue/queue.module.js';
import { VolcengineModule } from '../../core/volcengine/volcengine.module.js';
import { KlinesModule } from '../klines/klines.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SignalsService } from './signals.service.js';
import { SignalAnalyzeService } from './signal-analyze.service.js';

@Module({
  imports: [ConfigModule, DbModule, QueueModule, VolcengineModule, KlinesModule, HttpModule, NotificationsModule],
  providers: [SignalsService, SignalAnalyzeService],
  exports: [SignalsService, SignalAnalyzeService],
})
export class SignalsModule {}
