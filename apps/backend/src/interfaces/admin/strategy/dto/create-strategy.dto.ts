import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DirectionMode } from './strategy-list-query.dto.js';

export enum EntryMode {
  NEXT_OPEN = 'next_open',
}

export class CreateStrategyDto {
  @ApiProperty({ description: '策略名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '策略描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @ApiProperty({ description: '最低分数阈值' })
  @IsNumber()
  @Min(0)
  minScore: number;

  @ApiPropertyOptional({ description: '最高分数阈值' })
  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @ApiPropertyOptional({ description: '允许的规则 ID 列表' })
  @IsOptional()
  @IsArray()
  allowedRuleIds?: string[];

  @ApiPropertyOptional({ description: '允许的事件类别列表' })
  @IsOptional()
  @IsArray()
  allowedCategories?: string[];

  @ApiProperty({ description: '方向模式', enum: DirectionMode })
  @IsEnum(DirectionMode)
  directionMode: DirectionMode;

  @ApiPropertyOptional({ description: '入场模式', enum: EntryMode, default: EntryMode.NEXT_OPEN })
  @IsOptional()
  @IsEnum(EntryMode)
  entryMode?: EntryMode = EntryMode.NEXT_OPEN;

  @ApiProperty({ description: '持仓周期' })
  @IsNumber()
  @Min(1)
  holdPeriod: number;

  @ApiPropertyOptional({ description: '止损百分比' })
  @IsOptional()
  @IsNumber()
  stopLossPct?: number;

  @ApiPropertyOptional({ description: '止盈百分比' })
  @IsOptional()
  @IsNumber()
  takeProfitPct?: number;

  @ApiPropertyOptional({ description: '每日最大信号数' })
  @IsOptional()
  @IsNumber()
  maxSignalsPerDay?: number;

  @ApiPropertyOptional({ description: '最大持仓数' })
  @IsOptional()
  @IsNumber()
  maxPositions?: number;

  @ApiPropertyOptional({ description: '绑定的 Webhook ID' })
  @IsOptional()
  @IsString()
  webhookId?: string;
}
