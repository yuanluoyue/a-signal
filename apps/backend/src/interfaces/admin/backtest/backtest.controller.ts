import { Controller, Post, Get, Delete, Body, Param, Query, NotFoundException, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BacktestService } from '../../../modules/backtest/backtest.service.js';
import { StrategyBacktestRequestDto, QueryBacktestRecordsDto } from './dto/backtest.dto.js';

@ApiTags('回测分析')
@Controller('backtest')
@ApiBearerAuth()
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  private extractUserId(req: { user?: { userId: string; sub?: string } }): string {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }
    return userId;
  }

  @Post()
  @ApiOperation({
    summary: '创建回测任务',
    description: '创建回测任务，立即返回 running 状态的记录，后台异步执行回测',
  })
  @ApiResponse({ status: 201, description: '回测任务创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async createBacktest(
    @Body() dto: StrategyBacktestRequestDto,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const data = await this.backtestService.createBacktest(dto, userId);
    return { data };
  }

  @Get('records')
  @ApiOperation({ summary: '获取回测记录列表' })
  @ApiResponse({ status: 200, description: '成功获取回测记录列表' })
  async getRecords(
    @Query() query: QueryBacktestRecordsDto,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const data = await this.backtestService.findAllRecords(userId, query.stockCode, query.strategyId);
    return { data };
  }

  @Get('records/:id')
  @ApiOperation({ summary: '获取回测记录详情' })
  @ApiParam({ name: 'id', description: '回测记录 ID' })
  @ApiResponse({ status: 200, description: '成功获取回测记录详情' })
  @ApiResponse({ status: 404, description: '回测记录不存在' })
  async getRecordById(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const data = await this.backtestService.findRecordById(id, userId);
    if (!data) {
      throw new NotFoundException('回测记录不存在');
    }
    return { data };
  }

  @Get('records/:id/trades')
  @ApiOperation({ summary: '获取回测交易明细' })
  @ApiParam({ name: 'id', description: '回测记录 ID' })
  @ApiResponse({ status: 200, description: '成功获取交易明细' })
  async getRecordTrades(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const record = await this.backtestService.findRecordById(id, userId);
    if (!record) {
      throw new NotFoundException('回测记录不存在');
    }
    const data = await this.backtestService.findTradesByBacktestId(id, userId);
    return { data };
  }

  @Delete('records/:id')
  @ApiOperation({ summary: '删除回测记录' })
  @ApiParam({ name: 'id', description: '回测记录 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '回测记录不存在' })
  async deleteRecord(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const record = await this.backtestService.findRecordById(id, userId);
    if (!record) {
      throw new NotFoundException('回测记录不存在');
    }

    await this.backtestService.deleteRecord(id, userId);

    return {
      message: '删除成功',
      recordId: id,
    };
  }
}
