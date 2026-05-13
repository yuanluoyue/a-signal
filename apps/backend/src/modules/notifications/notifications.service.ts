import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WebhooksService, Webhook } from './webhooks.service.js';
import { Signal, Strategy } from '../../core/db/schema.js';
import { BlacklistService } from '../blacklist/blacklist.service.js';
import { StrategyService } from '../strategy/strategy.service.js';
import { SimulationService } from '../simulation/simulation.service.js';
import { KlinesService } from '../klines/klines.service.js';

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
    private readonly strategyService: StrategyService,
    private readonly simulationService: SimulationService,
    private readonly klinesService: KlinesService,
  ) {}

  async sendWechatNotification(
    webhookUrl: string,
    signal: Signal,
    stockName: string,
    stockCode: string,
    strategy: Strategy,
  ): Promise<boolean> {
    try {
      const entryPrice = await this.getLatestPrice(stockCode);
      const takeProfitPct = strategy.takeProfitPct ? parseFloat(strategy.takeProfitPct) : null;
      const stopLossPct = strategy.stopLossPct ? parseFloat(strategy.stopLossPct) : null;
      const takeProfitPrice = entryPrice && takeProfitPct ? entryPrice * (1 + takeProfitPct) : null;
      const stopLossPrice = entryPrice && stopLossPct ? entryPrice * (1 - stopLossPct) : null;

      const message = this.buildWechatMessage(
        signal,
        stockName,
        stockCode,
        strategy.name,
        entryPrice,
        takeProfitPrice,
        stopLossPrice,
      );

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

  private async getLatestPrice(stockCode: string): Promise<number | null> {
    try {
      const cleanCode = stockCode.trim().toLowerCase();
      
      await this.klinesService.checkAndUpdateKlines(cleanCode, '4h');

      const result = await this.klinesService.getKlines(cleanCode, '4h');
      if (!result || result.length === 0) {
        this.logger.warn(`getLatestPrice: no 4h kline found for ${stockCode}`);
        return null;
      }
      const latestKline = result[result.length - 1];
      return parseFloat(latestKline.close);
    } catch (error) {
      this.logger.error(`getLatestPrice: failed to get price for ${stockCode}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private buildWechatMessage(
    signal: Signal,
    stockName: string,
    stockCode: string,
    strategyName: string,
    entryPrice: number | null,
    takeProfitPrice: number | null,
    stopLossPrice: number | null,
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

    let content = `**${directionEmoji} 新交易信号 [策略: ${strategyName}]**\n` +
      `>股票: ${stockName}(${stockCode})\n` +
      `>方向: ${directionText}\n` +
      `>分数: ${score.toFixed(2)}\n`;

    if (entryPrice !== null) {
      content += `>开仓价: ${entryPrice.toFixed(2)}\n`;
    }
    if (takeProfitPrice !== null) {
      content += `>止盈价: ${takeProfitPrice.toFixed(2)}\n`;
    }
    if (stopLossPrice !== null) {
      content += `>止损价: ${stopLossPrice.toFixed(2)}\n`;
    }

    content += `>理由: ${signal.reason ?? signal.reasoning ?? ''}\n` +
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
          `NotificationsService.notifySignalAnalyzed: skipping signal ${context.signal.id} - stock ${context.stockCode} is blacklisted`,
        );
        return;
      }

      if (!this.isNewsWithinTwoDays(context.newsPublishTime)) {
        this.logger.debug(
          `NotificationsService.notifySignalAnalyzed: skipping signal ${context.signal.id} - news is older than 2 days`,
        );
        return;
      }

      const strategiesWithRuntime = await this.strategyService.findEnabledWithRuntime();

      if (strategiesWithRuntime.length === 0) {
        this.logger.debug(
          `NotificationsService.notifySignalAnalyzed: no enabled strategies found, skipping signal ${context.signal.id}`,
        );
        return;
      }

      let matchedCount = 0;
      const notificationPromises = strategiesWithRuntime.map(async (strategy) => {
        const matched = await this.strategyService.filterSignalByStrategy(strategy, context.signal);
        if (!matched) {
          return;
        }

        matchedCount++;

        if (strategy.runtime?.enableWebhook && strategy.runtime.webhookId && strategy.webhook) {
          this.logger.log(
            `NotificationsService.notifySignalAnalyzed: strategy [${strategy.name}] matched signal ${context.signal.id}, sending notification via webhook [${strategy.webhook.name}]`,
          );

          switch (strategy.webhook.type) {
            case 'wechat':
              await this.sendWechatNotification(
                strategy.webhook.url,
                context.signal,
                context.stockName,
                context.stockCode,
                strategy,
              );
              break;
            default:
              this.logger.warn(
                `NotificationsService.notifySignalAnalyzed: unsupported webhook type ${strategy.webhook.type} for strategy [${strategy.name}]`,
              );
          }
        }

        if (strategy.runtime?.enableSimulation) {
          const action = (context.signal.action || context.signal.direction || '').toLowerCase();
          if (action === 'long') {
            this.logger.log(
              `NotificationsService.notifySignalAnalyzed: strategy [${strategy.name}] enableSimulation=true, triggering simulation trade for signal ${context.signal.id}`,
            );
            try {
              const stopLossPct = strategy.stopLossPct ? parseFloat(strategy.stopLossPct) : undefined;
              const takeProfitPct = strategy.takeProfitPct ? parseFloat(strategy.takeProfitPct) : undefined;
              await this.simulationService.executeStrategyTrade({
                strategyId: strategy.id,
                stockCode: context.stockCode,
                stockName: context.stockName,
                quantity: 100,
                stopLossPct,
                takeProfitPct,
              });
            } catch (error) {
              this.logger.error(
                `NotificationsService.notifySignalAnalyzed: failed to execute strategy trade for strategy [${strategy.name}]: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          } else {
            this.logger.debug(
              `NotificationsService.notifySignalAnalyzed: strategy [${strategy.name}] enableSimulation=true but signal action is ${action}, skipping simulation trade`,
            );
          }
        }
      });

      await Promise.all(notificationPromises);

      if (matchedCount === 0) {
        this.logger.debug(
          `NotificationsService.notifySignalAnalyzed: no strategy matched signal ${context.signal.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `NotificationsService.notifySignalAnalyzed: error processing signal ${context.signal.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  private isNewsWithinTwoDays(publishTime: Date): boolean {
    const now = new Date();
    const diffMs = now.getTime() - new Date(publishTime).getTime();
    return diffMs <= this.TWO_DAYS_MS;
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
