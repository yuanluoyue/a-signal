import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { StocksService } from './stocks.service.js';

@ApiTags('Stocks')
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get()
  @ApiOperation({ summary: '获取有信号的股票列表' })
  @ApiResponse({ status: 200, description: '成功获取股票列表' })
  async findAll() {
    const data = await this.stocksService.findAllWithSignals();
    return { data };
  }

  @Get(':code')
  @ApiOperation({ summary: '获取股票详情' })
  @ApiParam({ name: 'code', description: '股票代码' })
  @ApiResponse({ status: 200, description: '成功获取股票详情' })
  @ApiResponse({ status: 404, description: '股票不存在或在黑名单中' })
  async findByCode(@Param('code') code: string) {
    const data = await this.stocksService.findByCode(code);
    if (!data) {
      throw new NotFoundException('股票不存在或在黑名单中');
    }
    return { data };
  }

  @Get(':code/signals')
  @ApiOperation({ summary: '获取股票历史信号' })
  @ApiParam({ name: 'code', description: '股票代码' })
  @ApiResponse({ status: 200, description: '成功获取历史信号' })
  async findSignals(@Param('code') code: string) {
    const data = await this.stocksService.findSignalsByCode(code);
    return { data };
  }

  @Get(':code/klines')
  @ApiOperation({ summary: '获取股票 K 线数据' })
  @ApiParam({ name: 'code', description: '股票代码' })
  @ApiResponse({ status: 200, description: '成功获取 K 线数据' })
  async findKlines(
    @Param('code') code: string,
    @Query('period') period: '1d' | '4h' = '4h',
    @Query('limit') limit: number = 100,
  ) {
    const data = await this.stocksService.findKlinesByCode(code, period, limit);
    return { data, stockCode: code, period };
  }

  @Post(':code/fetch-klines')
  @ApiOperation({ summary: '触发获取股票 K 线数据任务' })
  @ApiParam({ name: 'code', description: '股票代码' })
  @ApiResponse({ status: 200, description: '成功提交 K 线获取任务' })
  async fetchKlines(
    @Param('code') code: string,
    @Body() body: { period?: '1d' | '4h' },
  ) {
    const period = body.period || '4h';
    // 发送任务到队列
    await this.stocksService.requestKlinesFetch(code, period);
    return { message: 'K线获取任务已提交', stockCode: code, period };
  }
}
