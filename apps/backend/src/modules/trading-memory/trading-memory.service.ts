import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, or, ilike, isNotNull, lt, gte } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { tradingMemories, tradingAgentDecisions, simulationTrades, TradingMemory } from '../../core/db/schema.js';
import { TradingMemoryLogService } from './trading-memory-log.service.js';

export interface TradingMemoriesListQueryDto {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
  keyword?: string;
}

export interface TradingMemoryStatsResult {
  total: number;
  highConfidence: number;
  active: number;
  invalidated: number;
}

export interface CalibrationResult {
  memoryId: string;
  title: string;
  oldConfidence: number;
  newConfidence: number;
  oldStatus: string;
  newStatus: string;
  sampleSize: number;
  winRate: number;
  avgReturn: number;
}

const TESTING_TO_ACTIVE_MIN_SAMPLES = 3;
const TESTING_TO_ACTIVE_MIN_WIN_RATE = 0.5;
const ACTIVE_TO_DORMANT_MAX_WIN_RATE = 0.3;
const ACTIVE_TO_DORMANT_MIN_SAMPLES = 5;
const ACTIVE_TO_INVALIDATED_MAX_WIN_RATE = 0.15;
const ACTIVE_TO_INVALIDATED_MIN_SAMPLES = 8;
const CONFIDENCE_ADJUSTMENT_FACTOR = 0.1;

@Injectable()
export class TradingMemoryService {
  private readonly logger = new Logger(TradingMemoryService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly logService: TradingMemoryLogService,
  ) {}

