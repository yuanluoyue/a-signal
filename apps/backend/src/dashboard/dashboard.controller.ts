import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { DashboardStatsResponse, RecentSignalsResponse } from './dashboard.dto.js';

@ApiTags('仪表盘')
@Controller('dashboard')
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: '获取仪表盘统计数据',
    description: '获取新闻、信号、Webhook等统计数据',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取统计数据',
    type: DashboardStatsResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async getStats(): Promise<DashboardStatsResponse> {
    return this.dashboardService.getStats();
  }

  @Get('recent-signals')
  @ApiOperation({
    summary: '获取最近信号',
    description: '获取最近生成的交易信号列表',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '返回数量限制（默认10条）',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取最近信号',
    type: RecentSignalsResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async getRecentSignals(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<RecentSignalsResponse> {
    const signals = await this.dashboardService.getRecentSignals(limit);
    return {
      data: signals,
      total: signals.length,
    };
  }
}
