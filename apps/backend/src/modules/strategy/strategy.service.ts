import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, sql, desc } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { strategies, Strategy, NewStrategy } from '../../core/db/schema.js';

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
}
