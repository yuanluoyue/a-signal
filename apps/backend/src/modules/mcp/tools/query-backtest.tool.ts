import { Injectable, Logger } from '@nestjs/common';
import { BacktestService } from '../../backtest/backtest.service.js';
import { McpToolDefinition, McpToolProperty } from '../mcp.types.js';

@Injectable()
export class QueryBacktestTool {
  private readonly logger = new Logger(QueryBacktestTool.name);

  constructor(private readonly backtestService: BacktestService) {}

  getDefinition(): McpToolDefinition {
    const properties: Record<string, McpToolProperty> = {
      stockCode: {
        type: 'string',
        description: '股票代码筛选（可选）',
      },
      strategyId: {
        type: 'string',
        description: '策略 ID 筛选（可选）',
      },
      limit: {
        type: 'number',
        description: '返回数量限制，默认10',
        default: 10,
      },
    };

    return {
      name: 'query_backtest',
      description: '查询回测记录，包含历史交易表现数据',
      inputSchema: {
        type: 'object',
        properties,
      },
    };
  }

  async execute(args: Record<string, unknown>): Promise<unknown> {
    this.logger.debug(`[QueryBacktestTool] Executing with args: ${JSON.stringify(args)}`);

    try {
      const records = await this.backtestService.findAllRecords(
        '',
        args.stockCode as string | undefined,
        args.strategyId as string | undefined,
        typeof args.limit === 'number' ? args.limit : 10,
      );

      return records.map((record) => ({
        id: record.id,
        stockCode: record.stockCode,
        strategyId: record.strategyId,
        name: record.name,
        startTime: record.startTime,
        endTime: record.endTime,
        period: record.period,
        totalTrades: record.totalTrades,
        winningTrades: record.winningTrades,
        losingTrades: record.losingTrades,
        winRate: record.winRate ? parseFloat(record.winRate) : null,
        totalReturnPct: record.totalReturnPct ? parseFloat(record.totalReturnPct) : null,
        avgReturnPct: record.avgReturnPct ? parseFloat(record.avgReturnPct) : null,
        maxDrawdownPct: record.maxDrawdownPct ? parseFloat(record.maxDrawdownPct) : null,
        sharpeRatio: record.sharpeRatio ? parseFloat(record.sharpeRatio) : null,
        profitFactor: record.profitFactor ? parseFloat(record.profitFactor) : null,
        status: record.status,
        createdAt: record.createdAt,
      }));
    } catch (error) {
      this.logger.error(`[QueryBacktestTool] Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