  async findList(query: TradingMemoriesListQueryDto): Promise<{
    data: TradingMemory[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const { page = 1, pageSize = 20, type, status, keyword } = query;
      const offset = (page - 1) * pageSize;

      const conditions: ReturnType<typeof eq>[] = [];

      if (type) {
        conditions.push(eq(tradingMemories.type, type));
      }
      if (status) {
        conditions.push(eq(tradingMemories.status, status));
      }
      if (keyword) {
        conditions.push(
          or(
            ilike(tradingMemories.title, `%${keyword}%`),
            ilike(tradingMemories.summary, `%${keyword}%`),
          )!,
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const countResult = await this.dbService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tradingMemories)
        .where(whereClause || sql`1=1`);
      const total = Number(countResult[0]?.count || 0);

      const data = await this.dbService.db
        .select()
        .from(tradingMemories)
        .where(whereClause || sql`1=1`)
        .orderBy(desc(tradingMemories.createdAt))
        .limit(pageSize)
        .offset(offset);

      return { data, total, page, pageSize };
    } catch (error) {
      this.logger.error(
        `Failed to find trading memories list: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<TradingMemory | null> {
    try {
      const [result] = await this.dbService.db
        .select()
        .from(tradingMemories)
        .where(eq(tradingMemories.id, id));

      return result || null;
    } catch (error) {
      this.logger.error(
        `Failed to find trading memory by id ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async invalidate(id: string): Promise<TradingMemory> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new NotFoundException(`Trading memory ${id} not found`);
      }

      const [result] = await this.dbService.db
        .update(tradingMemories)
        .set({
          status: 'invalidated',
          invalidatedAt: new Date(),
        })
        .where(eq(tradingMemories.id, id))
        .returning();

      if (!result) {
        throw new NotFoundException(`Trading memory ${id} not found`);
      }

      await this.logService.createLog({
        memoryId: id,
        action: 'invalidate',
        oldValue: { status: existing.status, confidence: existing.confidence },
        newValue: { status: 'invalidated', invalidatedAt: new Date().toISOString() },
        operator: 'user',
        detail: `手动失效交易经验: ${existing.title || id}`,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to invalidate trading memory ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async getStats(): Promise<TradingMemoryStatsResult> {
    try {
      const [totalResult] = await this.dbService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tradingMemories);

      const [highConfidenceResult] = await this.dbService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tradingMemories)
        .where(sql`confidence >= 0.8`);

      const [activeResult] = await this.dbService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tradingMemories)
        .where(eq(tradingMemories.status, 'active'));

      const [invalidatedResult] = await this.dbService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tradingMemories)
        .where(eq(tradingMemories.status, 'invalidated'));

      return {
        total: Number(totalResult?.count || 0),
        highConfidence: Number(highConfidenceResult?.count || 0),
        active: Number(activeResult?.count || 0),
        invalidated: Number(invalidatedResult?.count || 0),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get trading memory stats: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async calibrateConfidence(memoryId: string): Promise<CalibrationResult | null> {
    try {
      const memory = await this.findById(memoryId);
      if (!memory) {
        this.logger.warn(`[calibrateConfidence] Memory ${memoryId} not found`);
        return null;
      }

      if (memory.status === 'invalidated') {
        this.logger.log(`[calibrateConfidence] Memory ${memoryId} is invalidated, skipping`);
        return null;
      }

      const pattern = memory.pattern as Record<string, unknown> | null;
      const stockCode = pattern?.['signalDirection'] ? undefined : undefined;

      const decisions = await this.getRelatedDecisions(memory);
      if (decisions.length === 0) {
        this.logger.log(`[calibrateConfidence] Memory ${memoryId} has no related decisions, skipping`);
        return null;
      }

      const tradeResults = await this.getTradeResults(decisions);
      const stats = this.computeStats(tradeResults);

      const oldConfidence = memory.confidence ? parseFloat(memory.confidence) : 0.5;
      let newConfidence = oldConfidence;

      if (stats.sampleSize >= 2) {
        const performanceDelta = stats.winRate - 0.5;
        newConfidence = oldConfidence + performanceDelta * CONFIDENCE_ADJUSTMENT_FACTOR;
        newConfidence = Math.min(1.0, Math.max(0.05, newConfidence));
        newConfidence = Math.round(newConfidence * 10000) / 10000;
      }

      const oldStatus = memory.status || 'testing';
      let newStatus = oldStatus;

      if (oldStatus === 'testing' && stats.sampleSize >= TESTING_TO_ACTIVE_MIN_SAMPLES) {
        if (stats.winRate >= TESTING_TO_ACTIVE_MIN_WIN_RATE) {
          newStatus = 'active';
          newConfidence = Math.max(newConfidence, 0.6);
        } else if (stats.sampleSize >= ACTIVE_TO_INVALIDATED_MIN_SAMPLES && stats.winRate < ACTIVE_TO_INVALIDATED_MAX_WIN_RATE) {
          newStatus = 'invalidated';
        }
      } else if (oldStatus === 'active') {
        if (stats.sampleSize >= ACTIVE_TO_DORMANT_MIN_SAMPLES && stats.winRate < ACTIVE_TO_DORMANT_MAX_WIN_RATE) {
          newStatus = 'dormant';
        }
        if (stats.sampleSize >= ACTIVE_TO_INVALIDATED_MIN_SAMPLES && stats.winRate < ACTIVE_TO_INVALIDATED_MAX_WIN_RATE) {
          newStatus = 'invalidated';
        }
      } else if (oldStatus === 'dormant') {
        if (stats.sampleSize >= TESTING_TO_ACTIVE_MIN_SAMPLES && stats.winRate >= TESTING_TO_ACTIVE_MIN_WIN_RATE) {
          newStatus = 'active';
        }
      }

      const updateData: Record<string, unknown> = {
        confidence: String(newConfidence),
        stats: stats,
        lastComputedAt: new Date(),
        lastValidatedAt: new Date(),
      };

      if (newStatus !== oldStatus) {
        updateData.status = newStatus;
        if (newStatus === 'invalidated') {
          updateData.invalidatedAt = new Date();
        }
      }

      if (!memory.firstObservedAt) {
        updateData.firstObservedAt = decisions[decisions.length - 1]?.createdAt || new Date();
      }

      await this.dbService.db
        .update(tradingMemories)
        .set(updateData)
        .where(eq(tradingMemories.id, memoryId));

      this.logger.log(
        `[calibrateConfidence] Memory "${memory.title}": confidence ${oldConfidence}→${newConfidence}, status ${oldStatus}→${newStatus}, samples=${stats.sampleSize}, winRate=${stats.winRate}`,
      );

      const hasChange = newStatus !== oldStatus || Math.abs(oldConfidence - newConfidence) > 0.001;
      if (hasChange) {
        await this.logService.createLog({
          memoryId,
          action: newStatus !== oldStatus ? `status_change:${oldStatus}->${newStatus}` : 'confidence_calibrate',
          oldValue: { confidence: oldConfidence, status: oldStatus },
          newValue: { confidence: newConfidence, status: newStatus },
          operator: 'system',
          detail: `自动校准: 置信度 ${oldConfidence}→${newConfidence}, 状态 ${oldStatus}→${newStatus}, 样本=${stats.sampleSize}, 胜率=${stats.winRate}`,
        });
      }

      return {
        memoryId,
        title: memory.title || '',
        oldConfidence,
        newConfidence,
        oldStatus,
        newStatus,
        sampleSize: stats.sampleSize,
        winRate: stats.winRate,
        avgReturn: stats.avgReturn,
      };
    } catch (error) {
      this.logger.error(
        `[calibrateConfidence] Failed for memory ${memoryId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async calibrateAllMemories(): Promise<CalibrationResult[]> {
    this.logger.log('[calibrateAllMemories] Starting batch calibration');

    const memories = await this.dbService.db
      .select({ id: tradingMemories.id, status: tradingMemories.status })
      .from(tradingMemories)
      .where(sql`${tradingMemories.status} != 'invalidated'`);

    const results: CalibrationResult[] = [];

    for (const memory of memories) {
      const result = await this.calibrateConfidence(memory.id);
      if (result) {
        results.push(result);
      }
    }

    this.logger.log(`[calibrateAllMemories] Calibrated ${results.length} memories`);
    return results;
  }

  private async getRelatedDecisions(memory: TradingMemory): Promise<Array<{ id: string; accountId: string; signalId: string; decision: string; positionAction: unknown; createdAt: Date }>> {
    const memoryType = memory.type;

    const conditions = [];
    if (memoryType) {
      conditions.push(eq(tradingAgentDecisions.decisionType, memoryType));
    }

    const rawDecisions = await this.dbService.db
      .select({
        id: tradingAgentDecisions.id,
        accountId: tradingAgentDecisions.accountId,
        signalId: tradingAgentDecisions.signalId,
        decision: tradingAgentDecisions.decision,
        positionAction: tradingAgentDecisions.positionAction,
        createdAt: tradingAgentDecisions.createdAt,
      })
      .from(tradingAgentDecisions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tradingAgentDecisions.createdAt))
      .limit(50);

    return rawDecisions.filter((d): d is { id: string; accountId: string; signalId: string; decision: string; positionAction: unknown; createdAt: Date } =>
      d.decision === 'approved' && d.accountId !== null,
    );
  }

  private async getTradeResults(
    decisions: Array<{ id: string; accountId: string; signalId: string; decision: string; positionAction: unknown; createdAt: Date }>,
  ): Promise<Array<{ profit: number; returnPct: number }>> {
    const results: Array<{ profit: number; returnPct: number }> = [];

    for (const decision of decisions) {
      const positionAction = decision.positionAction as Record<string, unknown> | null;
      const stockCode = positionAction?.['stockCode'] as string | undefined;
      if (!stockCode) continue;

      const trades = await this.dbService.db
        .select({
          profit: simulationTrades.profit,
          type: simulationTrades.type,
        })
        .from(simulationTrades)
        .where(
          and(
            eq(simulationTrades.accountId, decision.accountId),
            eq(simulationTrades.stockCode, stockCode),
          ),
        )
        .limit(20);

      for (const trade of trades) {
        if (trade.type === 'sell' && trade.profit !== null) {
          const profit = parseFloat(trade.profit);
          results.push({
            profit,
            returnPct: profit > 0 ? 1 : 0,
          });
        }
      }
    }

    return results;
  }

  private computeStats(tradeResults: Array<{ profit: number; returnPct: number }>): {
    sampleSize: number;
    winRate: number;
    avgReturn: number;
    expectancy?: number;
    sharpeRatio?: number;
    profitFactor?: number;
  } {
    if (tradeResults.length === 0) {
      return { sampleSize: 0, winRate: 0, avgReturn: 0 };
    }

    const sampleSize = tradeResults.length;
    const wins = tradeResults.filter((t) => t.profit > 0);
    const losses = tradeResults.filter((t) => t.profit <= 0);
    const winRate = wins.length / sampleSize;

    const totalProfit = tradeResults.reduce((sum, t) => sum + t.profit, 0);
    const avgReturn = totalProfit / sampleSize;

    const grossProfit = wins.reduce((sum, t) => sum + t.profit, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

    const expectancy = (winRate * (grossProfit / Math.max(wins.length, 1))) -
      ((1 - winRate) * (grossLoss / Math.max(losses.length, 1)));

    let sharpeRatio: number | undefined;
    if (sampleSize >= 3) {
      const returns = tradeResults.map((t) => t.profit);
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      sharpeRatio = stdDev > 0 ? mean / stdDev : 0;
    }

    return {
      sampleSize,
      winRate: Math.round(winRate * 10000) / 10000,
      avgReturn: Math.round(avgReturn * 10000) / 10000,
      expectancy: Math.round(expectancy * 10000) / 10000,
      sharpeRatio: sharpeRatio !== undefined ? Math.round(sharpeRatio * 10000) / 10000 : undefined,
      profitFactor: Math.round(profitFactor * 10000) / 10000,
    };
  }
}
