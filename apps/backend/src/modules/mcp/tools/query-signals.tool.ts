import { Injectable, Logger } from '@nestjs/common';
import { SignalsService } from '../../signals/signals.service.js';
import { McpToolDefinition, McpToolProperty } from '../mcp.types.js';
import { SignalAction } from '../../../interfaces/admin/signals/dto/signals-list-query.dto.js';

@Injectable()
export class QuerySignalsTool {
  private readonly logger = new Logger(QuerySignalsTool.name);

  constructor(private readonly signalsService: SignalsService) {}

  getDefinition(): McpToolDefinition {
    const properties: Record<string, McpToolProperty> = {
      page: {
        type: 'number',
        description: '页码，默认1',
        default: 1,
      },
      pageSize: {
        type: 'number',
        description: '每页数量，默认20',
        default: 20,
      },
      symbol: {
        type: 'string',
        description: '股票代码筛选',
      },
      action: {
        type: 'string',
        description: '信号动作筛选',
        enum: ['buy', 'sell', 'hold'],
      },
      minScore: {
        type: 'number',
        description: '最低分数筛选（-1 到 1）',
      },
      maxScore: {
        type: 'number',
        description: '最高分数筛选（-1 到 1）',
      },
      startTime: {
        type: 'string',
        description: '开始时间筛选，格式: YYYY-MM-DD',
      },
      endTime: {
        type: 'string',
        description: '结束时间筛选，格式: YYYY-MM-DD',
      },
    };

    return {
      name: 'query_signals',
      description: '查询交易信号列表，支持按股票代码、动作、分数和时间范围筛选',
      inputSchema: {
        type: 'object',
        properties,
      },
    };
  }

  async execute(args: Record<string, unknown>): Promise<unknown> {
    this.logger.debug(`[QuerySignalsTool] Executing with args: ${JSON.stringify(args)}`);

    try {
      const result = await this.signalsService.findList({
        page: (args.page as number) || 1,
        pageSize: (args.pageSize as number) || 20,
        symbol: args.symbol as string | undefined,
        action: args.action as SignalAction | undefined,
        minScore: args.minScore as number | undefined,
        maxScore: args.maxScore as number | undefined,
        startTime: args.startTime as string | undefined,
        endTime: args.endTime as string | undefined,
      });

      return {
        data: result.data.map((signal) => ({
          id: signal.id,
          symbol: signal.symbol,
          action: signal.action,
          score: signal.score,
          generatedAt: signal.generatedAt,
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      };
    } catch (error) {
      this.logger.error(`[QuerySignalsTool] Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
