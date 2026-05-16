import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { StockTrackingService } from '../../../modules/stock-tracking/stock-tracking.service.js';
import { CreateTrackingDto } from './dto/index.js';
import { QueueService } from '../../../core/queue/queue.service.js';
import { QUEUE_NAMES } from '../../../core/queue/queue.constants.js';

@ApiTags('Stock Tracking')
@Controller('stock-trackings')
@ApiBearerAuth()
export class StockTrackingController {
  constructor(
    private readonly stockTrackingService: StockTrackingService,
    private readonly queueService: QueueService,
  ) {}

  private extractUserId(req: { user?: { userId: string; sub?: string } }): string {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }
    return userId;
  }

  @Get()
  @ApiOperation({ summary: '获取股票追踪列表' })
  @ApiResponse({ status: 200, description: '成功获取追踪列表' })
  async findAll(@Request() req: { user?: { userId: string; sub?: string } }) {
    const userId = this.extractUserId(req);
    const data = await this.stockTrackingService.findAll(userId);
    return { data };
  }

  @Post()
  @ApiOperation({ summary: '创建股票追踪' })
  @ApiResponse({ status: 201, description: '成功创建追踪' })
  @ApiResponse({ status: 400, description: '该股票已在追踪列表中' })
  async create(
    @Body() dto: CreateTrackingDto,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    try {
      const data = await this.stockTrackingService.create(dto, userId);
      return { data, message: '创建成功' };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : '创建失败');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取追踪详情' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 200, description: '成功获取追踪详情' })
  @ApiResponse({ status: 404, description: '追踪记录不存在' })
  async findById(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const data = await this.stockTrackingService.findById(id, userId);
    if (!data) {
      throw new NotFoundException('追踪记录不存在');
    }
    return { data };
  }

  @Post(':id/fetch-news')
  @ApiOperation({ summary: '获取历史新闻' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 202, description: '新闻获取任务已启动' })
  async fetchNews(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const tracking = await this.stockTrackingService.findById(id, userId);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    if (tracking.status === 'processing') {
      return {
        message: '新闻获取任务已在进行中',
        trackingId: id,
      };
    }

    await this.queueService.sendMessage(QUEUE_NAMES.STOCK_TRACK_FETCH, { trackingId: id, userId });

    await this.stockTrackingService.updateStatus(id, userId, 'processing');

    return {
      message: '历史新闻获取任务已启动',
      trackingId: id,
    };
  }

  @Post(':id/reset-status')
  @ApiOperation({ summary: '重置追踪状态' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 200, description: '状态重置成功' })
  async resetStatus(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const tracking = await this.stockTrackingService.findById(id, userId);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    await this.stockTrackingService.updateStatus(id, userId, 'pending', 0);

    return {
      message: '状态已重置',
      trackingId: id,
    };
  }

  @Post(':id/generate-signals')
  @ApiOperation({ summary: '生成历史信号' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 202, description: '信号生成任务已启动' })
  async generateSignals(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const tracking = await this.stockTrackingService.findById(id, userId);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    const newsCount = await this.stockTrackingService.queueNewsForAnalysis(id, tracking.stockCode);

    return {
      message: `信号生成任务已启动，${newsCount} 条新闻待分析`,
      trackingId: id,
      newsCount,
    };
  }

  @Get(':id/report')
  @ApiOperation({ summary: '获取研投报告' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 200, description: '成功获取研投报告' })
  @ApiResponse({ status: 404, description: '追踪记录不存在' })
  async getReport(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const tracking = await this.stockTrackingService.findById(id, userId);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    const report = await this.stockTrackingService.getResearchReport(id, userId);

    return {
      data: { report },
      message: report ? '获取研投报告成功' : '暂无研投报告',
    };
  }

  @Post(':id/generate-report')
  @ApiOperation({ summary: '生成研投报告' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 200, description: '研投报告生成成功' })
  async generateReport(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const tracking = await this.stockTrackingService.findById(id, userId);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    const report = await this.stockTrackingService.generateResearchReport(
      id,
      tracking.stockCode,
      tracking.stockName,
      userId,
    );

    return {
      data: { report },
      message: '研投报告生成成功',
    };
  }

  @Get(':id/news')
  @ApiOperation({ summary: '获取追踪相关的新闻' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 200, description: '成功获取新闻列表' })
  async getTrackingNews(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const tracking = await this.stockTrackingService.findById(id, userId);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    const news = await this.stockTrackingService.getTrackingNews(id, tracking.stockCode);
    return { data: news };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除股票追踪及其关联数据' })
  @ApiParam({ name: 'id', description: '追踪 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '追踪记录不存在' })
  async delete(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const tracking = await this.stockTrackingService.findById(id, userId);
    if (!tracking) {
      throw new NotFoundException('追踪记录不存在');
    }

    await this.stockTrackingService.delete(id, userId);

    return {
      message: '删除成功',
      trackingId: id,
    };
  }
}
