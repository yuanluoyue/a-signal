import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BacktestService } from './backtest.service.js';
import { BacktestRequestDto, BacktestResponse } from './backtest.dto.js';

@ApiTags('回测分析')
@Controller('backtest')
@ApiBearerAuth()
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  @Post()
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
}
