import { Module } from '@nestjs/common';
import { SignalGeneratorService } from './signal-generator.service.js';
import { SignalRuleModule } from '../signal-rule/signal-rule.module.js';
import { SignalsModule } from '../signals/signals.module.js';
import { EventModule } from '../event/event.module.js';

@Module({
  imports: [SignalRuleModule, SignalsModule, EventModule],
  providers: [SignalGeneratorService],
  exports: [SignalGeneratorService],
})
export class SignalGeneratorModule {}
