import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, sql, desc, isNotNull } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { strategies, Strategy, NewStrategy, webhooks, Webhook, events, Signal } from '../../core/db/schema.js';

export interface CreateStrategyDto {
  name: string;
  description?: string;
  enabled?: boolean;
  minScore: number;
  maxScore?: number;
  allowedRuleIds?: string[];
  allowedCategories?: string[];
  directionMode: 'long_only' | 'short_only' | 'both';
  entryMode?: 'next_open';
  holdPeriod: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  maxSignalsPerDay?: number;
  maxPositions?: number;
  webhookId?: string;
}

export interface UpdateStrategyDto {
  name?: string;
  description?: string;
  enabled?: boolean;
  minScore?: number;
  maxScore?: number;
  allowedRuleIds?: string[];
  allowedCategories?: string[];
  directionMode?: 'long_only' | 'short_only' | 'both';
  entryMode?: 'next_open';
  holdPeriod?: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  maxSignalsPerDay?: number;
  maxPositions?: number;
  webhookId?: string;
}

export interface StrategyListQueryDto {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
  directionMode?: 'long_only' | 'short_only' | 'both';
}

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);

  constructor(private readonly dbService: DbService) {}

  async create(dto: CreateStrategyDto): Promise<Strategy> {
    try {
      const newStrategy: NewStrategy = {
        name: dto.name,
        description: dto.description || null,
        enabled: dto.enabled ?? true,
        minScore: String(dto.minScore),
        maxScore: dto.maxScore !== undefined ? String(dto.maxScore) : null,
        allowedRuleIds: dto.allowedRuleIds || null,
        allowedCategories: dto.allowedCategories || null,
        directionMode: dto.directionMode,
        entryMode: dto.entryMode || 'next_open',
        holdPeriod: dto.holdPeriod,
        stopLossPct: dto.stopLossPct !== undefined ? String(dto.stopLossPct) : null,
        takeProfitPct: dto.takeProfitPct !== undefined ? String(dto.takeProfitPct) : null,
        maxSignalsPerDay: dto.maxSignalsPerDay || null,
        maxPositions: dto.maxPositions || null,
        webhookId: dto.webhookId || null,
      };

      const [result] = await this.dbService.db
        .insert(strategies)
        .values(newStrategy)
        .returning();

      this.logger.log(`Created strategy ${result.id} [${dto.name}]`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create strategy: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<Strategy | null> {
    try {
      const [result] = await this.dbService.db
        .select()
        .from(strategies)
        .where(eq(strategies.id, id));

      return result || null;
    } catch (error) {
      this.logger.error(
        `Failed to find strategy by id ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findList(query: StrategyListQueryDto): Promise<{ data: Strategy[]; total: number; page: number; pageSize: number }> {
    try {
      const { page = 1, pageSize = 10, enabled, directionMode } = query;
      const offset = (page - 1) * pageSize;

      const conditions: ReturnType<typeof eq>[] = [];

      if (enabled !== undefined) {
        conditions.push(eq(strategies.enabled, enabled));
      }
      if (directionMode) {
        conditions.push(eq(strategies.directionMode, directionMode));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const countResult = await this.dbService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(strategies)
        .where(whereClause || sql`1=1`);
      const total = Number(countResult[0]?.count || 0);

      const data = await this.dbService.db
        .select()
        .from(strategies)
        .where(whereClause || sql`1=1`)
        .orderBy(desc(strategies.createdAt))
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
        `Failed to get strategies list: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async update(id: string, dto: UpdateStrategyDto): Promise<Strategy> {
    try {
      const updateData: Partial<NewStrategy> = {};

      if (dto.name !== undefined) {
        updateData.name = dto.name;
      }
      if (dto.description !== undefined) {
        updateData.description = dto.description || null;
      }
      if (dto.enabled !== undefined) {
        updateData.enabled = dto.enabled;
      }
      if (dto.minScore !== undefined) {
        updateData.minScore = String(dto.minScore);
      }
      if (dto.maxScore !== undefined) {
        updateData.maxScore = String(dto.maxScore);
      }
      if (dto.allowedRuleIds !== undefined) {
        updateData.allowedRuleIds = dto.allowedRuleIds || null;
      }
      if (dto.allowedCategories !== undefined) {
        updateData.allowedCategories = dto.allowedCategories || null;
      }
      if (dto.directionMode !== undefined) {
        updateData.directionMode = dto.directionMode;
      }
      if (dto.entryMode !== undefined) {
        updateData.entryMode = dto.entryMode;
      }
      if (dto.holdPeriod !== undefined) {
        updateData.holdPeriod = dto.holdPeriod;
      }
      if (dto.stopLossPct !== undefined) {
        updateData.stopLossPct = String(dto.stopLossPct);
      }
      if (dto.takeProfitPct !== undefined) {
        updateData.takeProfitPct = String(dto.takeProfitPct);
      }
      if (dto.maxSignalsPerDay !== undefined) {
        updateData.maxSignalsPerDay = dto.maxSignalsPerDay || null;
      }
      if (dto.maxPositions !== undefined) {
        updateData.maxPositions = dto.maxPositions || null;
      }
      if (dto.webhookId !== undefined) {
        updateData.webhookId = dto.webhookId || null;
      }

      const [result] = await this.dbService.db
        .update(strategies)
        .set(updateData)
        .where(eq(strategies.id, id))
        .returning();

      if (!result) {
        throw new NotFoundException(`Strategy ${id} not found`);
      }

      this.logger.log(`Updated strategy ${id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update strategy ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findEnabledWithWebhook(): Promise<Array<Strategy & { webhook: Webhook }>> {
    try {
      const rows = await this.dbService.db
        .select({
          strategy: strategies,
          webhook: webhooks,
        })
        .from(strategies)
        .innerJoin(webhooks, eq(strategies.webhookId, webhooks.id))
        .where(
          and(
            eq(strategies.enabled, true),
            isNotNull(strategies.webhookId),
          ),
        );

      this.logger.log(`StrategyService.findEnabledWithWebhook: found ${rows.length} enabled strategies with webhooks`);

      return rows.map((row) => ({
        ...row.strategy,
        webhook: row.webhook,
      }));
    } catch (error) {
      this.logger.error(
        `StrategyService.findEnabledWithWebhook: failed to query enabled strategies with webhooks: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async filterSignalByStrategy(strategy: Strategy, signal: Signal): Promise<boolean> {
    try {
      const absScore = Math.abs(parseFloat(signal.score || '0'));
      const minScore = parseFloat(strategy.minScore);
      const maxScore = strategy.maxScore ? parseFloat(strategy.maxScore) : null;

      if (absScore < minScore) {
        this.logger.debug(
          `StrategyService.filterSignalByStrategy: strategy [${strategy.name}] rejected signal ${signal.id} - absScore(${absScore}) < minScore(${minScore})`,
        );
        return false;
      }
      if (maxScore !== null && absScore > maxScore) {
        this.logger.debug(
          `StrategyService.filterSignalByStrategy: strategy [${strategy.name}] rejected signal ${signal.id} - absScore(${absScore}) > maxScore(${maxScore})`,
        );
        return false;
      }

      const action = (signal.action || signal.direction || '').toLowerCase();
      if (strategy.directionMode === 'long_only' && action !== 'long') {
        this.logger.debug(
          `StrategyService.filterSignalByStrategy: strategy [${strategy.name}] rejected signal ${signal.id} - directionMode is long_only but action is ${action}`,
        );
        return false;
      }
      if (strategy.directionMode === 'short_only' && action !== 'short') {
        this.logger.debug(
          `StrategyService.filterSignalByStrategy: strategy [${strategy.name}] rejected signal ${signal.id} - directionMode is short_only but action is ${action}`,
        );
        return false;
      }

      if (strategy.allowedCategories && strategy.allowedCategories.length > 0) {
        if (!signal.eventId) {
          this.logger.debug(
            `StrategyService.filterSignalByStrategy: strategy [${strategy.name}] rejected signal ${signal.id} - allowedCategories set but signal has no eventId`,
          );
          return false;
        }
        const [eventRow] = await this.dbService.db
          .select({ category: events.category })
          .from(events)
          .where(eq(events.id, signal.eventId))
          .limit(1);

        if (!eventRow || !strategy.allowedCategories.includes(eventRow.category)) {
          this.logger.debug(
            `StrategyService.filterSignalByStrategy: strategy [${strategy.name}] rejected signal ${signal.id} - event category ${eventRow?.category} not in allowedCategories [${strategy.allowedCategories.join(',')}]`,
          );
          return false;
        }
      }

      if (strategy.allowedRuleIds && strategy.allowedRuleIds.length > 0) {
        if (!signal.ruleId || !strategy.allowedRuleIds.includes(signal.ruleId)) {
          this.logger.debug(
            `StrategyService.filterSignalByStrategy: strategy [${strategy.name}] rejected signal ${signal.id} - ruleId ${signal.ruleId} not in allowedRuleIds [${strategy.allowedRuleIds.join(',')}]`,
          );
          return false;
        }
      }

      this.logger.debug(
        `StrategyService.filterSignalByStrategy: strategy [${strategy.name}] matched signal ${signal.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `StrategyService.filterSignalByStrategy: error filtering signal ${signal.id} for strategy [${strategy.name}]: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
