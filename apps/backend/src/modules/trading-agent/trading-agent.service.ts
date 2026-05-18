import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { tradingAgentDecisions, tradingAgentRuntimes, type TradingAgentRuntime, type NewTradingAgentRuntime } from '../../core/db/schema.js';
import { TradingAgentGraph } from './trading-agent-graph.js';
import { TradingAgentState } from './types/trading-agent-state.js';

@Injectable()
export class TradingAgentService {
  private readonly logger = new Logger(TradingAgentService.name);

  constructor(
    private readonly tradingAgentGraph: TradingAgentGraph,
    private readonly dbService: DbService,
  ) {}

  async processSignal(userId: string, accountId: string, signalId: string, strategyId?: string): Promise<TradingAgentState> {
    this.logger.log(`[TradingAgentService] Processing signal: ${signalId} for user: ${userId}, strategy: ${strategyId}`);
    try {
      const state = await this.tradingAgentGraph.execute(userId, accountId, signalId, strategyId);
      this.logger.log(`[TradingAgentService] Signal processed, decision: ${state.decision}`);
      return state;
    } catch (error) {
      this.logger.error(
        `[TradingAgentService] Error processing signal: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async getDecisions(
    userId: string,
    query: { page?: number; pageSize?: number; decision?: string; riskLevel?: string },
  ): Promise<{ data: TradingAgentRuntime[]; total: number; page: number; pageSize: number }> {
    try {
      const { page = 1, pageSize = 20, decision, riskLevel } = query;
      const offset = (page - 1) * pageSize;

      const conditions = [eq(tradingAgentDecisions.userId, userId)];

      if (decision) {
        conditions.push(eq(tradingAgentDecisions.decision, decision));
      }
      if (riskLevel) {
        conditions.push(eq(tradingAgentDecisions.riskLevel, riskLevel));
      }

      const whereClause = and(...conditions);

      const countResult = await this.dbService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tradingAgentDecisions)
        .where(whereClause);
      const total = Number(countResult[0]?.count || 0);

      const data = await this.dbService.db
        .select()
        .from(tradingAgentDecisions)
        .where(whereClause)
        .orderBy(desc(tradingAgentDecisions.createdAt))
        .limit(pageSize)
        .offset(offset);

      return { data: data as unknown as TradingAgentRuntime[], total, page, pageSize };
    } catch (error) {
      this.logger.error(
        `[TradingAgentService] Error getting decisions: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async getDecisionById(id: string, userId: string): Promise<TradingAgentRuntime | null> {
    try {
      const [result] = await this.dbService.db
        .select()
        .from(tradingAgentDecisions)
        .where(
          and(
            eq(tradingAgentDecisions.id, id),
            eq(tradingAgentDecisions.userId, userId),
          ),
        );

      return (result as unknown as TradingAgentRuntime) || null;
    } catch (error) {
      this.logger.error(
        `[TradingAgentService] Error getting decision by id: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async getStats(userId: string): Promise<{
    totalToday: number;
    approvedToday: number;
    rejectedToday: number;
    highRiskRejectedToday: number;
  }> {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [totalResult] = await this.dbService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tradingAgentDecisions)
        .where(
          and(
            eq(tradingAgentDecisions.userId, userId),
            gte(tradingAgentDecisions.createdAt, todayStart),
          ),
        );

      const [approvedResult] = await this.dbService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tradingAgentDecisions)
        .where(
          and(
            eq(tradingAgentDecisions.userId, userId),
            eq(tradingAgentDecisions.decision, 'approved'),
            gte(tradingAgentDecisions.createdAt, todayStart),
          ),
        );

      const [rejectedResult] = await this.dbService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tradingAgentDecisions)
        .where(
          and(
            eq(tradingAgentDecisions.userId, userId),
            eq(tradingAgentDecisions.decision, 'rejected'),
            gte(tradingAgentDecisions.createdAt, todayStart),
          ),
        );

      const [highRiskRejectedResult] = await this.dbService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tradingAgentDecisions)
        .where(
          and(
            eq(tradingAgentDecisions.userId, userId),
            eq(tradingAgentDecisions.decision, 'rejected'),
            sql`${tradingAgentDecisions.riskLevel} IN ('high', 'critical')`,
            gte(tradingAgentDecisions.createdAt, todayStart),
          ),
        );

      return {
        totalToday: Number(totalResult?.count || 0),
        approvedToday: Number(approvedResult?.count || 0),
        rejectedToday: Number(rejectedResult?.count || 0),
        highRiskRejectedToday: Number(highRiskRejectedResult?.count || 0),
      };
    } catch (error) {
      this.logger.error(
        `[TradingAgentService] Error getting stats: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async getRuntime(userId: string): Promise<TradingAgentRuntime | null> {
    try {
      const [result] = await this.dbService.db
        .select()
        .from(tradingAgentRuntimes)
        .where(eq(tradingAgentRuntimes.userId, userId));

      return result || null;
    } catch (error) {
      this.logger.error(
        `[TradingAgentService] Error getting runtime: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async updateRuntime(
    userId: string,
    dto: { status?: string; accountId?: string },
  ): Promise<TradingAgentRuntime> {
    try {
      const [existing] = await this.dbService.db
        .select()
        .from(tradingAgentRuntimes)
        .where(eq(tradingAgentRuntimes.userId, userId));

      if (existing) {
        const updateData: Record<string, unknown> = {};
        if (dto.status !== undefined) {
          updateData.status = dto.status;
        }
        if (dto.accountId !== undefined) {
          updateData.accountId = dto.accountId;
        }

        const [updated] = await this.dbService.db
          .update(tradingAgentRuntimes)
          .set(updateData)
          .where(eq(tradingAgentRuntimes.userId, userId))
          .returning();

        this.logger.log(`[TradingAgentService] Updated runtime for user: ${userId}`);
        return updated;
      }

      const newRuntime: NewTradingAgentRuntime = {
        userId,
        accountId: dto.accountId || null,
        status: dto.status || 'stopped',
      };

      const [created] = await this.dbService.db
        .insert(tradingAgentRuntimes)
        .values(newRuntime)
        .returning();

      this.logger.log(`[TradingAgentService] Created runtime for user: ${userId}`);
      return created;
    } catch (error) {
      this.logger.error(
        `[TradingAgentService] Error updating runtime: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async getRunningRuntimes(): Promise<TradingAgentRuntime[]> {
    try {
      return this.dbService.db
        .select()
        .from(tradingAgentRuntimes)
        .where(eq(tradingAgentRuntimes.status, 'running'));
    } catch (error) {
      this.logger.error(
        `[TradingAgentService] Error getting running runtimes: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
