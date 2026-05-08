import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DbModule } from '../../core/db/db.module.js';
import { QueueModule } from '../../core/queue/queue.module.js';
import { KlinesModule } from '../klines/klines.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { StockModule } from '../stock/stock.module.js';
import { SignalsService } from './signals.service.js';

@Module({
  imports: [ConfigModule, DbModule, QueueModule, KlinesModule, HttpModule, NotificationsModule, StockModule],
  providers: [SignalsService],
  exports: [SignalsService],
})
export class SignalsModule {}
