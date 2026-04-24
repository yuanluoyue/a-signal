import { Injectable, Logger } from '@nestjs/common';
import { SignalRuleService } from '../signal-rule/signal-rule.service.js';
import { SignalsService } from '../signals/signals.service.js';
import { EventService } from '../event/event.service.js';
import type { Event } from '../../core/db/schema.js';
import type { SignalRule } from '../../core/db/schema.js';

export interface GeneratedSignal {
  eventId: string;
  symbol: string;
  action: 'long' | 'short' | 'hold';
  score: number;
  validFrom: Date;
  reason: string;
  ruleId: string;
  ruleSnapshot: Record<string, any>;
}

@Injectable()
export class SignalGeneratorService {
  private readonly logger = new Logger(SignalGeneratorService.name);

  constructor(
    private readonly signalRuleService: SignalRuleService,
    private readonly signalsService: SignalsService,
    private readonly eventService: EventService,
  ) {}

  async generateSignalsFromEvent(event: Event): Promise<GeneratedSignal[]> {
    try {
      const signals: GeneratedSignal[] = [];

      const globalRule = await this.signalRuleService.getGlobalRule();

      const globalScore = this.calculateGlobalScore(event, globalRule);

      const specificRule = await this.findMatchingRule(event);

      const effectiveRule = specificRule || globalRule;

      const finalScore = globalScore * parseFloat(effectiveRule.multiplier);

      if (Math.abs(finalScore) < parseFloat(effectiveRule.threshold)) {
        this.logger.log(`Event ${event.id} score ${finalScore} below threshold ${effectiveRule.threshold}, skipping`);
        return [];
      }

      const stockSubjects = event.subjects.filter(s => s.type === 'stock');

      for (const subject of stockSubjects) {
        const action = this.determineAction(finalScore);
        const signal: GeneratedSignal = {
          eventId: event.id,
          symbol: subject.code,
          action,
          score: finalScore,
          validFrom: event.effectivePeriodStart,
          reason: event.sentimentRationale,
          ruleId: effectiveRule.id,
          ruleSnapshot: {
            multiplier: effectiveRule.multiplier,
            threshold: effectiveRule.threshold,
            enableSurprise: globalRule.enableSurprise,
            enableConfidence: globalRule.enableConfidence,
          },
        };
        signals.push(signal);
      }

      if (signals.length > 0) {
        await this.signalsService.createSignalsBatch(signals);
        this.logger.log(`Generated ${signals.length} signals for event ${event.id}`);
      } else {
        this.logger.log(`No signals generated for event ${event.id} (no stock subjects)`);
      }

      return signals;
    } finally {
      await this.eventService.updateProcessed(event.id, true);
    }
  }

  private calculateGlobalScore(event: Event, globalRule: SignalRule): number {
    const importance = parseFloat(event.importanceScore);
    const direction = event.sentimentDirection;
    let confidence = parseFloat(event.sentimentConfidence);
    let surprise = 0;

    if (!globalRule.enableConfidence) {
      confidence = 1;
    }

    if (globalRule.enableSurprise && event.surpriseScore != null) {
      surprise = parseFloat(event.surpriseScore);
    }

    const score = importance * (direction * confidence) * (1 + surprise);
    return Math.max(-1, Math.min(1, score));
  }

  private async findMatchingRule(event: Event): Promise<SignalRule | null> {
    if (event.subcategory) {
      const subcategoryRule = await this.signalRuleService.findByEventType(event.subcategory);
      if (subcategoryRule && subcategoryRule.enabled) {
        return subcategoryRule;
      }
    }

    if (event.category) {
      const categoryRule = await this.signalRuleService.findByEventType(event.category);
      if (categoryRule && categoryRule.enabled) {
        return categoryRule;
      }
    }

    return null;
  }

  private determineAction(score: number): 'long' | 'short' | 'hold' {
    if (score > 0.1) return 'long';
    if (score < -0.1) return 'short';
    return 'hold';
  }
}
