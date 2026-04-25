import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DbModule } from '../../core/db/db.module.js';
import { NotificationsService } from './notifications.service.js';
import { WebhooksService } from './webhooks.service.js';
import { BlacklistModule } from '../blacklist/blacklist.module.js';
import { StockModule } from '../stock/stock.module.js';

@Module({
  imports: [HttpModule, DbModule, BlacklistModule, StockModule],
  providers: [NotificationsService, WebhooksService],
  exports: [NotificationsService, WebhooksService],
})
export class NotificationsModule {}
