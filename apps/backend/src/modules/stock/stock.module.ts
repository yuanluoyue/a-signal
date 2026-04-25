import { Module } from '@nestjs/common';
import { StockService } from './stock.service.js';
import { DbModule } from '../../core/db/db.module.js';

@Module({
  imports: [DbModule],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
