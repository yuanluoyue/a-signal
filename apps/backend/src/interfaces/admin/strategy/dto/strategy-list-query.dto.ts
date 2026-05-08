import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DirectionMode {
  LONG_ONLY = 'long_only',
  SHORT_ONLY = 'short_only',
  BOTH = 'both',
}

export class StrategyListQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数', default: 10 })
  @IsOptional()
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '方向模式', enum: DirectionMode })
  @IsOptional()
  @IsEnum(DirectionMode)
  directionMode?: DirectionMode;
}
