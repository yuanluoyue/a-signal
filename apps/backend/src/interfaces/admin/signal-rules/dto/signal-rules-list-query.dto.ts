import { IsOptional, IsString, IsInt, Min, IsBoolean, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export enum SignalRuleType {
  GLOBAL = 'global',
  SPECIFIC = 'specific',
}

export class SignalRulesListQueryDto {
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

  @ApiPropertyOptional({ description: '规则类型', enum: SignalRuleType })
  @IsOptional()
  @IsEnum(SignalRuleType)
  type?: SignalRuleType;

  @ApiPropertyOptional({ description: '事件类型' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  enabled?: boolean;
}
