import { Module } from '@nestjs/common';
import { BlacklistService } from './blacklist.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { StockModule } from '../stock/stock.module.js';

@Module({
  imports: [DbModule, StockModule],
  providers: [BlacklistService],
  exports: [BlacklistService],
})
export class BlacklistModule {}
