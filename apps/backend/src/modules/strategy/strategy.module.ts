import { Module } from '@nestjs/common';
import { StrategyService } from './strategy.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';

@Module({
  imports: [DbModule, AuditLogModule],
  providers: [StrategyService],
  exports: [StrategyService],
})
export class StrategyModule {}
