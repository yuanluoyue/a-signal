import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { SignalsService } from '../../../modules/signals/signals.service.js';
import { KlinesService } from '../../../modules/klines/klines.service.js';
import { QueueService } from '../../../core/queue/queue.service.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { SignalsListQueryDto } from './dto/signals-list-query.dto.js';
import { KlinesQueryDto } from './dto/klines-query.dto.js';
import { FetchKlinesDto } from './dto/fetch-klines.dto.js';
import { QUEUE_NAMES } from '../../../core/queue/queue.constants.js';

@ApiTags('信号管理')
@Controller('signals')
@ApiBearerAuth()
export class SignalsController {
  constructor(
    private readonly signalsService: SignalsService,
    private readonly klinesService: KlinesService,
    private readonly queueService: QueueService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取信号列表（支持分页和筛选）' })
  @ApiResponse({ status: 200, description: '成功获取信号列表' })
  async findList(@Query() query: SignalsListQueryDto) {
    const result = await this.signalsService.findList(query);
    return result;
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '根据 ID 获取信号详情' })
  @ApiParam({ name: 'id', description: '信号 ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取信号详情' })
  @ApiResponse({ status: 404, description: '信号不存在' })
  async getSignalById(@Param('id') id: string) {
    const signal = await this.signalsService.findById(id);
    if (!signal) {
      throw new NotFoundException('信号不存在');
    }
    return {
      data: signal,
    };
  }

  @Get(':id/klines')
  @Public()
  @ApiOperation({ summary: '获取信号关联的K线数据' })
  @ApiParam({ name: 'id', description: '信号 ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取K线数据' })
  @ApiResponse({ status: 404, description: '信号不存在' })
  async getSignalKlines(
    @Param('id') id: string,
    @Query() query: KlinesQueryDto,
  ) {
    const signal = await this.signalsService.findById(id);
    if (!signal) {
      throw new NotFoundException('信号不存在');
    }

    const { period, startTime, endTime } = query;
    const startDate = startTime ? new Date(startTime) : undefined;
    const endDate = endTime ? new Date(endTime) : undefined;

    const klines = await this.klinesService.getKlines(
      signal.symbol ?? signal.stockCode ?? '',
      period as '1d' | '4h',
      startDate,
      endDate,
    );

    return {
      data: klines,
      total: klines.length,
      symbol: signal.symbol ?? signal.stockCode ?? '',
      period,
    };
  }

  @Post(':id/fetch-klines')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: '手动触发获取K线数据任务' })
  @ApiParam({ name: 'id', description: '信号 ID', type: String })
  @ApiResponse({ status: 202, description: 'K线获取任务已提交到队列' })
  @ApiResponse({ status: 404, description: '信号不存在' })
  async fetchKlines(
    @Param('id') id: string,
    @Body() dto: FetchKlinesDto,
  ) {
    const signal = await this.signalsService.findById(id);
    if (!signal) {
      throw new NotFoundException('信号不存在');
    }

    await this.queueService.sendMessage(QUEUE_NAMES.KLINE_FETCH, {
      symbol: signal.symbol,
      period: dto.period,
    });

    return {
      message: 'K线获取任务已提交到队列',
      signalId: id,
      symbol: signal.symbol,
      period: dto.period,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除信号' })
  @ApiParam({ name: 'id', description: '信号 ID', type: String })
  @ApiResponse({ status: 200, description: '信号已删除' })
  @ApiResponse({ status: 404, description: '信号不存在' })
  async deleteSignal(@Param('id') id: string) {
    const signal = await this.signalsService.findById(id);
    if (!signal) {
      throw new NotFoundException('信号不存在');
    }

    await this.signalsService.deleteById(id);

    return {
      message: '信号已删除',
      id,
    };
  }
}
