import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module.js';
import { NotificationsService } from './notifications.service.js';
import { WebhooksService } from './webhooks.service.js';
import { WebhooksController } from './webhooks.controller.js';
import { BlacklistModule } from '../blacklist/blacklist.module.js';

@Module({
  imports: [HttpModule, DatabaseModule, BlacklistModule],
  controllers: [WebhooksController],
  providers: [NotificationsService, WebhooksService],
  exports: [NotificationsService, WebhooksService],
})
export class NotificationsModule {}
