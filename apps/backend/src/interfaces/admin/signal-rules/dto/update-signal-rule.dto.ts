import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSignalRuleDto {
  @ApiPropertyOptional({ description: '规则名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '事件类型' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

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

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;
}
