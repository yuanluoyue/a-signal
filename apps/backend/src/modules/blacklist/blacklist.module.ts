import { Module, forwardRef } from '@nestjs/common';
import { BlacklistService } from './blacklist.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { StockModule } from '../stock/stock.module.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';

@Module({
  imports: [DbModule, forwardRef(() => StockModule), AuditLogModule],
  providers: [BlacklistService],
  exports: [BlacklistService],
})
export class BlacklistModule {}
