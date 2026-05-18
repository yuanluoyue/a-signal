import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TradingAgentDecisionsQueryDto {
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

  @ApiPropertyOptional({ description: '决策结果: approved / rejected' })
  @IsOptional()
  @IsString()
  decision?: string;

  @ApiPropertyOptional({ description: '风险等级: low / medium / high / critical' })
  @IsOptional()
  @IsString()
  riskLevel?: string;
}
