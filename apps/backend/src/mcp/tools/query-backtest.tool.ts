import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import type { McpTool } from '../mcp.types.js';
import { BacktestService } from '../../backtest/backtest.service.js';

const QueryBacktestDataSchema = z.object({
  stockCode: z.string().optional().describe('股票代码（可选，不传则返回所有回测）'),
  limit: z.number().optional().default(5).describe('返回回测记录数量限制'),
});

type QueryBacktestDataInput = z.infer<typeof QueryBacktestDataSchema>;

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
export class QueryBacktestDataTool implements McpTool {
  readonly name = 'query_backtest_data';
  readonly description = '查询回测数据，获取股票的历史交易表现数据';
  readonly inputSchema = QueryBacktestDataSchema;

  private readonly logger = new Logger(QueryBacktestDataTool.name);

  constructor(private readonly backtestService: BacktestService) {}

  async execute(input: QueryBacktestDataInput): Promise<BacktestItem[]> {
    this.logger.debug(`[MCP Tool: ${this.name}] Executing for stock: ${input.stockCode || 'all'}`);

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
  }
}
