import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DRIZZLE_PROVIDER } from '../database/database.constants.js';
import * as schema from '../database/schema.js';

export type Webhook = schema.Webhook;
export type NewWebhook = schema.NewWebhook;

export interface CreateWebhookInput {
  name: string;
  url: string;
  type: 'wechat';
  minConfidence: number;
  maxConfidence: number;
  enabled?: boolean;
}

export interface UpdateWebhookInput {
  name?: string;
  url?: string;
  type?: 'wechat';
  minConfidence?: number;
  maxConfidence?: number;
  enabled?: boolean;
}

export interface SignalNotification {
  newsTitle: string;
  stockCode: string;
  stockName: string;
  direction: string;
  confidence: number;
  sentiment: string;
  reasoning: string;
  signalTime: Date;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private readonly httpService: HttpService,
  ) {}

  async findAll(): Promise<Webhook[]> {
    return this.db.select().from(schema.webhooks);
  }

  async findById(id: string): Promise<Webhook | null> {
    const result = await this.db
      .select()
      .from(schema.webhooks)
      .where(eq(schema.webhooks.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findEnabledByType(type: 'wechat'): Promise<Webhook[]> {
    return this.db
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
    return this.db
      .select()
      .from(schema.webhooks)
      .where(eq(schema.webhooks.enabled, true));
  }

  async create(input: CreateWebhookInput): Promise<Webhook> {
    const result = await this.db
      .insert(schema.webhooks)
      .values({
        name: input.name,
        url: input.url,
        type: input.type,
        minConfidence: input.minConfidence,
        maxConfidence: input.maxConfidence,
        enabled: input.enabled ?? true,
      })
      .returning();

    this.logger.log(`Created webhook: ${result[0].name} (${result[0].id})`);
    return result[0];
  }

  async update(id: string, input: UpdateWebhookInput): Promise<Webhook> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Webhook with id ${id} not found`);
    }

    const result = await this.db
      .update(schema.webhooks)
      .set({
        name: input.name,
        url: input.url,
        type: input.type,
        minConfidence: input.minConfidence,
        maxConfidence: input.maxConfidence,
        enabled: input.enabled,
      })
      .where(eq(schema.webhooks.id, id))
      .returning();

    this.logger.log(`Updated webhook: ${result[0].name} (${result[0].id})`);
    return result[0];
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Webhook with id ${id} not found`);
    }

    await this.db.delete(schema.webhooks).where(eq(schema.webhooks.id, id));
    this.logger.log(`Deleted webhook: ${existing.name} (${id})`);
  }

  async toggleEnabled(id: string): Promise<Webhook> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Webhook with id ${id} not found`);
    }

    const result = await this.db
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

  /**
   * 发送信号通知到所有启用的 webhooks
   */
  async sendSignalNotifications(signal: SignalNotification): Promise<void> {
    // 查找所有启用且置信度在范围内的 webhooks
    const webhooks = await this.db
      .select()
      .from(schema.webhooks)
      .where(
        and(
          eq(schema.webhooks.enabled, true),
          sql`${signal.confidence} >= ${schema.webhooks.minConfidence}`,
          sql`${signal.confidence} <= ${schema.webhooks.maxConfidence}`,
        ),
      );

    if (webhooks.length === 0) {
      this.logger.log(`No webhooks found for signal ${signal.stockCode} with confidence ${signal.confidence}`);
      return;
    }

    this.logger.log(`Sending signal notification to ${webhooks.length} webhooks`);

    // 构建企业微信消息
    const message = this.buildWechatMessage(signal);

    // 发送到所有 webhooks
    for (const webhook of webhooks) {
      try {
        await this.sendToWebhook(webhook, message);
        this.logger.log(`Sent notification to webhook: ${webhook.name}`);
      } catch (error) {
        this.logger.error(`Failed to send notification to webhook ${webhook.name}:`, error);
      }
    }
  }

  /**
   * 构建企业微信消息
   */
  private buildWechatMessage(signal: SignalNotification): object {
    const directionText = signal.direction === 'bullish' ? '买入' : signal.direction === 'bearish' ? '卖出' : '观望';
    const sentimentText = signal.sentiment === 'positive' ? '积极' : signal.sentiment === 'negative' ? '消极' : '中性';

    return {
      msgtype: 'markdown',
      markdown: {
        content: `## 🔔 新的交易信号\n\n` +
          `**股票**: ${signal.stockName} (${signal.stockCode})\n\n` +
          `**方向**: ${directionText}\n\n` +
          `**置信度**: ${signal.confidence}%\n\n` +
          `**情绪**: ${sentimentText}\n\n` +
          `**分析理由**: ${signal.reasoning}\n\n` +
          `**信号时间**: ${signal.signalTime.toLocaleString('zh-CN')}\n\n` +
          `**来源新闻**: ${signal.newsTitle}`,
      },
    };
  }

  /**
   * 发送消息到 webhook
   */
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
