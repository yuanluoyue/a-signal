import { IsString, IsNumber, IsOptional, IsEnum, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TradeType {
  BUY = 'buy',
  SELL = 'sell',
}

export class CreateAccountDto {
  @ApiPropertyOptional({ description: '初始资金', example: 100000, default: 100000 })
  @IsNumber()
  @IsOptional()
  initialCapital?: number;
}

export class UpdateAccountDto {
  @ApiPropertyOptional({ description: '当前总资金' })
  @IsNumber()
  @IsOptional()
  currentCapital?: number;

  @ApiPropertyOptional({ description: '可用现金' })
  @IsNumber()
  @IsOptional()
  availableCash?: number;
}

export class ExecuteTradeDto {
  @ApiProperty({ description: '股票代码', example: '000001' })
  @IsString()
  @MaxLength(20)
  stockCode: string;

  @ApiProperty({ description: '股票名称', example: '平安银行' })
  @IsString()
  @MaxLength(50)
  stockName: string;

  @ApiProperty({ description: '交易类型', enum: TradeType })
  @IsEnum(TradeType)
  type: TradeType;

  @ApiProperty({ description: '交易数量', example: 100 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: '交易价格', example: 10.5 })
  @IsNumber()
  @Min(0)
  price: number;
}

export class AddPositionDto {
  @ApiProperty({ description: '股票代码', example: '000001' })
  @IsString()
  @MaxLength(20)
  stockCode: string;

  @ApiProperty({ description: '股票名称', example: '平安银行' })
  @IsString()
  @MaxLength(50)
  stockName: string;

  @ApiProperty({ description: '持仓数量', example: 100 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: '平均成本', example: 10.5 })
  @IsNumber()
  @Min(0)
  avgCost: number;
}
