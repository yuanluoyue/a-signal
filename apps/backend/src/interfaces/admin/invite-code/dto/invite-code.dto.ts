import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateInviteCodeDto {
  @ApiPropertyOptional({ description: '过期时间（小时）', default: 72 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  expiresInHours?: number;
}

export class QueryInviteCodesDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  pageSize?: number = 20;
}
