import { IsDate, IsString, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StrategyBacktestRequestDto {
  @ApiProperty({ description: '策略 ID' })
  @IsUUID()
  strategyId: string;

  @ApiProperty({ description: '开始时间', example: '2024-01-01T00:00:00Z' })
  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @ApiProperty({ description: '结束时间', example: '2024-12-31T23:59:59Z' })
  @IsDate()
  @Type(() => Date)
  endTime: Date;

  @ApiPropertyOptional({ description: '回测名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '股票代码（可选，用于限制特定股票的回测）' })
  @IsOptional()
  @IsString()
  stockCode?: string;
}

export class QueryBacktestRecordsDto {
  @ApiPropertyOptional({ description: '股票代码（可选，用于过滤特定股票的回测记录）' })
  @IsOptional()
  @IsString()
  stockCode?: string;

  @ApiPropertyOptional({ description: '策略 ID（可选，用于过滤特定策略的回测记录）' })
  @IsOptional()
  @IsUUID()
  strategyId?: string;
}

export interface BacktestTradeResult {
  signalId: string | null;
  eventId: string | null;
  symbol: string;
  stockName: string | null;
  direction: string;
  entryTime: Date;
  entryPrice: number;
  exitTime: Date | null;
  exitPrice: number | null;
  pnlPct: number | null;
  signalScore: string | null;
  signalRuleId: string | null;
  signalReason: string | null;
  exitReason: 'hold_period' | 'stop_loss' | 'take_profit' | null;
  stopLossPrice: number | null;
  takeProfitPrice: number | null;
}

export interface BacktestStatistics {
  totalSignals: number;
  filteredSignals: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturnPct: number;
  avgReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number | null;
  profitFactor: number | null;
  avgHoldingPeriod: number | null;
  equityCurve: Array<{ time: string; equity: number }>;
}
