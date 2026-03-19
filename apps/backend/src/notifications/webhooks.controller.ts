import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service.js';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CreateWebhookDto } from './dto/create-webhook.dto.js';
import { UpdateWebhookDto } from './dto/update-webhook.dto.js';

@ApiTags('通知设置')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取 Webhook 列表' })
  @ApiResponse({ status: 200, description: '成功获取 Webhook 列表' })
  async getWebhooks() {
    const webhooks = await this.webhooksService.findAll();
    return {
      data: webhooks,
      total: webhooks.length,
    };
  }

  @Post()
  @ApiOperation({ summary: '创建 Webhook' })
  @ApiResponse({ status: 201, description: 'Webhook 创建成功' })
  async createWebhook(@Body() dto: CreateWebhookDto) {
    const webhook = await this.webhooksService.create(dto);
    return {
      data: webhook,
      message: 'Webhook 创建成功',
    };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新 Webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID', type: String })
  @ApiResponse({ status: 200, description: 'Webhook 更新成功' })
  @ApiResponse({ status: 404, description: 'Webhook 不存在' })
  async updateWebhook(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    const webhook = await this.webhooksService.update(id, dto);
    return {
      data: webhook,
      message: 'Webhook 更新成功',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID', type: String })
  @ApiResponse({ status: 200, description: 'Webhook 删除成功' })
  @ApiResponse({ status: 404, description: 'Webhook 不存在' })
  async deleteWebhook(@Param('id') id: string) {
    await this.webhooksService.delete(id);
    return {
      message: 'Webhook 删除成功',
    };
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '测试 Webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID', type: String })
  @ApiResponse({ status: 200, description: 'Webhook 测试成功' })
  @ApiResponse({ status: 404, description: 'Webhook 不存在' })
  async testWebhook(@Param('id') id: string) {
    const webhook = await this.webhooksService.findById(id);
    if (!webhook) {
      throw new NotFoundException('Webhook 不存在');
    }

    // 发送测试消息
    await this.notificationsService.sendWebhookNotification(webhook, {
      type: 'test',
      title: 'Webhook 测试',
      content: '这是一条测试消息，用于验证 Webhook 配置是否正确。',
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'Webhook 测试消息已发送',
      webhookId: id,
      webhookName: webhook.name,
    };
  }

  @Put(':id/toggle')
  @ApiOperation({ summary: '启用/禁用 Webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID', type: String })
  @ApiResponse({ status: 200, description: 'Webhook 状态切换成功' })
  @ApiResponse({ status: 404, description: 'Webhook 不存在' })
  async toggleWebhook(@Param('id') id: string) {
    const webhook = await this.webhooksService.toggleEnabled(id);
    return {
      data: webhook,
      message: webhook.enabled ? 'Webhook 已启用' : 'Webhook 已禁用',
    };
  }
}
