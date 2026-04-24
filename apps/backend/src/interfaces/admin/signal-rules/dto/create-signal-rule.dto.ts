import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SignalRuleType } from './signal-rules-list-query.dto.js';

export class CreateSignalRuleDto {
  @ApiProperty({ description: '规则名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '规则类型', enum: SignalRuleType })
  @IsEnum(SignalRuleType)
  type: SignalRuleType;

  @ApiPropertyOptional({ description: '事件类型' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @ApiPropertyOptional({ description: '乘数', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  multiplier?: number = 1;

  @ApiPropertyOptional({ description: '阈值', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number = 0;

  @ApiPropertyOptional({ description: '是否启用惊喜值', default: false })
  @IsOptional()
  @IsBoolean()
  enableSurprise?: boolean = false;

  @ApiPropertyOptional({ description: '是否启用置信度', default: false })
  @IsOptional()
  @IsBoolean()
  enableConfidence?: boolean = false;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;
}
