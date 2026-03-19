import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum KlinePeriod {
  ONE_DAY = '1d',
  FOUR_HOURS = '4h',
}

export class KlinesQueryDto {
  @ApiPropertyOptional({ description: 'K线周期', enum: KlinePeriod, default: KlinePeriod.ONE_DAY })
  @IsOptional()
  @IsEnum(KlinePeriod)
  period?: KlinePeriod = KlinePeriod.ONE_DAY;

  @ApiPropertyOptional({ description: '开始时间 (ISO 8601)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间 (ISO 8601)' })
  @IsOptional()
  @IsString()
  endTime?: string;
}
