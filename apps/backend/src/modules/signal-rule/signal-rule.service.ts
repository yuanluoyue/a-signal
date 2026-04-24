import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, sql, desc } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { signalRules, SignalRule, NewSignalRule } from '../../core/db/schema.js';

export interface CreateSignalRuleDto {
  name: string;
  type: 'global' | 'specific';
  eventType?: string;
  enabled?: boolean;
  multiplier?: number;
  threshold?: number;
  enableSurprise?: boolean;
  enableConfidence?: boolean;
  description?: string;
}

export interface UpdateSignalRuleDto {
  name?: string;
  eventType?: string;
  enabled?: boolean;
  multiplier?: number;
  threshold?: number;
  description?: string;
}

export interface UpdateGlobalRuleDto {
  multiplier?: number;
  threshold?: number;
  enableSurprise?: boolean;
  enableConfidence?: boolean;
}

export interface SignalRulesListQueryDto {
  page?: number;
  pageSize?: number;
  type?: 'global' | 'specific';
  eventType?: string;
  enabled?: boolean;
}

@Injectable()
export class SignalRuleService {
  private readonly logger = new Logger(SignalRuleService.name);

  constructor(private readonly dbService: DbService) {}

  async create(dto: CreateSignalRuleDto): Promise<SignalRule> {
    try {
      const newRule: NewSignalRule = {
        name: dto.name,
        type: dto.type,
        eventType: dto.eventType || null,
        enabled: dto.enabled ?? true,
        multiplier: String(dto.multiplier ?? 1.0),
        threshold: String(dto.threshold ?? 0.2),
        enableSurprise: dto.enableSurprise ?? true,
        enableConfidence: dto.enableConfidence ?? true,
        description: dto.description || null,
      };

      const [result] = await this.dbService.db
        .insert(signalRules)
        .values(newRule)
        .returning();

      this.logger.log(`Created signal rule ${result.id} [${dto.name}]`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create signal rule: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<SignalRule | null> {
    try {
      const [result] = await this.dbService.db
        .select()
        .from(signalRules)
        .where(eq(signalRules.id, id));

      return result || null;
    } catch (error) {
      this.logger.error(
        `Failed to find signal rule by id ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findList(query: SignalRulesListQueryDto): Promise<{ data: SignalRule[]; total: number; page: number; pageSize: number }> {
    try {
      const { page = 1, pageSize = 10, type, eventType, enabled } = query;
      const offset = (page - 1) * pageSize;

      const conditions: ReturnType<typeof eq>[] = [];

      if (type) {
        conditions.push(eq(signalRules.type, type));
      }
      if (eventType) {
        conditions.push(eq(signalRules.eventType, eventType));
      }
      if (enabled !== undefined) {
        conditions.push(eq(signalRules.enabled, enabled));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const countResult = await this.dbService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(signalRules)
        .where(whereClause || sql`1=1`);
      const total = Number(countResult[0]?.count || 0);

      const data = await this.dbService.db
        .select()
        .from(signalRules)
        .where(whereClause || sql`1=1`)
        .orderBy(desc(signalRules.createdAt))
        .limit(pageSize)
        .offset(offset);

      return {
        data,
        total,
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get signal rules list: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async update(id: string, dto: UpdateSignalRuleDto): Promise<SignalRule> {
    try {
      const updateData: Partial<NewSignalRule> = {};

      if (dto.name !== undefined) {
        updateData.name = dto.name;
      }
      if (dto.eventType !== undefined) {
        updateData.eventType = dto.eventType || null;
      }
      if (dto.enabled !== undefined) {
        updateData.enabled = dto.enabled;
      }
      if (dto.multiplier !== undefined) {
        updateData.multiplier = String(dto.multiplier);
      }
      if (dto.threshold !== undefined) {
        updateData.threshold = String(dto.threshold);
      }
      if (dto.description !== undefined) {
        updateData.description = dto.description || null;
      }

      const [result] = await this.dbService.db
        .update(signalRules)
        .set(updateData)
        .where(eq(signalRules.id, id))
        .returning();

      if (!result) {
        throw new NotFoundException(`Signal rule ${id} not found`);
      }

      this.logger.log(`Updated signal rule ${id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update signal rule ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findByEventType(eventType: string): Promise<SignalRule | null> {
    try {
      const [result] = await this.dbService.db
        .select()
        .from(signalRules)
        .where(eq(signalRules.eventType, eventType));

      return result || null;
    } catch (error) {
      this.logger.error(
        `Failed to find signal rule by eventType ${eventType}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async getGlobalRule(): Promise<SignalRule> {
    try {
      const [result] = await this.dbService.db
        .select()
        .from(signalRules)
        .where(eq(signalRules.type, 'global'));

      if (!result) {
        throw new NotFoundException('Global signal rule not found');
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get global signal rule: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async updateGlobalRule(dto: UpdateGlobalRuleDto): Promise<SignalRule> {
    try {
      const globalRule = await this.getGlobalRule();

      const updateData: Partial<NewSignalRule> = {};

      if (dto.multiplier !== undefined) {
        updateData.multiplier = String(dto.multiplier);
      }
      if (dto.threshold !== undefined) {
        updateData.threshold = String(dto.threshold);
      }
      if (dto.enableSurprise !== undefined) {
        updateData.enableSurprise = dto.enableSurprise;
      }
      if (dto.enableConfidence !== undefined) {
        updateData.enableConfidence = dto.enableConfidence;
      }

      const [result] = await this.dbService.db
        .update(signalRules)
        .set(updateData)
        .where(eq(signalRules.id, globalRule.id))
        .returning();

      this.logger.log(`Updated global signal rule ${globalRule.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update global signal rule: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
