import { Injectable, Logger } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { stockBlacklist, type NewStockBlacklist, type StockBlacklist } from '../../core/db/schema.js';

export interface CreateBlacklistDto {
  stockCode: string;
  stockName: string;
  reason?: string;
}

@Injectable()
export class BlacklistService {
  private readonly logger = new Logger(BlacklistService.name);

  constructor(private readonly dbService: DbService) {}

  async findAll(): Promise<StockBlacklist[]> {
    return this.dbService.db
      .select()
      .from(stockBlacklist)
      .orderBy(stockBlacklist.createdAt);
  }

  async findById(id: string): Promise<StockBlacklist | null> {
    const [result] = await this.dbService.db
      .select()
      .from(stockBlacklist)
      .where(eq(stockBlacklist.id, id))
      .limit(1);
    return result || null;
  }

  async findByStockCode(stockCode: string): Promise<StockBlacklist | null> {
    const [result] = await this.dbService.db
      .select()
      .from(stockBlacklist)
      .where(eq(stockBlacklist.stockCode, stockCode))
      .limit(1);
    return result || null;
  }

  async isBlacklisted(stockCode: string): Promise<boolean> {
    const result = await this.findByStockCode(stockCode);
    return !!result;
  }

  async filterBlacklistedStockCodes(stockCodes: string[]): Promise<string[]> {
    if (stockCodes.length === 0) return [];

    const results = await this.dbService.db
      .select({ stockCode: stockBlacklist.stockCode })
      .from(stockBlacklist)
      .where(inArray(stockBlacklist.stockCode, stockCodes));

    return results.map(r => r.stockCode);
  }

  async create(dto: CreateBlacklistDto): Promise<StockBlacklist> {
    const existing = await this.findByStockCode(dto.stockCode);
    if (existing) {
      throw new Error(`Stock ${dto.stockCode} is already in blacklist`);
    }

    const newBlacklist: NewStockBlacklist = {
      stockCode: dto.stockCode,
      stockName: dto.stockName,
      reason: dto.reason,
    };

    const [result] = await this.dbService.db
      .insert(stockBlacklist)
      .values(newBlacklist)
      .returning();

    this.logger.log(`Added ${dto.stockCode} to blacklist`);
    return result;
  }

  async remove(id: string): Promise<void> {
    await this.dbService.db
      .delete(stockBlacklist)
      .where(eq(stockBlacklist.id, id));

    this.logger.log(`Removed blacklist record ${id}`);
  }

  async getAllBlacklistedStockCodes(): Promise<string[]> {
    const results = await this.dbService.db
      .select({ stockCode: stockBlacklist.stockCode })
      .from(stockBlacklist);

    return results.map(r => r.stockCode);
  }
}
