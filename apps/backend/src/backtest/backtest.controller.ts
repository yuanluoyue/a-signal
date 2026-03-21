import { Controller, Post, Get, Delete, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BacktestService } from './backtest.service.js';
import { BacktestRequestDto, BacktestResponse, QueryBacktestRecordsDto } from './backtest.dto.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('回测分析')
@Controller('backtest')
@ApiBearerAuth()
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  @Post()
  @Public()
  @ApiOperation({
    summary: '执行回测',
    description: '根据信号和K线数据执行回测分析，计算收益率、胜率等指标',
  })
  @ApiResponse({
    status: 200,
    description: '回测成功',
    type: Object,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  async runBacktest(@Body() dto: BacktestRequestDto): Promise<BacktestResponse> {
    return this.backtestService.runBacktest(dto);
  }

  @Get('records')
  @Public()
  @ApiOperation({ summary: '获取回测记录列表' })
  @ApiQuery({ name: 'stockCode', required: false, description: '股票代码（可选，用于过滤特定股票的回测记录）' })
  @ApiResponse({ status: 200, description: '成功获取回测记录列表' })
  async getRecords(@Query() query: QueryBacktestRecordsDto) {
    const data = await this.backtestService.findAllRecords(query.stockCode);
    return { data };
  }

  @Get('records/:id')
  @Public()
  @ApiOperation({ summary: '获取回测记录详情' })
  @ApiParam({ name: 'id', description: '回测记录 ID' })
  @ApiResponse({ status: 200, description: '成功获取回测记录详情' })
  @ApiResponse({ status: 404, description: '回测记录不存在' })
  async getRecordById(@Param('id') id: string) {
    const data = await this.backtestService.findRecordById(id);
    if (!data) {
      throw new NotFoundException('回测记录不存在');
    }
    return { data };
  }

  @Delete('records/:id')
  @Public()
  @ApiOperation({ summary: '删除回测记录' })
  @ApiParam({ name: 'id', description: '回测记录 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '回测记录不存在' })
  async deleteRecord(@Param('id') id: string) {
    const record = await this.backtestService.findRecordById(id);
    if (!record) {
      throw new NotFoundException('回测记录不存在');
    }

    await this.backtestService.deleteRecord(id);

    return {
      message: '删除成功',
      recordId: id,
    };
  }
}
