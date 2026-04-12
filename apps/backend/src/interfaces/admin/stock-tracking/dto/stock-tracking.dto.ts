import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTrackingDto {
  @ApiProperty({ description: '股票代码', example: '000001' })
  @IsString()
  @MaxLength(20)
  stockCode: string;

  @ApiProperty({ description: '股票名称', example: '平安银行' })
  @IsString()
  @MaxLength(50)
  stockName: string;
}
