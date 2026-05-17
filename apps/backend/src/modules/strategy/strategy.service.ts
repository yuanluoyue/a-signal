import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, sql, desc } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { strategies, Strategy, NewStrategy, webhooks, Webhook, strategiesRuntime, StrategyRuntime, NewStrategyRuntime, events, Signal } from '../../core/db/schema.js';

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

export interface UpdateStrategyRuntimeDto {
  webhookId?: string;
  accountId?: string;
  enableWebhook?: boolean;
  enableSimulation?: boolean;
  enableLiveTrading?: boolean;
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

  constructor(private readonly dbService: DbService, private readonly auditLogService: AuditLogService) {}

  async create(dto: CreateStrategyDto, userId: string): Promise<Strategy> {
    try {
      const [existing] = await this.dbService.db
        .select()
        .from(strategies)
        .where(and(eq(strategies.name, dto.name), eq(strategies.userId, userId)));

      if (existing) {
        throw new ConflictException(`Strategy with name "${dto.name}" already exists for this user`);
      }

      const newStrategy: NewStrategy = {
        userId: userId,
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

      await this.dbService.db
        .insert(strategiesRuntime)
        .values({
          strategyId: result.id,
          webhookId: dto.webhookId || null,
          enableWebhook: true,
          enableSimulation: false,
          enableLiveTrading: false,
        });

      this.logger.log(`Created strategy ${result.id} [${dto.name}] with runtime record`);
      await this.auditLogService.log({
        userId,
        action: 'strategy.create',
        resource: 'strategy',
        resourceId: result.id,
        detail: { name: dto.name, directionMode: dto.directionMode },
        status: 'success',
      });
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create strategy: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findById(id: string, userId?: string): Promise<Strategy | null> {
    try {
      const conditions = [eq(strategies.id, id)];
      if (userId) {
        conditions.push(eq(strategies.userId, userId));
      }

      const [result] = await this.dbService.db
        .select()
        .from(strategies)
        .where(and(...conditions));

      return result || null;
    } catch (error) {
      this.logger.error(
        `Failed to find strategy by id ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findList(query: StrategyListQueryDto, userId: string): Promise<{ data: Array<Strategy & { runtime: StrategyRuntime | null }>; total: number; page: number; pageSize: number }> {
    try {
      const { page = 1, pageSize = 10, enabled, directionMode } = query;
      const offset = (page - 1) * pageSize;

      const conditions: ReturnType<typeof eq>[] = [];

      conditions.push(eq(strategies.userId, userId));

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

      const rows = await this.dbService.db
        .select({
          strategy: strategies,
          runtime: strategiesRuntime,
        })
        .from(strategies)
        .leftJoin(strategiesRuntime, eq(strategiesRuntime.strategyId, strategies.id))
        .where(whereClause || sql`1=1`)
        .orderBy(desc(strategies.createdAt))
        .limit(pageSize)
        .offset(offset);

      const data = rows.map((row) => ({
        ...row.strategy,
        runtime: row.runtime || null,
      }));

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

  async update(id: string, dto: UpdateStrategyDto, userId: string): Promise<Strategy> {
    try {
      const strategy = await this.findById(id);
      if (!strategy || strategy.userId !== userId) {
        throw new NotFoundException(`Strategy ${id} not found`);
      }

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
      await this.auditLogService.log({
        userId,
        action: 'strategy.update',
        resource: 'strategy',
        resourceId: id,
        detail: { updatedFields: Object.keys(dto) },
        status: 'success',
      });
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update strategy ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findEnabledWithRuntime(userId?: string): Promise<Array<Strategy & { runtime: StrategyRuntime | null; webhook: Webhook | null }>> {
    try {
      const conditions = [eq(strategies.enabled, true)];
      if (userId) {
        conditions.push(eq(strategies.userId, userId));
      }

      const rows = await this.dbService.db
        .select({
          strategy: strategies,
          runtime: strategiesRuntime,
          webhook: webhooks,
        })
        .from(strategies)
        .leftJoin(strategiesRuntime, eq(strategiesRuntime.strategyId, strategies.id))
        .leftJoin(webhooks, eq(strategiesRuntime.webhookId, webhooks.id))
        .where(and(...conditions));

      this.logger.log(`StrategyService.findEnabledWithRuntime: found ${rows.length} enabled strategies with runtime`);

      return rows.map((row) => ({
        ...row.strategy,
        runtime: row.runtime || null,
        webhook: row.webhook || null,
      }));
    } catch (error) {
      this.logger.error(
        `StrategyService.findEnabledWithRuntime: failed to query enabled strategies with runtime: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findEnabledWithWebhook(): Promise<Array<Strategy & { webhook: Webhook }>> {
    try {
      const all = await this.findEnabledWithRuntime();
      const filtered = all.filter(
        (s) => s.runtime?.enableWebhook && s.runtime.webhookId && s.webhook,
      );

      this.logger.log(`StrategyService.findEnabledWithWebhook: found ${filtered.length} enabled strategies with webhooks`);

      return filtered.map((s) => ({
        ...s,
        webhook: s.webhook!,
      }));
    } catch (error) {
      this.logger.error(
        `StrategyService.findEnabledWithWebhook: failed to query enabled strategies with webhooks: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async updateRuntime(strategyId: string, dto: UpdateStrategyRuntimeDto, userId?: string): Promise<StrategyRuntime> {
    try {
      if (userId) {
        const strategy = await this.findById(strategyId, userId);
        if (!strategy) {
          throw new NotFoundException(`Strategy ${strategyId} not found`);
        }
      }

      const existing = await this.getOrCreateRuntime(strategyId);

      const updateData: Partial<NewStrategyRuntime> = {};

      if (dto.webhookId !== undefined) {
        updateData.webhookId = dto.webhookId || null;
      }
      if (dto.enableWebhook !== undefined) {
        updateData.enableWebhook = dto.enableWebhook;
      }
      if (dto.enableSimulation !== undefined) {
        updateData.enableSimulation = dto.enableSimulation;
      }
      if (dto.enableLiveTrading !== undefined) {
        updateData.enableLiveTrading = dto.enableLiveTrading;
      }
      if (dto.accountId !== undefined) {
        updateData.accountId = dto.accountId || null;
      }

      const [result] = await this.dbService.db
        .update(strategiesRuntime)
        .set(updateData)
        .where(eq(strategiesRuntime.strategyId, strategyId))
        .returning();

      if (!result) {
        throw new NotFoundException(`Strategy runtime for strategy ${strategyId} not found`);
      }

      this.logger.log(`StrategyService.updateRuntime: updated runtime for strategy ${strategyId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `StrategyService.updateRuntime: failed to update runtime for strategy ${strategyId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async getOrCreateRuntime(strategyId: string, userId?: string): Promise<StrategyRuntime> {
    try {
      if (userId) {
        const strategy = await this.findById(strategyId, userId);
        if (!strategy) {
          throw new NotFoundException(`Strategy ${strategyId} not found`);
        }
      }

      const [existing] = await this.dbService.db
        .select()
        .from(strategiesRuntime)
        .where(eq(strategiesRuntime.strategyId, strategyId));

      if (existing) {
        return existing;
      }

      const [created] = await this.dbService.db
        .insert(strategiesRuntime)
        .values({
          strategyId,
          webhookId: null,
          enableWebhook: true,
          enableSimulation: false,
          enableLiveTrading: false,
        })
        .returning();

      this.logger.log(`StrategyService.getOrCreateRuntime: created runtime for strategy ${strategyId}`);
      return created;
    } catch (error) {
      this.logger.error(
        `StrategyService.getOrCreateRuntime: failed for strategy ${strategyId}: ${error instanceof Error ? error.message : String(error)}`,
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
