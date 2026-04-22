import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { EventService } from '../../../modules/event/event.service.js';
import { SignalsService } from '../../../modules/signals/signals.service.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { EventsListQueryDto } from './dto/index.js';

@ApiTags('事件管理')
@Controller('events')
@ApiBearerAuth()
export class EventsController {
  constructor(
    private readonly eventService: EventService,
    private readonly signalsService: SignalsService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取事件列表（支持分页和筛选）' })
  @ApiResponse({ status: 200, description: '成功获取事件列表' })
  async getEventsList(@Query() query: EventsListQueryDto) {
    return await this.eventService.findList(query);
  }

  @Get('unprocessed')
  @Public()
  @ApiOperation({ summary: '获取未处理事件列表' })
  @ApiResponse({ status: 200, description: '成功获取未处理事件列表' })
  async getUnprocessedEvents() {
    const data = await this.eventService.findUnprocessed();
    return { data, total: data.length };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '根据 ID 获取事件详情' })
  @ApiParam({ name: 'id', description: '事件 ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取事件详情' })
  @ApiResponse({ status: 404, description: '事件不存在' })
  async getEventById(@Param('id') id: string) {
    const event = await this.eventService.findById(id);
    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    return { data: event };
  }

  @Get(':id/signals')
  @Public()
  @ApiOperation({ summary: '获取事件关联的信号列表' })
  @ApiParam({ name: 'id', description: '事件 ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取信号列表' })
  @ApiResponse({ status: 404, description: '事件不存在' })
  async getEventSignals(@Param('id') id: string) {
    const event = await this.eventService.findById(id);
    if (!event) {
      throw new NotFoundException('事件不存在');
    }

    const signals = await this.signalsService.findByEventId(id);
    return { data: signals, total: signals.length };
  }
}
