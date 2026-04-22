import { Module } from '@nestjs/common';
import { EventService } from './event.service.js';
import { DbModule } from '../../core/db/db.module.js';

@Module({
  imports: [DbModule],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
