import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsArray, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DirectionMode } from './strategy-list-query.dto.js';
import { EntryMode } from './create-strategy.dto.js';

export class UpdateStrategyDto {
  @ApiPropertyOptional({ description: '策略名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '策略描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '最低分数阈值' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minScore?: number;

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

  @ApiPropertyOptional({ description: '方向模式', enum: DirectionMode })
  @IsOptional()
  @IsEnum(DirectionMode)
  directionMode?: DirectionMode;

  @ApiPropertyOptional({ description: '入场模式', enum: EntryMode })
  @IsOptional()
  @IsEnum(EntryMode)
  entryMode?: EntryMode;

  @ApiPropertyOptional({ description: '持仓周期' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  holdPeriod?: number;

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
}
