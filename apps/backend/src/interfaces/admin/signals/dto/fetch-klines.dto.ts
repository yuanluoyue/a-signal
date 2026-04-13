import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum KlinePeriod {
  ONE_DAY = '1d',
  FOUR_HOURS = '4h',
}

export class FetchKlinesDto {
  @ApiProperty({ description: 'K线周期', enum: KlinePeriod })
  @IsEnum(KlinePeriod)
  period: KlinePeriod;
}
