import { Injectable, Logger } from '@nestjs/common';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { signals, NewSignal, Signal } from '../database/schema.js';
import { SignalsListQueryDto } from './dto/signals-list-query.dto.js';

export interface CreateSignalDto {
  newsId: string;
  stockCode: string;
  stockName: string;
  direction: string;
  confidence: number;
  sentiment: string;
  reasoning: string;
  keyFactors: string[];
  timeWindow: string;
  signalTime: Date;
}

@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async createSignal(dto: CreateSignalDto): Promise<Signal> {
    try {
      const newSignal: NewSignal = {
        newsId: dto.newsId,
        stockCode: dto.stockCode,
        stockName: dto.stockName,
        direction: dto.direction,
        confidence: dto.confidence,
        sentiment: dto.sentiment,
        reasoning: dto.reasoning,
        keyFactors: dto.keyFactors,
        timeWindow: dto.timeWindow,
        signalTime: dto.signalTime,
      };

      const [result] = await this.databaseService.db
        .insert(signals)
        .values(newSignal)
        .returning();

      this.logger.log(`Created signal ${result.id} for news ${dto.newsId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create signal for news ${dto.newsId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async createSignalsBatch(dtos: CreateSignalDto[]): Promise<Signal[]> {
    if (dtos.length === 0) {
      return [];
    }

    try {
      const newSignals: NewSignal[] = dtos.map((dto) => ({
        newsId: dto.newsId,
        stockCode: dto.stockCode,
        stockName: dto.stockName,
        direction: dto.direction,
        confidence: dto.confidence,
        sentiment: dto.sentiment,
        reasoning: dto.reasoning,
        keyFactors: dto.keyFactors,
        timeWindow: dto.timeWindow,
        signalTime: dto.signalTime,
      }));

      const results = await this.databaseService.db
        .insert(signals)
        .values(newSignals)
        .returning();

      this.logger.log(`Created ${results.length} signals in batch`);
      return results;
    } catch (error) {
      this.logger.error(
        `Failed to create signals batch: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findByNewsId(newsId: string): Promise<Signal[]> {
    try {
      const results = await this.databaseService.db
        .select()
        .from(signals)
        .where(eq(signals.newsId, newsId));

      return results;
    } catch (error) {
      this.logger.error(
        `Failed to find signals by newsId ${newsId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<Signal | null> {
    try {
      const [result] = await this.databaseService.db
        .select()
        .from(signals)
        .where(eq(signals.id, id));

      return result || null;
    } catch (error) {
      this.logger.error(
        `Failed to find signal by id ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async deleteSignal(id: string): Promise<void> {
    try {
      await this.databaseService.db
        .delete(signals)
        .where(eq(signals.id, id));

      this.logger.log(`Deleted signal ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete signal ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async getSignalsList(query: SignalsListQueryDto): Promise<{ data: Signal[]; total: number; page: number; pageSize: number }> {
    try {
      const { page = 1, pageSize = 20, stockCode, direction, minConfidence, maxConfidence, startTime, endTime } = query;
      const offset = (page - 1) * pageSize;

      // 构建筛选条件
      const conditions: ReturnType<typeof eq | typeof gte | typeof lte>[] = [];
      
      if (stockCode) {
        conditions.push(eq(signals.stockCode, stockCode));
      }
      if (direction) {
        conditions.push(eq(signals.direction, direction));
      }
      if (minConfidence !== undefined) {
        conditions.push(gte(signals.confidence, minConfidence));
      }
      if (maxConfidence !== undefined) {
        conditions.push(lte(signals.confidence, maxConfidence));
      }
      if (startTime) {
        conditions.push(gte(signals.signalTime, new Date(startTime)));
      }
      if (endTime) {
        conditions.push(lte(signals.signalTime, new Date(endTime)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // 查询总数
      const countResult = await this.databaseService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(signals)
        .where(whereClause || sql`1=1`);
      const total = Number(countResult[0]?.count || 0);

      // 查询数据
      const data = await this.databaseService.db
        .select()
        .from(signals)
        .where(whereClause || sql`1=1`)
        .orderBy(desc(signals.signalTime))
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
        `Failed to get signals list: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
