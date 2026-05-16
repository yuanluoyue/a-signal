import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  NotFoundException,
  HttpCode,
  HttpStatus,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from '../../../modules/notifications/webhooks.service.js';
import { NotificationsService } from '../../../modules/notifications/notifications.service.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { CreateWebhookDto } from './dto/create-webhook.dto.js';
import { UpdateWebhookDto } from './dto/update-webhook.dto.js';

@ApiTags('通知设置')
@Controller('webhooks')
@ApiBearerAuth()
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private extractUserId(req: { user?: { userId: string; sub?: string } }): string {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }
    return userId;
  }

  @Get()
  @ApiOperation({ summary: '获取 Webhook 列表' })
  @ApiResponse({ status: 200, description: '成功获取 Webhook 列表' })
  async getWebhooks(@Request() req: { user?: { userId: string; sub?: string } }) {
    const userId = this.extractUserId(req);
    const webhooks = await this.webhooksService.findAll(userId);
    return {
      data: webhooks,
      total: webhooks.length,
    };
  }

  @Post()
  @ApiOperation({ summary: '创建 Webhook' })
  @ApiResponse({ status: 201, description: 'Webhook 创建成功' })
  async createWebhook(
    @Body() dto: CreateWebhookDto,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const webhook = await this.webhooksService.create(dto, userId);
    return {
      data: webhook,
      message: 'Webhook 创建成功',
    };
  }

  @Get(':id/signals')
  @ApiOperation({ summary: '获取最近信号列表' })
  @ApiParam({ name: 'id', description: 'Webhook ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取信号列表' })
  @ApiResponse({ status: 404, description: 'Webhook 不存在' })
  async getRecentSignals(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const webhook = await this.webhooksService.findById(id, userId);
    if (!webhook) {
      throw new NotFoundException('Webhook 不存在');
    }

    const signals = await this.webhooksService.getRecentSignals(userId, 20);
    return {
      data: signals,
      total: signals.length,
    };
  }

  @Get(':id/strategies')
  @ApiOperation({ summary: '获取绑定到 Webhook 的策略列表' })
  @ApiParam({ name: 'id', description: 'Webhook ID', type: String })
  async getWebhookStrategies(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const webhook = await this.webhooksService.findById(id, userId);
    if (!webhook) {
      throw new NotFoundException('Webhook 不存在');
    }
    const strategies = await this.webhooksService.findStrategiesByWebhookId(id, userId);
    return { data: strategies };
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '测试 Webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID', type: String })
  @ApiResponse({ status: 200, description: 'Webhook 测试成功' })
  @ApiResponse({ status: 404, description: 'Webhook 不存在' })
  async testWebhook(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const webhook = await this.webhooksService.findById(id, userId);
    if (!webhook) {
      throw new NotFoundException('Webhook 不存在');
    }

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

  @Post(':id/test-signal/:signalId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '使用指定信号测试 Webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID', type: String })
  @ApiParam({ name: 'signalId', description: 'Signal ID', type: String })
  @ApiResponse({ status: 200, description: '测试消息已发送' })
  @ApiResponse({ status: 404, description: 'Webhook 或信号不存在' })
  async testWebhookWithSignal(
    @Param('id') id: string,
    @Param('signalId') signalId: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    await this.webhooksService.sendSignalTestNotification(id, signalId, userId);
    return {
      message: '测试消息已发送',
      webhookId: id,
      signalId,
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
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const webhook = await this.webhooksService.update(id, dto, userId);
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
  async deleteWebhook(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    await this.webhooksService.delete(id, userId);
    return {
      message: 'Webhook 删除成功',
    };
  }

  @Put(':id/toggle')
  @ApiOperation({ summary: '启用/禁用 Webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID', type: String })
  @ApiResponse({ status: 200, description: 'Webhook 状态切换成功' })
  @ApiResponse({ status: 404, description: 'Webhook 不存在' })
  async toggleWebhook(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const webhook = await this.webhooksService.toggleEnabled(id, userId);
    return {
      data: webhook,
      message: webhook.enabled ? 'Webhook 已启用' : 'Webhook 已禁用',
    };
  }
}
