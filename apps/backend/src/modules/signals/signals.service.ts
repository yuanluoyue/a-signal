import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, gte, lte, or } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { signals, Signal, NewSignal } from '../../core/db/schema.js';
import { StockService } from '../stock/stock.service.js';

export interface CreateSignalDto {
  newsId?: string;
  stockCode?: string;
  stockName?: string;
  direction?: string;
  confidence?: number;
  sentiment?: string;
  reasoning?: string;
  keyFactors?: string[];
  timeWindow?: string;
  signalTime?: Date;

  eventId?: string;
  symbol?: string;
  action?: 'long' | 'short' | 'hold';
  score?: number;
  validFrom?: Date;
  validTo?: Date;
  reason?: string;
  ruleId?: string;
  ruleSnapshot?: Record<string, any>;
  weight?: number;
}

export interface SignalsListQueryDto {
  page?: number;
  pageSize?: number;
  newsId?: string;
  eventId?: string;
  symbol?: string;
  stockCode?: string;
  action?: string;
  direction?: string;
  minScore?: number;
  maxScore?: number;
  minConfidence?: number;
  maxConfidence?: number;
  startTime?: string;
  endTime?: string;
}

@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly stockService: StockService,
  ) {}

  async createSignal(dto: CreateSignalDto): Promise<Signal> {
    try {
      const newSignal: NewSignal = {
        newsId: dto.newsId || null,
        stockCode: dto.stockCode || null,
        stockName: dto.stockName || null,
        direction: dto.direction || null,
        confidence: dto.confidence !== undefined ? dto.confidence : null,
        sentiment: dto.sentiment || null,
        reasoning: dto.reasoning || null,
        keyFactors: dto.keyFactors || null,
        timeWindow: dto.timeWindow || null,
        signalTime: dto.signalTime || null,
        eventId: dto.eventId || null,
        symbol: dto.symbol || null,
        action: dto.action || null,
        score: dto.score !== undefined ? dto.score.toString() : null,
        validFrom: dto.validFrom || null,
        validTo: dto.validTo || null,
        reason: dto.reason || null,
        ruleId: dto.ruleId || null,
        ruleSnapshot: dto.ruleSnapshot || null,
        weight: dto.weight !== undefined ? dto.weight.toString() : null,
      };

      const [result] = await this.dbService.db
        .insert(signals)
        .values(newSignal)
        .returning();

      this.logger.log(`Created signal ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create signal: ${error instanceof Error ? error.message : String(error)}`,
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
        newsId: dto.newsId || null,
        stockCode: dto.stockCode || null,
        stockName: dto.stockName || null,
        direction: dto.direction || null,
        confidence: dto.confidence !== undefined ? dto.confidence : null,
        sentiment: dto.sentiment || null,
        reasoning: dto.reasoning || null,
        keyFactors: dto.keyFactors || null,
        timeWindow: dto.timeWindow || null,
        signalTime: dto.signalTime || null,
        eventId: dto.eventId || null,
        symbol: dto.symbol || null,
        action: dto.action || null,
        score: dto.score !== undefined ? dto.score.toString() : null,
        validFrom: dto.validFrom || null,
        validTo: dto.validTo || null,
        reason: dto.reason || null,
        ruleId: dto.ruleId || null,
        ruleSnapshot: dto.ruleSnapshot || null,
        weight: dto.weight !== undefined ? dto.weight.toString() : null,
      }));

      const results = await this.dbService.db
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

  async findById(id: string): Promise<Signal | null> {
    try {
      const [result] = await this.dbService.db
        .select()
        .from(signals)
        .where(eq(signals.id, id));

      if (!result) {
        return null;
      }

      const stockCode = result.symbol || result.stockCode;
      if (stockCode) {
        const stockNamesMap = await this.stockService.findByCodes([stockCode]);
        const stockName = stockNamesMap.get(stockCode)?.name || result.stockName || stockCode;
        return {
          ...result,
          stockName,
        };
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to find signal by id ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findByEventId(eventId: string): Promise<Signal[]> {
    try {
      const results = await this.dbService.db
        .select()
        .from(signals)
        .where(eq(signals.eventId, eventId));

      const stockCodes = results
        .map(s => s.symbol || s.stockCode)
        .filter((code): code is string => code !== null);
      const stockNamesMap = await this.stockService.findByCodes(stockCodes);

      return results.map(signal => ({
        ...signal,
        stockName: stockNamesMap.get(signal.symbol || signal.stockCode || '')?.name || signal.stockName || signal.symbol || signal.stockCode || '',
      }));
    } catch (error) {
      this.logger.error(
        `Failed to find signals by eventId ${eventId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findList(query: SignalsListQueryDto): Promise<{ data: Signal[]; total: number; page: number; pageSize: number }> {
    try {
      const { page = 1, pageSize = 20, newsId, eventId, symbol, stockCode, action, direction, minScore, maxScore, minConfidence, maxConfidence, startTime, endTime } = query;
      const offset = (page - 1) * pageSize;

      const conditions: ReturnType<typeof eq | typeof gte | typeof lte | typeof or>[] = [];

      if (newsId) {
        conditions.push(eq(signals.newsId, newsId));
      }
      if (eventId) {
        conditions.push(eq(signals.eventId, eventId));
      }
      if (symbol || stockCode) {
        if (symbol && stockCode) {
          conditions.push(or(eq(signals.symbol, symbol), eq(signals.stockCode, stockCode)));
        } else if (symbol) {
          conditions.push(eq(signals.symbol, symbol));
        } else {
          conditions.push(eq(signals.stockCode, stockCode!));
        }
      }
      if (action || direction) {
        if (action && direction) {
          conditions.push(or(eq(signals.action, action), eq(signals.direction, direction)));
        } else if (action) {
          conditions.push(eq(signals.action, action));
        } else {
          conditions.push(eq(signals.direction, direction!));
        }
      }
      if (minScore !== undefined) {
        conditions.push(gte(signals.score, minScore.toString()));
      }
      if (maxScore !== undefined) {
        conditions.push(lte(signals.score, maxScore.toString()));
      }
      if (minConfidence !== undefined) {
        conditions.push(gte(signals.confidence, minConfidence));
      }
      if (maxConfidence !== undefined) {
        conditions.push(lte(signals.confidence, maxConfidence));
      }
      if (startTime) {
        conditions.push(
          or(
            gte(signals.generatedAt, new Date(startTime)),
            gte(signals.signalTime, new Date(startTime))
          )
        );
      }
      if (endTime) {
        conditions.push(
          or(
            lte(signals.generatedAt, new Date(endTime)),
            lte(signals.signalTime, new Date(endTime))
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const countResult = await this.dbService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(signals)
        .where(whereClause || sql`1=1`);
      const total = Number(countResult[0]?.count || 0);

      const data = await this.dbService.db
        .select()
        .from(signals)
        .where(whereClause || sql`1=1`)
        .orderBy(desc(signals.createdAt))
        .limit(pageSize)
        .offset(offset);

      const stockCodes = data
        .map(s => s.symbol || s.stockCode)
        .filter((code): code is string => code !== null);
      const stockNamesMap = await this.stockService.findByCodes(stockCodes);

      const dataWithStockName = data.map(signal => ({
        ...signal,
        stockName: stockNamesMap.get(signal.symbol || signal.stockCode || '')?.name || signal.stockName || signal.symbol || signal.stockCode || '',
      }));

      return {
        data: dataWithStockName,
        total,
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error(
        `Failed to find signals list: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      const [result] = await this.dbService.db
        .delete(signals)
        .where(eq(signals.id, id))
        .returning();

      if (!result) {
        throw new NotFoundException(`Signal with id ${id} not found`);
      }

      this.logger.log(`Deleted signal ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete signal ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async deleteByEventId(eventId: string): Promise<number> {
    try {
      const results = await this.dbService.db
        .delete(signals)
        .where(eq(signals.eventId, eventId))
        .returning();

      this.logger.log(`Deleted ${results.length} signals for event ${eventId}`);
      return results.length;
    } catch (error) {
      this.logger.error(
        `Failed to delete signals for event ${eventId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
