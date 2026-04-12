import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { KlinesService, KlinePeriod } from '../../../modules/klines/klines.service.js';
import { Public } from '../../../common/decorators/public.decorator.js';

@ApiTags('Klines')
@Controller('klines')
export class KlinesController {
  constructor(private readonly klinesService: KlinesService) {}

  @Get(':stockCode')
  @Public()
  @ApiOperation({ summary: '获取股票K线数据' })
  @ApiParam({ name: 'stockCode', description: '股票代码' })
  @ApiQuery({ name: 'period', required: false, description: 'K线周期', enum: ['1d', '4h'] })
  @ApiResponse({ status: 200, description: '成功获取K线数据' })
  async getKlines(
    @Param('stockCode') stockCode: string,
    @Query('period') period: KlinePeriod = '1d',
  ) {
    const klines = await this.klinesService.getKlines(stockCode, period);
    return {
      data: klines,
      total: klines.length,
    };
  }
}
