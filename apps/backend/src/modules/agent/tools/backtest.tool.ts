import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool } from './base.tool.js';
import { BacktestService } from '../../backtest/backtest.service.js';

const GetBacktestByStockSchema = z.object({
  stockCode: z.string().optional().describe('股票代码（可选，不传则返回所有回测）'),
  limit: z.number().optional().default(5).describe('返回数量限制'),
});

type GetBacktestByStockInput = z.infer<typeof GetBacktestByStockSchema>;

interface BacktestItem {
  id: string;
  stockCode: string | null;
  startTime: Date;
  endTime: Date;
  period: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  avgReturn: number;
  createdAt: Date;
}

@Injectable()
export class GetBacktestByStockTool extends BaseTool<GetBacktestByStockInput, BacktestItem[]> {
  readonly name = 'get_backtest_by_stock';
  readonly description = '获取股票的回测记录，包含历史交易表现数据';
  readonly inputSchema = GetBacktestByStockSchema;

  private readonly logger = new Logger(GetBacktestByStockTool.name);

  constructor(private readonly backtestService: BacktestService) {
    super();
  }

  async execute(input: GetBacktestByStockInput): Promise<BacktestItem[]> {
    try {
      this.logger.debug(`[GetBacktestByStockTool] Executing for stock: ${input.stockCode || 'all'}`);

      const records = await this.backtestService.findAllRecords(
        input.stockCode,
        input.limit,
      );

      return records.map((record) => ({
        id: record.id,
        stockCode: record.stockCode,
        startTime: record.startTime,
        endTime: record.endTime,
        period: record.period,
        totalTrades: record.totalTrades,
        winningTrades: record.winningTrades,
        losingTrades: record.losingTrades,
        winRate: parseFloat(record.winRate),
        totalReturn: parseFloat(record.totalReturn),
        maxDrawdown: parseFloat(record.maxDrawdown),
        avgReturn: parseFloat(record.avgReturn),
        createdAt: record.createdAt,
      }));
    } catch (error) {
      this.logger.error(`[GetBacktestByStockTool] Error: ${this.formatError(error)}`);
      throw error;
    }
  }
}
