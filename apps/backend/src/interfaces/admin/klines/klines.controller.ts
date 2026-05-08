import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
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

  @Post('check-and-update/:stockCode')
  @Public()
  @ApiOperation({ summary: '检查并更新K线数据' })
  @ApiParam({ name: 'stockCode', description: '股票代码' })
  @ApiQuery({ name: 'period', required: false, description: 'K线周期，不传则同时更新日线和4小时线', enum: ['1d', '4h'] })
  @ApiResponse({ status: 200, description: '检查并更新结果' })
  async checkAndUpdateKlines(
    @Param('stockCode') stockCode: string,
    @Query('period') period?: KlinePeriod,
  ) {
    if (period) {
      const result = await this.klinesService.checkAndUpdateKlines(stockCode, period);
      return result;
    }

    const results: Record<KlinePeriod, { updated: boolean; latestTime: Date | null; message: string }> = {
      '1d': await this.klinesService.checkAndUpdateKlines(stockCode, '1d'),
      '4h': await this.klinesService.checkAndUpdateKlines(stockCode, '4h'),
    };

    return {
      stockCode,
      results,
    };
  }

  @Post('check-and-update-batch')
  @Public()
  @ApiOperation({ summary: '批量检查并更新多个股票的K线数据' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        stockCodes: {
          type: 'array',
          items: { type: 'string' },
          description: '股票代码列表',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: '批量更新结果' })
  async checkAndUpdateKlinesBatch(@Body('stockCodes') stockCodes: string[]) {
    const result = await this.klinesService.checkAndUpdateKlinesForBacktest(stockCodes);
    return {
      stockCodes,
      ...result,
    };
  }
}
