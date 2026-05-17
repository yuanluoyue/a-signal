import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TradingMemoryListQueryDto {
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

  @ApiPropertyOptional({ description: '经验类型: event_pattern / signal_pattern / strategy_pattern / market_regime_pattern / risk_pattern' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: '状态: testing / active / dormant / invalidated' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '关键词搜索' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
