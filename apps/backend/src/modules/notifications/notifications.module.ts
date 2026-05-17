import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DbModule } from '../../core/db/db.module.js';
import { NotificationsService } from './notifications.service.js';
import { WebhooksService } from './webhooks.service.js';
import { BlacklistModule } from '../blacklist/blacklist.module.js';
import { StockModule } from '../stock/stock.module.js';
import { StrategyModule } from '../strategy/strategy.module.js';
import { SimulationModule } from '../simulation/simulation.module.js';
import { KlinesModule } from '../klines/klines.module.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';

@Module({
  imports: [HttpModule, DbModule, BlacklistModule, StockModule, StrategyModule, SimulationModule, KlinesModule, AuditLogModule],
  providers: [NotificationsService, WebhooksService],
  exports: [NotificationsService, WebhooksService],
})
export class NotificationsModule {}
