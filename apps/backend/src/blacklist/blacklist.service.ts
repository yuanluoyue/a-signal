import { Injectable, Logger } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { stockBlacklist, type NewStockBlacklist, type StockBlacklist } from '../database/schema.js';

export interface CreateBlacklistDto {
  stockCode: string;
  stockName: string;
  reason?: string;
}

@Injectable()
export class BlacklistService {
  private readonly logger = new Logger(BlacklistService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * 获取所有黑名单股票
   */
  async findAll(): Promise<StockBlacklist[]> {
    return this.databaseService.db
      .select()
      .from(stockBlacklist)
      .orderBy(stockBlacklist.createdAt);
  }

  /**
   * 根据 ID 获取黑名单记录
   */
  async findById(id: string): Promise<StockBlacklist | null> {
    const [result] = await this.databaseService.db
      .select()
      .from(stockBlacklist)
      .where(eq(stockBlacklist.id, id))
      .limit(1);
    return result || null;
  }

  /**
   * 根据股票代码获取黑名单记录
   */
  async findByStockCode(stockCode: string): Promise<StockBlacklist | null> {
    const [result] = await this.databaseService.db
      .select()
      .from(stockBlacklist)
      .where(eq(stockBlacklist.stockCode, stockCode))
      .limit(1);
    return result || null;
  }

  /**
   * 检查股票是否在黑名单中
   */
  async isBlacklisted(stockCode: string): Promise<boolean> {
    const result = await this.findByStockCode(stockCode);
    return !!result;
  }

  /**
   * 批量检查股票是否在黑名单中
   */
  async filterBlacklistedStockCodes(stockCodes: string[]): Promise<string[]> {
    if (stockCodes.length === 0) return [];
    
    const results = await this.databaseService.db
      .select({ stockCode: stockBlacklist.stockCode })
      .from(stockBlacklist)
      .where(inArray(stockBlacklist.stockCode, stockCodes));
    
    return results.map(r => r.stockCode);
  }

  /**
   * 添加股票到黑名单
   */
  async create(dto: CreateBlacklistDto): Promise<StockBlacklist> {
    // 检查是否已存在
    const existing = await this.findByStockCode(dto.stockCode);
    if (existing) {
      throw new Error(`Stock ${dto.stockCode} is already in blacklist`);
    }

    const newBlacklist: NewStockBlacklist = {
      stockCode: dto.stockCode,
      stockName: dto.stockName,
      reason: dto.reason,
    };

    const [result] = await this.databaseService.db
      .insert(stockBlacklist)
      .values(newBlacklist)
      .returning();

    this.logger.log(`Added ${dto.stockCode} to blacklist`);
    return result;
  }

  /**
   * 从黑名单中移除股票
   */
  async remove(id: string): Promise<void> {
    await this.databaseService.db
      .delete(stockBlacklist)
      .where(eq(stockBlacklist.id, id));

    this.logger.log(`Removed blacklist record ${id}`);
  }

  /**
   * 获取所有黑名单股票代码
   */
  async getAllBlacklistedStockCodes(): Promise<string[]> {
    const results = await this.databaseService.db
      .select({ stockCode: stockBlacklist.stockCode })
      .from(stockBlacklist);
    
    return results.map(r => r.stockCode);
  }
}
