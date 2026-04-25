import { Injectable, Logger } from '@nestjs/common';
import { inArray, or, like, sql } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { stocks } from '../../core/db/schema.js';

export interface SyncResult {
  added: number;
  updated: number;
}

export interface StockInfo {
  code: string;
  name: string;
}

interface CninfoStock {
  code: string;
  name: string;
  market: string;
}

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(private readonly dbService: DbService) {}

  async syncFromCninfo(): Promise<SyncResult> {
    this.logger.log('[StockService] Starting stock sync from cninfo');
    
    const result: SyncResult = {
      added: 0,
      updated: 0,
    };

    try {
      const response = await fetch('https://www.cninfo.com.cn/new/data/szse_stock.json');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stock data: ${response.statusText}`);
      }

      const rawData = await response.json();
      this.logger.log(`[StockService] Raw API response type: ${typeof rawData}`);
      this.logger.log(`[StockService] Raw API response keys: ${Object.keys(rawData || {}).join(', ')}`);

      let stockList: CninfoStock[] = [];
      
      if (Array.isArray(rawData)) {
        stockList = rawData;
        this.logger.log('[StockService] API returned array directly');
      } else if (rawData.stockList && Array.isArray(rawData.stockList)) {
        stockList = rawData.stockList;
        this.logger.log('[StockService] API returned { stockList: [...] }');
      } else if (rawData.data && Array.isArray(rawData.data)) {
        stockList = rawData.data;
        this.logger.log('[StockService] API returned { data: [...] }');
      } else if (rawData.stocks && Array.isArray(rawData.stocks)) {
        stockList = rawData.stocks;
        this.logger.log('[StockService] API returned { stocks: [...] }');
      } else {
        this.logger.error('[StockService] Unknown API response format');
        this.logger.error(`[StockService] Response sample: ${JSON.stringify(rawData).substring(0, 500)}`);
        throw new Error('Invalid stock data format: unknown structure');
      }

      this.logger.log(`[StockService] Fetched ${stockList.length} stocks from cninfo`);

      if (stockList.length > 0) {
        this.logger.log(`[StockService] First stock sample: ${JSON.stringify(stockList[0])}`);
      }

      const validStocks = stockList.filter(stock => {
        const code = stock.code || (stock as any).agdm || (stock as any).stockCode;
        const name = (stock as any).zwjc || stock.name || (stock as any).jc || (stock as any).stockName;
        return code && name && code.trim() !== '' && name.trim() !== '';
      });

      this.logger.log(`[StockService] Filtered ${validStocks.length} valid stocks (removed ${stockList.length - validStocks.length} invalid stocks)`);

      for (const stock of validStocks) {
        const code = (stock.code || (stock as any).agdm || (stock as any).stockCode || '').trim();
        const name = ((stock as any).zwjc || stock.name || (stock as any).jc || (stock as any).stockName || '').trim();
        const market = stock.market || (stock as any).jys || 'SZ';

        if (!code || !name) {
          continue;
        }

        const existingStock = await this.dbService.db
          .select()
          .from(stocks)
          .where(sql`${stocks.code} = ${code}`)
          .limit(1);

        if (existingStock.length === 0) {
          await this.dbService.db.insert(stocks).values({
            code,
            name,
            market,
          });
          result.added++;
        } else {
          await this.dbService.db
            .update(stocks)
            .set({
              name,
              market,
              updatedAt: new Date(),
            })
            .where(sql`${stocks.code} = ${code}`);
          result.updated++;
        }
      }

      this.logger.log('[StockService] Stock sync completed', result);
    } catch (error) {
      this.logger.error('[StockService] Failed to sync stocks', error);
      throw error;
    }
    
    return result;
  }

  async searchStocks(keyword: string, limit: number = 20): Promise<StockInfo[]> {
    this.logger.log(`[StockService] Searching stocks with keyword: ${keyword}`);
    
    const stockList = await this.dbService.db
      .select({
        code: stocks.code,
        name: stocks.name,
      })
      .from(stocks)
      .where(
        or(
          like(stocks.code, `%${keyword}%`),
          like(stocks.name, `%${keyword}%`)
        )
      )
      .limit(limit);

    this.logger.log(`[StockService] Found ${stockList.length} stocks`);
    
    return stockList;
  }

  async findByCodes(codes: string[]): Promise<Map<string, StockInfo>> {
    // this.logger.log(`[StockService] Finding stocks by codes: ${codes.join(', ')}`);
    
    if (codes.length === 0) {
      return new Map();
    }

    const stockList = await this.dbService.db
      .select({
        code: stocks.code,
        name: stocks.name,
      })
      .from(stocks)
      .where(inArray(stocks.code, codes));

    const stockMap = new Map<string, StockInfo>();
    stockList.forEach(stock => {
      stockMap.set(stock.code, stock);
    });

    this.logger.log(`[StockService] Found ${stockList.length} stocks`);
    return stockMap;
  }
}
