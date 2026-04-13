import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlacklistDto {
  @ApiProperty({ description: '股票代码', example: '000001' })
  @IsString()
  @MaxLength(20)
  stockCode: string;

  @ApiProperty({ description: '股票名称', example: '平安银行' })
  @IsString()
  @MaxLength(50)
  stockName: string;

  @ApiPropertyOptional({ description: '加入黑名单原因', example: 'ST股票' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
