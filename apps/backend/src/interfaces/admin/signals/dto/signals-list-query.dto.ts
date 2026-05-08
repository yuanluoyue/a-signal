import { IsOptional, IsString, IsEnum, IsInt, Min, IsNumber, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SignalAction {
  BUY = 'buy',
  SELL = 'sell',
  HOLD = 'hold',
}

export class SignalsListQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: '股票代码' })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({ description: '信号动作', enum: SignalAction })
  @IsOptional()
  @IsEnum(SignalAction)
  action?: SignalAction;

  @ApiPropertyOptional({ description: '最小分数 (-1 到 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-1)
  @Max(1)
  minScore?: number;

  @ApiPropertyOptional({ description: '最大分数 (-1 到 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-1)
  @Max(1)
  maxScore?: number;

  @ApiPropertyOptional({ description: '开始时间 (ISO 8601)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间 (ISO 8601)' })
  @IsOptional()
  @IsString()
  endTime?: string;
}
