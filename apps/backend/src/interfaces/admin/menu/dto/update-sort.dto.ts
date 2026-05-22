import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSortDto {
  @ApiProperty({ description: '排序权重' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sort: number;
}
