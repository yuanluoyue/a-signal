import { Injectable, Logger } from '@nestjs/common';
import { inArray, like, or } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { stocks } from '../../core/db/schema.js';

export interface StockInfo {
  code: string;
  name: string;
  market?: string;
}

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(private readonly dbService: DbService) {}

  async findByCodes(codes: string[]): Promise<Map<string, StockInfo>> {
    if (codes.length === 0) {
      return new Map();
    }

    const uniqueCodes = [...new Set(codes.filter(code => code && code.trim() !== ''))];
    
    if (uniqueCodes.length === 0) {
      return new Map();
    }

    try {
      const results = await this.dbService.db
        .select()
        .from(stocks)
        .where(inArray(stocks.code, uniqueCodes));

      const stockMap = new Map<string, StockInfo>();
      results.forEach(stock => {
        stockMap.set(stock.code, {
          code: stock.code,
          name: stock.name,
          market: stock.market,
        });
      });

      return stockMap;
    } catch (error) {
      this.logger.error(
        `Failed to find stocks by codes: ${error instanceof Error ? error.message : String(error)}`,
      );
      return new Map();
    }
  }

  async searchStocks(keyword: string): Promise<StockInfo[]> {
    if (!keyword || keyword.trim() === '') {
      const results = await this.dbService.db
        .select()
        .from(stocks)
        .limit(20);
      
      return results.map(stock => ({
        code: stock.code,
        name: stock.name,
        market: stock.market,
      }));
    }

    const searchTerm = `%${keyword.trim()}%`;
    
    const results = await this.dbService.db
      .select()
      .from(stocks)
      .where(
        or(
          like(stocks.code, searchTerm),
          like(stocks.name, searchTerm)
        )
      )
      .limit(20);

    return results.map(stock => ({
      code: stock.code,
      name: stock.name,
      market: stock.market,
    }));
  }

  async syncFromCninfo(): Promise<{ added: number; updated: number }> {
    try {
      const response = await fetch('https://www.cninfo.com.cn/new/data/szse_stock.json');
      const data = await response.json() as Array<{ code: string; name: string; market: string }>;

      if (!Array.isArray(data)) {
        throw new Error('Invalid response format from cninfo API');
      }

      const validStocks = data.filter(
        stock => stock.code && stock.name && stock.code.trim() !== '' && stock.name.trim() !== ''
      );

      this.logger.log(`Fetched ${validStocks.length} valid stocks from cninfo`);

      let added = 0;
      let updated = 0;

      for (const stock of validStocks) {
        try {
          const existing = await this.dbService.db
            .select()
            .from(stocks)
            .where(inArray(stocks.code, [stock.code]))
            .limit(1);

          if (existing.length === 0) {
            await this.dbService.db.insert(stocks).values({
              code: stock.code,
              name: stock.name,
              market: stock.market || 'SZ',
            });
            added++;
          } else if (existing[0].name !== stock.name) {
            await this.dbService.db
              .update(stocks)
              .set({ name: stock.name, updatedAt: new Date() })
              .where(inArray(stocks.code, [stock.code]));
            updated++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to sync stock ${stock.code}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      this.logger.log(`Stock sync completed: ${added} added, ${updated} updated`);
      return { added, updated };
    } catch (error) {
      this.logger.error(
        `Failed to sync stocks from cninfo: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
