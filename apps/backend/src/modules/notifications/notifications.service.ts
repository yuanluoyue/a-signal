import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WebhooksService, Webhook } from './webhooks.service.js';
import { Signal } from '../../core/db/schema.js';
import { BlacklistService } from '../blacklist/blacklist.service.js';

export interface WechatMessage {
  msgtype: 'markdown';
  markdown: {
    content: string;
  };
}

export interface SignalNotificationContext {
  signal: Signal;
  newsPublishTime: Date;
  stockName: string;
  stockCode: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly httpService: HttpService,
    private readonly webhooksService: WebhooksService,
    private readonly blacklistService: BlacklistService,
  ) {}

  async sendWechatNotification(
    webhookUrl: string,
    signal: Signal,
    stockName: string,
    stockCode: string,
  ): Promise<boolean> {
    try {
      const message = this.buildWechatMessage(signal, stockName, stockCode);

      const response = await firstValueFrom(
        this.httpService.post(webhookUrl, message, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }),
      );

      if (response.data?.errcode === 0) {
        this.logger.log(`Wechat notification sent successfully to ${webhookUrl}`);
        return true;
      } else {
        this.logger.warn(
          `Wechat notification failed: ${response.data?.errmsg || 'Unknown error'}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Failed to send wechat notification to ${webhookUrl}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  private buildWechatMessage(
    signal: Signal,
    stockName: string,
    stockCode: string,
  ): WechatMessage {
    const direction = (signal.action || signal.direction || '').toLowerCase();
    const directionEmoji = this.getDirectionEmoji(direction);
    
    let directionText: string;
    if (direction === 'bullish' || direction === 'long') {
      directionText = '买入';
    } else if (direction === 'bearish' || direction === 'short') {
      directionText = '卖出';
    } else {
      directionText = '观望';
    }
    
    const score = parseFloat(signal.score || '0');
    const time = signal.generatedAt || signal.signalTime || signal.createdAt;

    const content = `**${directionEmoji} 新交易信号**\n` +
      `>股票: ${stockName}(${stockCode})\n` +
      `>方向: ${directionText}\n` +
      `>分数: ${score.toFixed(2)}\n` +
      `>理由: ${signal.reason ?? signal.reasoning ?? ''}\n` +
      `>时间: ${time ? new Date(time).toLocaleString('zh-CN') : '-'}`;

    return {
      msgtype: 'markdown',
      markdown: {
        content,
      },
    };
  }

  private getDirectionEmoji(direction: string): string {
    const emojiMap: Record<string, string> = {
      buy: '📈',
      sell: '📉',
      hold: '➡️',
      bullish: '📈',
      bearish: '📉',
      neutral: '➡️',
      long: '📈',
      short: '📉',
    };
    return emojiMap[direction.toLowerCase()] || '📊';
  }

  async notifySignalAnalyzed(context: SignalNotificationContext): Promise<void> {
    try {
      const isBlacklisted = await this.blacklistService.isBlacklisted(context.stockCode);
      if (isBlacklisted) {
        this.logger.debug(
          `Skipping notification for signal ${context.signal.id} - stock ${context.stockCode} is blacklisted`,
        );
        return;
      }

      if (!this.isNewsWithinTwoDays(context.newsPublishTime)) {
        this.logger.debug(
          `Skipping notification for signal ${context.signal.id} - news is older than 2 days`,
        );
        return;
      }

      const enabledWebhooks = await this.webhooksService.findAllEnabled();

      if (enabledWebhooks.length === 0) {
        this.logger.debug('No enabled webhooks found, skipping notifications');
        return;
      }

      const notificationPromises = enabledWebhooks.map((webhook) =>
        this.processWebhookNotification(webhook, context),
      );

      await Promise.all(notificationPromises);
    } catch (error) {
      this.logger.error(
        `Error in notifySignalAnalyzed: ${error.message}`,
        error.stack,
      );
    }
  }

  private isNewsWithinTwoDays(publishTime: Date): boolean {
    const now = new Date();
    const diffMs = now.getTime() - new Date(publishTime).getTime();
    return diffMs <= this.TWO_DAYS_MS;
  }

  private async processWebhookNotification(
    webhook: Webhook,
    context: SignalNotificationContext,
  ): Promise<void> {
    try {
      const score = parseFloat(context.signal.score || '0');
      const absScore = Math.abs(score);
      const minScore = webhook.minScore ? parseFloat(webhook.minScore) : 0;
      const maxScore = webhook.maxScore ? parseFloat(webhook.maxScore) : 1;
      
      if (absScore < minScore || absScore > maxScore) {
        this.logger.debug(
          `Skipping webhook ${webhook.name} - signal absolute score (${absScore}) ` +
            `is not in range [${minScore}, ${maxScore}]`,
        );
        return;
      }

      switch (webhook.type) {
        case 'wechat':
          await this.sendWechatNotification(
            webhook.url,
            context.signal,
            context.stockName,
            context.stockCode,
          );
          break;
        default:
          this.logger.warn(`Unsupported webhook type: ${webhook.type}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process webhook notification for ${webhook.name}: ${error.message}`,
        error.stack,
      );
    }
  }

  async sendTestNotification(webhookId: string): Promise<boolean> {
    try {
      const webhook = await this.webhooksService.findById(webhookId);
      if (!webhook) {
        this.logger.error(`Webhook ${webhookId} not found`);
        return false;
      }

      if (!webhook.enabled) {
        this.logger.warn(`Webhook ${webhook.name} is disabled`);
        return false;
      }

      const testMessage: WechatMessage = {
        msgtype: 'markdown',
        markdown: {
          content:
            '**🧪 测试通知**\n>这是一条测试消息，用于验证 Webhook 配置是否正确。',
        },
      };

      const response = await firstValueFrom(
        this.httpService.post(webhook.url, testMessage, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }),
      );

      if (response.data?.errcode === 0) {
        this.logger.log(`Test notification sent successfully to ${webhook.name}`);
        return true;
      } else {
        this.logger.warn(
          `Test notification failed: ${response.data?.errmsg || 'Unknown error'}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Failed to send test notification: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async sendWebhookNotification(
    webhook: Webhook,
    payload: { type: string; title: string; content: string; timestamp: string },
  ): Promise<boolean> {
    try {
      if (!webhook.enabled) {
        this.logger.warn(`Webhook ${webhook.name} is disabled`);
        return false;
      }

      const message: WechatMessage = {
        msgtype: 'markdown',
        markdown: {
          content: `**${payload.title}**\n>${payload.content}`,
        },
      };

      const response = await firstValueFrom(
        this.httpService.post(webhook.url, message, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }),
      );

      if (response.data?.errcode === 0) {
        this.logger.log(`Notification sent successfully to ${webhook.name}`);
        return true;
      } else {
        this.logger.warn(
          `Notification failed: ${response.data?.errmsg || 'Unknown error'}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Failed to send notification to ${webhook.name}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
}
