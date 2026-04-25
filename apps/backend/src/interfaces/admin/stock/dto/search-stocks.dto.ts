import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class SearchStocksDto {
  @ApiProperty({
    description: '搜索关键词（股票代码或名称）',
    example: '平安',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  keyword: string;

  @ApiProperty({
    description: '返回结果数量限制',
    default: 20,
    required: false,
  })
  @IsOptional()
  limit?: number;
}
