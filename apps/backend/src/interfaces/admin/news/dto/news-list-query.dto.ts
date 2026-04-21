import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AnalyzeStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  ANALYZED = 'analyzed',
  FAILED = 'failed',
}

export enum VectorizeStatus {
  PENDING = 'pending',
  VECTORIZING = 'vectorizing',
  VECTORIZED = 'vectorized',
  FAILED = 'failed',
}

export class NewsListQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '新闻来源' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: '分析状态', enum: AnalyzeStatus })
  @IsOptional()
  @IsEnum(AnalyzeStatus)
  analyzeStatus?: AnalyzeStatus;

  @ApiPropertyOptional({ description: '向量化状态', enum: VectorizeStatus })
  @IsOptional()
  @IsEnum(VectorizeStatus)
  vectorizeStatus?: VectorizeStatus;
}
