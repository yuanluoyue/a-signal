import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class LlmLogQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: '模块筛选' })
  @IsString()
  @IsOptional()
  module?: string;

  @ApiPropertyOptional({ description: '任务筛选' })
  @IsString()
  @IsOptional()
  task?: string;

  @ApiPropertyOptional({ description: 'Provider 筛选' })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional({ description: '模型筛选' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ description: '是否成功筛选' })
  @IsString()
  @IsOptional()
  success?: string;

  @ApiPropertyOptional({ description: '开始日期' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsString()
  @IsOptional()
  endDate?: string;
}
