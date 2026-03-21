import { IsDate, IsNumber, IsString, IsArray, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum BacktestPeriod {
  FOUR_HOURS = '4h',
  ONE_DAY = '1d',
}

export class BacktestRequestDto {
  @ApiProperty({ description: '开始时间', example: '2024-01-01T00:00:00Z' })
  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @ApiProperty({ description: '结束时间', example: '2024-12-31T23:59:59Z' })
  @IsDate()
  @Type(() => Date)
  endTime: Date;

  @ApiProperty({ description: '最小置信度 (0-100)', example: 70, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  minConfidence: number;

  @ApiProperty({ description: '最大置信度 (0-100)', example: 100, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  maxConfidence: number;

  @ApiProperty({ description: '信号类型', example: ['buy', 'sell'], enum: ['buy', 'sell'] })
  @IsArray()
  @IsString({ each: true })
  directions: string[];

  @ApiProperty({ description: '止损比例 (如 0.05 表示5%)', example: 0.05, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  stopLoss: number;

  @ApiProperty({ description: '止盈比例 (如 0.1 表示10%)', example: 0.1, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  takeProfit: number;

  @ApiProperty({ description: 'K线周期', enum: BacktestPeriod, default: BacktestPeriod.FOUR_HOURS })
  @IsEnum(BacktestPeriod)
  @IsOptional()
  period?: BacktestPeriod;

  @ApiProperty({ description: '股票代码（可选，用于限制特定股票的回测）', example: '000001', required: false })
  @IsString()
  @IsOptional()
  stockCode?: string;
}

export class QueryBacktestRecordsDto {
  @ApiProperty({ description: '股票代码（可选，用于过滤特定股票的回测记录）', example: '000001', required: false })
  @IsString()
  @IsOptional()
  stockCode?: string;
}

export interface TradeResult {
  signalId: string;
  stockCode: string;
  stockName: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  return: number;
  exitReason: 'takeProfit' | 'stopLoss' | 'timeExpired';
  entryTime: Date;
  exitTime: Date;
}

export interface BacktestResponse {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  avgReturn: number;
  trades: TradeResult[];
}
