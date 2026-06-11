import {
  Controller,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationLogService, QueryNotificationLogsDto } from '../../../modules/notifications/notification-log.service.js';

@ApiTags('Notification Logs')
@Controller('notification-logs')
@ApiBearerAuth()
export class NotificationLogController {
  constructor(private readonly notificationLogService: NotificationLogService) {}

  @Get()
  @ApiOperation({ summary: '获取通知记录列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'webhookId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async findAll(@Query() query: QueryNotificationLogsDto) {
    const result = await this.notificationLogService.findAll(query);
    return { data: result.data, total: result.total, page: result.page, pageSize: result.pageSize };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取通知记录详情' })
  async findById(@Param('id') id: string) {
    const log = await this.notificationLogService.findById(id);
    return { data: log };
  }
}
