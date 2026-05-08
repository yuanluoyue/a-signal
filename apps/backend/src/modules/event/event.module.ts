import { Module } from '@nestjs/common';
import { EventService } from './event.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { StockModule } from '../stock/stock.module.js';

@Module({
  imports: [DbModule, StockModule],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
