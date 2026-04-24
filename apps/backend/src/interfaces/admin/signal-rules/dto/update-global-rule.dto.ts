import { IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGlobalRuleDto {
  @ApiPropertyOptional({ description: '乘数' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  multiplier?: number;

  @ApiPropertyOptional({ description: '阈值' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number;

  @ApiPropertyOptional({ description: '是否启用惊喜值' })
  @IsOptional()
  @IsBoolean()
  enableSurprise?: boolean;

  @ApiPropertyOptional({ description: '是否启用置信度' })
  @IsOptional()
  @IsBoolean()
  enableConfidence?: boolean;
}
