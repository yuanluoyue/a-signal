import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { tradingMemoryLogs, tradingMemories } from '../../core/db/schema.js';

export interface CreateMemoryLogInput {
  memoryId: string;
  action: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  operator: string;
  operatorId?: string;
  detail?: string;
}

@Injectable()
export class TradingMemoryLogService {
  private readonly logger = new Logger(TradingMemoryLogService.name);

  constructor(private readonly dbService: DbService) {}

  async createLog(input: CreateMemoryLogInput): Promise<void> {
    try {
      await this.dbService.db.insert(tradingMemoryLogs).values({
        memoryId: input.memoryId,
        action: input.action,
        oldValue: input.oldValue || null,
        newValue: input.newValue || null,
        operator: input.operator,
        operatorId: input.operatorId || null,
        detail: input.detail || null,
      });
      this.logger.log(`[createLog] action=${input.action}, memoryId=${input.memoryId}, operator=${input.operator}`);
    } catch (error) {
      this.logger.error(`[createLog] Failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async findByMemoryId(memoryId: string, params: { page: number; pageSize: number }): Promise<{
    data: any[];
    total: number;
  }> {
    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)::int` })
      .from(tradingMemoryLogs)
      .where(eq(tradingMemoryLogs.memoryId, memoryId));

    const data = await this.dbService.db
      .select()
      .from(tradingMemoryLogs)
      .where(eq(tradingMemoryLogs.memoryId, memoryId))
      .orderBy(desc(tradingMemoryLogs.createdAt))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);

    return { data, total: count };
  }

  async findAll(params: { page: number; pageSize: number; action?: string }): Promise<{
    data: any[];
    total: number;
  }> {
    const conditions = [];
    if (params.action) {
      conditions.push(eq(tradingMemoryLogs.action, params.action));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)::int` })
      .from(tradingMemoryLogs)
      .where(whereClause || sql`1=1`);

    const data = await this.dbService.db
      .select()
      .from(tradingMemoryLogs)
      .where(whereClause || sql`1=1`)
      .orderBy(desc(tradingMemoryLogs.createdAt))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);

    return { data, total: count };
  }
}
