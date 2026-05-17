import { Module } from '@nestjs/common';
import { SignalRuleService } from './signal-rule.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';

@Module({
  imports: [DbModule, AuditLogModule],
  providers: [SignalRuleService],
  exports: [SignalRuleService],
})
export class SignalRuleModule {}
