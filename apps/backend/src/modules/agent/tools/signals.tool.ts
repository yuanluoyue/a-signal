import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool } from './base.tool.js';
import { SignalsService } from '../../signals/signals.service.js';

const GetSignalsByDateRangeSchema = z.object({
  startDate: z.string().describe('开始日期，格式: YYYY-MM-DD'),
  endDate: z.string().describe('结束日期，格式: YYYY-MM-DD'),
  stockCode: z.string().optional().describe('股票代码（可选）'),
  limit: z.number().optional().default(20).describe('返回数量限制'),
});

type GetSignalsByDateRangeInput = z.infer<typeof GetSignalsByDateRangeSchema>;

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
export class GetSignalsByDateRangeTool extends BaseTool<GetSignalsByDateRangeInput, SignalItem[]> {
  readonly name = 'get_signals_by_date_range';
  readonly description = '按日期范围查询交易信号，用于获取特定时间段内的买入/卖出信号';
  readonly inputSchema = GetSignalsByDateRangeSchema;

  private readonly logger = new Logger(GetSignalsByDateRangeTool.name);

  constructor(private readonly signalsService: SignalsService) {
    super();
  }

  async execute(input: GetSignalsByDateRangeInput): Promise<SignalItem[]> {
    try {
      this.logger.debug(`[GetSignalsByDateRangeTool] Executing with input: ${JSON.stringify(input)}`);

      const result = await this.signalsService.findList({
        page: 1,
        pageSize: input.limit,
        stockCode: input.stockCode,
        startTime: input.startDate,
        endTime: input.endDate,
      });

      return result.data.map((signal) => ({
        id: signal.id,
        stockCode: signal.stockCode ?? '',
        stockName: signal.stockName ?? '',
        direction: signal.direction ?? '',
        confidence: signal.confidence ?? 0,
        sentiment: signal.sentiment ?? '',
        reasoning: signal.reasoning ?? '',
        keyFactors: Array.isArray(signal.keyFactors) ? signal.keyFactors : [],
        timeWindow: signal.timeWindow ?? '',
        signalTime: signal.signalTime ?? new Date(),
      }));
    } catch (error) {
      this.logger.error(`[GetSignalsByDateRangeTool] Error: ${this.formatError(error)}`);
      throw error;
    }
  }
}
