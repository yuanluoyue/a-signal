import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { VolcengineModule } from '../volcengine/volcengine.module.js';
import { KlinesModule } from '../klines/klines.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SignalsService } from './signals.service.js';
import { SignalAnalyzeService } from './signal-analyze.service.js';
import { SignalAnalyzeConsumer } from './signal-analyze.consumer.js';
import { SignalsController } from './signals.controller.js';

@Module({
  imports: [ConfigModule, DatabaseModule, QueueModule, VolcengineModule, KlinesModule, HttpModule, NotificationsModule],
  controllers: [SignalsController],
  providers: [SignalsService, SignalAnalyzeService, SignalAnalyzeConsumer],
  exports: [SignalsService, SignalAnalyzeService],
})
export class SignalsModule {}
