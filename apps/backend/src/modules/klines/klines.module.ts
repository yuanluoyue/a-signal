import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KlinesService } from './klines.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { QueueModule } from '../../core/queue/queue.module.js';

@Module({
  imports: [HttpModule, DbModule, QueueModule],
  providers: [KlinesService],
  exports: [KlinesService],
})
export class KlinesModule {}
