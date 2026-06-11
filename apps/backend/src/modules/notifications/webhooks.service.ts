import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DbService } from '../../core/db/db.service.js';
import { StockService } from '../stock/stock.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { NotificationLogService } from './notification-log.service.js';
import * as schema from '../../core/db/schema.js';

export type Webhook = schema.Webhook;
export type NewWebhook = schema.NewWebhook;
export type Strategy = schema.Strategy;

export interface CreateWebhookInput {
  name: string;
  url: string;
  type: 'wechat';
  enabled?: boolean;
}

export interface UpdateWebhookInput {
  name?: string;
  url?: string;
  type?: 'wechat';
  enabled?: boolean;
}

export interface SignalNotification {
  newsTitle: string;
  stockCode: string;
  stockName: string;
  direction: string;
  confidence: number;
  score: number;
  sentiment: string;
  reasoning: string;
  signalTime: Date;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly httpService: HttpService,
    private readonly stockService: StockService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationLogService: NotificationLogService,
  ) {}

  async findAll(userId: string): Promise<Webhook[]> {
    return this.dbService.db.select().from(schema.webhooks).where(eq(schema.webhooks.userId, userId));
  }

  async findById(id: string, userId: string): Promise<Webhook | null> {
    const result = await this.dbService.db
      .select()
      .from(schema.webhooks)
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.userId, userId)))
      .limit(1);
    return result[0] || null;
  }

  async findEnabledByType(type: 'wechat'): Promise<Webhook[]> {
    return this.dbService.db
      .select()
      .from(schema.webhooks)
      .where(
        and(
          eq(schema.webhooks.type, type),
          eq(schema.webhooks.enabled, true),
        ),
      );
  }

  async findAllEnabled(): Promise<Webhook[]> {
    return this.dbService.db
      .select()
      .from(schema.webhooks)
      .where(eq(schema.webhooks.enabled, true));
  }

  async create(input: CreateWebhookInput, userId: string): Promise<Webhook> {
    const result = await this.dbService.db
      .insert(schema.webhooks)
      .values({
        userId,
        name: input.name,
        url: input.url,
        type: input.type,
        enabled: input.enabled ?? true,
      })
      .returning();

    await this.auditLogService.log({
      userId,
      action: 'webhook.create',
      resource: 'webhook',
      resourceId: result[0].id,
      detail: { name: input.name, type: input.type },
      status: 'success',
    });

    this.logger.log(`Created webhook: ${result[0].name} (${result[0].id})`);
    return result[0];
  }

  async update(id: string, input: UpdateWebhookInput, userId: string): Promise<Webhook> {
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new NotFoundException(`Webhook with id ${id} not found`);
    }

    const updateData: Partial<schema.NewWebhook> = {
      name: input.name,
      url: input.url,
      type: input.type,
      enabled: input.enabled,
    };

    const result = await this.dbService.db
      .update(schema.webhooks)
      .set(updateData)
      .where(eq(schema.webhooks.id, id))
      .returning();

    await this.auditLogService.log({
      userId,
      action: 'webhook.update',
      resource: 'webhook',
      resourceId: id,
      detail: { name: result[0].name, updatedFields: Object.keys(input) },
      status: 'success',
    });

    this.logger.log(`Updated webhook: ${result[0].name} (${result[0].id})`);
    return result[0];
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new NotFoundException(`Webhook with id ${id} not found`);
    }

    await this.dbService.db.delete(schema.webhooks).where(eq(schema.webhooks.id, id));
    await this.auditLogService.log({
      userId,
      action: 'webhook.delete',
      resource: 'webhook',
      resourceId: id,
      detail: { name: existing.name },
      status: 'success',
    });

    this.logger.log(`Deleted webhook: ${existing.name} (${id})`);
  }

  async toggleEnabled(id: string, userId: string): Promise<Webhook> {
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new NotFoundException(`Webhook with id ${id} not found`);
    }

    const result = await this.dbService.db
      .update(schema.webhooks)
      .set({
        enabled: !existing.enabled,
      })
      .where(eq(schema.webhooks.id, id))
      .returning();

    this.logger.log(
      `${result[0].enabled ? 'Enabled' : 'Disabled'} webhook: ${result[0].name} (${result[0].id})`,
    );
    return result[0];
  }

  async findStrategiesByWebhookId(webhookId: string, userId: string): Promise<Strategy[]> {
    return this.dbService.db
      .select()
      .from(schema.strategies)
      .where(and(eq(schema.strategies.webhookId, webhookId), eq(schema.strategies.userId, userId)));
  }

  private buildWechatMessage(signal: SignalNotification, strategyName?: string): object {
    let directionText: string;
    const direction = signal.direction?.toLowerCase();
    
    if (direction === 'bullish' || direction === 'long') {
      directionText = '买入';
    } else if (direction === 'bearish' || direction === 'short') {
      directionText = '卖出';
    } else {
      directionText = '观望';
    }

    const strategyLabel = strategyName ? ` [策略: ${strategyName}]` : '';

    return {
      msgtype: 'markdown',
      markdown: {
        content: `## 🔔 新的交易信号${strategyLabel}\n\n` +
          `**股票**: ${signal.stockName} (${signal.stockCode})\n\n` +
          `**方向**: ${directionText}\n\n` +
          `**分数**: ${signal.score.toFixed(2)}\n\n` +
          `**分析理由**: ${signal.reasoning}\n\n` +
          `**信号时间**: ${signal.signalTime.toLocaleString('zh-CN')}\n\n` +
          `**来源新闻**: ${signal.newsTitle}`,
      },
    };
  }

  async getRecentSignals(userId: string, limit: number = 20): Promise<schema.Signal[]> {
    const signals = await this.dbService.db
      .select()
      .from(schema.signals)
      .orderBy(desc(schema.signals.createdAt))
      .limit(limit);

    const stockCodes = signals
      .map(s => s.stockCode || s.symbol)
      .filter((code): code is string => !!code);

    if (stockCodes.length > 0) {
      const stockNamesMap = await this.stockService.findByCodes(stockCodes);
      return signals.map(signal => ({
        ...signal,
        stockName: signal.stockName || stockNamesMap.get(signal.stockCode || signal.symbol || '')?.name || signal.stockCode || signal.symbol || '',
      }));
    }

    return signals;
  }

  async sendSignalTestNotification(webhookId: string, signalId: string, userId: string): Promise<void> {
    const webhook = await this.findById(webhookId, userId);
    if (!webhook) {
      throw new NotFoundException(`Webhook with id ${webhookId} not found`);
    }

    const [signal] = await this.dbService.db
      .select()
      .from(schema.signals)
      .where(eq(schema.signals.id, signalId))
      .limit(1);

    if (!signal) {
      throw new NotFoundException(`Signal with id ${signalId} not found`);
    }

    const stockCode = signal.stockCode || signal.symbol || '';
    let stockName = signal.stockName || stockCode;

    if (stockCode && !signal.stockName) {
      const stockNamesMap = await this.stockService.findByCodes([stockCode]);
      stockName = stockNamesMap.get(stockCode)?.name || stockCode;
    }

    const notification: SignalNotification = {
      newsTitle: '测试信号',
      stockCode,
      stockName,
      direction: signal.action || signal.direction || 'neutral',
      confidence: signal.confidence || 0,
      score: parseFloat(signal.score || '0'),
      sentiment: 'neutral',
      reasoning: signal.reason || '这是一个测试信号',
      signalTime: signal.generatedAt || signal.signalTime || signal.createdAt || new Date(),
    };

    const logEntry = await this.notificationLogService.createLog({
      webhookId: webhook.id,
      webhookName: webhook.name,
      webhookUrl: webhook.url,
      type: 'signal_test',
      title: `🧪 测试信号 - ${stockName}`,
      status: 'sending',
      signalId: signal.id,
    });

    try {
      const message = this.buildWechatMessage(notification);
      await this.sendToWebhook(webhook, message);
      await this.notificationLogService.updateLogStatus(logEntry.id, 'success');
      this.logger.log(`Sent test notification to webhook: ${webhook.name} for signal: ${signalId}`);
    } catch (error) {
      await this.notificationLogService.updateLogStatus(logEntry.id, 'error', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async sendToWebhook(webhook: schema.Webhook, message: object): Promise<void> {
    await firstValueFrom(
      this.httpService.post(webhook.url, message, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }),
    );
  }
}
