import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import type { McpTool } from '../mcp.types.js';
import { SignalsService } from '../../signals/signals.service.js';

const QueryRecentSignalsSchema = z.object({
  stockCode: z.string().optional().describe('股票代码（可选）'),
  limit: z.number().optional().default(20).describe('返回信号数量限制'),
});

type QueryRecentSignalsInput = z.infer<typeof QueryRecentSignalsSchema>;

interface SignalItem {
  id: string;
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
export class QueryRecentSignalsTool implements McpTool {
  readonly name = 'query_recent_signals';
  readonly description = '查询最近的交易信号，用于获取买入/卖出信号列表';
  readonly inputSchema = QueryRecentSignalsSchema;

  private readonly logger = new Logger(QueryRecentSignalsTool.name);

  constructor(private readonly signalsService: SignalsService) {}

  async execute(input: QueryRecentSignalsInput): Promise<SignalItem[]> {
    this.logger.debug(`[MCP Tool: ${this.name}] Executing with input: ${JSON.stringify(input)}`);

    const result = await this.signalsService.getSignalsList({
      page: 1,
      pageSize: input.limit,
      stockCode: input.stockCode,
    });

    return result.data.map((signal) => ({
      id: signal.id,
      stockCode: signal.stockCode,
      stockName: signal.stockName,
      direction: signal.direction,
      confidence: signal.confidence,
      sentiment: signal.sentiment,
      reasoning: signal.reasoning,
      keyFactors: signal.keyFactors,
      timeWindow: signal.timeWindow,
      signalTime: signal.signalTime,
    }));
  }
}
