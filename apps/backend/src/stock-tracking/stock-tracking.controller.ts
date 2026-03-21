import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { StockTrackingService, CreateTrackingDto } from './stock-tracking.service.js';
import { BacktestService } from '../backtest/backtest.service.js';
import { BacktestPeriod } from '../backtest/backtest.dto.js';
import { QueueService } from '../queue/queue.service.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('Stock Tracking')
@Controller('stock-trackings')
export class StockTrackingController {
  constructor(
    private readonly stockTrackingService: StockTrackingService,
    private readonly queueService: QueueService,
    private readonly backtestService: BacktestService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取股票追踪列表' })
  @ApiResponse({ status: 200, description: '成功获取追踪列表' })
  async findAll() {
    const data = await this.stockTrackingService.findAll();
    return { data };
  }

  @Post()
  @Public()
  @ApiOperation({ summary: '创建股票追踪' })
  @ApiResponse({ status: 201, description: '成功创建追踪' })
  @ApiResponse({ status: 400, description: '该股票已在追踪列表中' })
  async create(@Body() dto: CreateTrackingDto) {
    try {
      const data = await this.stockTrackingService.create(dto);
      return { data, message: '创建成功' };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : '创建失败');
    }
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '获取追踪详情' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 200, description: '成功获取追踪详情' })
  @ApiResponse({ status: 404, description: '追踪记录不存在' })
  async findById(@Param('id') id: string) {
    const data = await this.stockTrackingService.findById(id);
    if (!data) {
      throw new NotFoundException('追踪记录不存在');
    }
    return { data };
  }

  @Post(':id/fetch-news')
  @Public()
  @ApiOperation({ summary: '获取历史新闻' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 202, description: '新闻获取任务已启动' })
  async fetchNews(@Param('id') id: string) {
    const tracking = await this.stockTrackingService.findById(id);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    // 检查是否已在处理中
    if (tracking.status === 'processing') {
      return {
        message: '新闻获取任务已在进行中',
        trackingId: id,
      };
    }

    // 先发送消息到队列，由消费者处理
    await this.queueService.sendMessage(QUEUE_NAMES.STOCK_TRACK_FETCH, { trackingId: id });

    // 然后更新状态为处理中
    await this.stockTrackingService.updateStatus(id, 'processing');

    return {
      message: '历史新闻获取任务已启动',
      trackingId: id,
    };
  }

  @Post(':id/reset-status')
  @Public()
  @ApiOperation({ summary: '重置追踪状态' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 200, description: '状态重置成功' })
  async resetStatus(@Param('id') id: string) {
    const tracking = await this.stockTrackingService.findById(id);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    await this.stockTrackingService.updateStatus(id, 'pending', 0);

    return {
      message: '状态已重置',
      trackingId: id,
    };
  }

  @Post(':id/generate-signals')
  @Public()
  @ApiOperation({ summary: '生成历史信号' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 202, description: '信号生成任务已启动' })
  async generateSignals(@Param('id') id: string) {
    const tracking = await this.stockTrackingService.findById(id);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    // 获取该追踪的新闻列表并发送到分析队列
    const newsCount = await this.stockTrackingService.queueNewsForAnalysis(id, tracking.stockCode);

    return {
      message: `信号生成任务已启动，${newsCount} 条新闻待分析`,
      trackingId: id,
      newsCount,
    };
  }

  @Post(':id/backtest')
  @Public()
  @ApiOperation({ summary: '执行回测' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 200, description: '回测执行成功' })
  async backtest(@Param('id') id: string) {
    const tracking = await this.stockTrackingService.findById(id);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    // 执行真实回测
    const endTime = new Date();
    const startTime = new Date();
    startTime.setFullYear(startTime.getFullYear() - 1); // 回测最近一年

    const backtestResult = await this.backtestService.runBacktest({
      startTime,
      endTime,
      minConfidence: 70,
      maxConfidence: 100,
      directions: ['bullish', 'bearish'],
      stopLoss: 0.05,
      takeProfit: 0.1,
      period: BacktestPeriod.FOUR_HOURS,
      stockCode: tracking.stockCode, // 只回测当前追踪的股票
    });

    return {
      message: '回测执行成功',
      trackingId: id,
      data: backtestResult,
    };
  }

  @Get(':id/report')
  @Public()
  @ApiOperation({ summary: '获取研投报告' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 200, description: '成功获取研投报告' })
  @ApiResponse({ status: 404, description: '追踪记录不存在' })
  async getReport(@Param('id') id: string) {
    const tracking = await this.stockTrackingService.findById(id);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    const report = await this.stockTrackingService.getResearchReport(id);

    return {
      data: { report },
      message: report ? '获取研投报告成功' : '暂无研投报告',
    };
  }

  @Post(':id/generate-report')
  @Public()
  @ApiOperation({ summary: '生成研投报告' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 200, description: '研投报告生成成功' })
  async generateReport(@Param('id') id: string) {
    const tracking = await this.stockTrackingService.findById(id);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    // 生成研投报告
    const report = await this.stockTrackingService.generateResearchReport(
      id,
      tracking.stockCode,
      tracking.stockName,
    );

    return {
      data: { report },
      message: '研投报告生成成功',
    };
  }

  @Get(':id/news')
  @Public()
  @ApiOperation({ summary: '获取追踪相关的新闻' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 200, description: '成功获取新闻列表' })
  async getTrackingNews(@Param('id') id: string) {
    const tracking = await this.stockTrackingService.findById(id);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    const news = await this.stockTrackingService.getTrackingNews(id, tracking.stockCode);
    return { data: news };
  }

  @Delete(':id')
  @Public()
  @ApiOperation({ summary: '删除股票追踪及其关联数据' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '追踪记录不存在' })
  async delete(@Param('id') id: string) {
    const tracking = await this.stockTrackingService.findById(id);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    await this.stockTrackingService.delete(id);

    return {
      message: '删除成功',
      trackingId: id,
    };
  }
}
