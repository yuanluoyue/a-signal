import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, or, ilike } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { tradingMemories, TradingMemory } from '../../core/db/schema.js';

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

@Injectable()
export class TradingMemoryService {
  private readonly logger = new Logger(TradingMemoryService.name);

  constructor(private readonly dbService: DbService) {}

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
}
