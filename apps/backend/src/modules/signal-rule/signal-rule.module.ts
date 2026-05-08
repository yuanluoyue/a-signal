import { Module } from '@nestjs/common';
import { SignalRuleService } from './signal-rule.service.js';
import { DbModule } from '../../core/db/db.module.js';

@Module({
  imports: [DbModule],
  providers: [SignalRuleService],
  exports: [SignalRuleService],
})
export class SignalRuleModule {}
