import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import * as schema from '../../core/db/schema.js';

@Injectable()
export class PeriodicReportService {
  private readonly logger = new Logger(PeriodicReportService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getConfig(): Promise<schema.PeriodicReportConfig> {
    let config = await this.findConfig();
    if (!config) {
      const result = await this.dbService.db
        .insert(schema.periodicReportConfig)
        .values({})
        .returning();
      config = result[0];
    }
    return config;
  }

  async updateConfig(dto: { dailyWebhookIds?: string[]; weeklyWebhookIds?: string[] }): Promise<schema.PeriodicReportConfig> {
    const config = await this.getConfig();
    const result = await this.dbService.db
      .update(schema.periodicReportConfig)
      .set({
        dailyWebhookIds: dto.dailyWebhookIds !== undefined ? dto.dailyWebhookIds : config.dailyWebhookIds,
        weeklyWebhookIds: dto.weeklyWebhookIds !== undefined ? dto.weeklyWebhookIds : config.weeklyWebhookIds,
      })
      .where(eq(schema.periodicReportConfig.id, config.id))
      .returning();
    return result[0];
  }

  private async findConfig(): Promise<schema.PeriodicReportConfig | null> {
    const result = await this.dbService.db
      .select()
      .from(schema.periodicReportConfig)
      .limit(1);
    return result[0] || null;
  }

  async generateDailyReport(): Promise<schema.PeriodicReport> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setHours(18, 0, 0, 0);
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 1);

    this.logger.log(
      `PeriodicReportService.generateDailyReport: generating daily report for period ${periodStart.toISOString()} ~ ${periodEnd.toISOString()}`,
    );

    return this.generateReport('daily', periodStart, periodEnd);
  }

  async generateWeeklyReport(): Promise<schema.PeriodicReport> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setHours(10, 0, 0, 0);
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 7);

    this.logger.log(
      `PeriodicReportService.generateWeeklyReport: generating weekly report for period ${periodStart.toISOString()} ~ ${periodEnd.toISOString()}`,
    );

    return this.generateReport('weekly', periodStart, periodEnd);
  }

  private async generateReport(
    type: 'daily' | 'weekly',
    periodStart: Date,
    periodEnd: Date,
  ): Promise<schema.PeriodicReport> {
    try {
      const content = await this.buildReportContent(type, periodStart, periodEnd);
      const summary = this.buildReportSummary(content);

      const config = await this.getConfig();
      const webhookIds = type === 'daily' ? (config.dailyWebhookIds || []) : (config.weeklyWebhookIds || []);

      const result = await this.dbService.db
        .insert(schema.periodicReports)
        .values({
          type,
          periodStart,
          periodEnd,
          content,
          summary,
          webhookIds: webhookIds.length > 0 ? webhookIds : null,
          status: 'completed',
        })
        .returning();

      this.logger.log(
        `PeriodicReportService.generateReport: ${type} report generated successfully, id=${result[0].id}`,
      );

      if (webhookIds.length > 0) {
        await this.sendReportToWebhooks(result[0], webhookIds);
      }

      return result[0];
    } catch (error) {
      this.logger.error(
        `PeriodicReportService.generateReport: failed to generate ${type} report: ${error instanceof Error ? error.message : String(error)}`,
      );

      await this.dbService.db
        .insert(schema.periodicReports)
        .values({
          type,
          periodStart,
          periodEnd,
          content: {
            period: { start: periodStart.toISOString(), end: periodEnd.toISOString(), type },
            strategies: [],
            tradingAgent: { decisionCount: 0, approvedCount: 0, rejectedCount: 0, winRate: 0, totalProfit: 0 },
            signals: { totalCount: 0, longCount: 0, shortCount: 0, holdCount: 0 },
            overall: { totalTrades: 0, totalProfit: 0, totalWinRate: 0 },
          },
          status: 'failed',
        })
        .returning();

      throw error;
    }
  }

  private async buildReportContent(
    type: 'daily' | 'weekly',
    periodStart: Date,
    periodEnd: Date,
  ): Promise<schema.PeriodicReportContent> {
    const strategiesData = await this.buildStrategiesData(periodStart, periodEnd);
    const tradingAgentData = await this.buildTradingAgentData(periodStart, periodEnd);
    const signalsData = await this.buildSignalsData(periodStart, periodEnd);

    const totalTrades = strategiesData.reduce((sum, s) => sum + s.tradeCount, 0);
    const totalProfit = strategiesData.reduce((sum, s) => sum + s.totalProfit, 0);
    const totalWinRate = strategiesData.length > 0
      ? strategiesData.reduce((sum, s) => sum + s.winRate * s.tradeCount, 0) / (totalTrades || 1)
      : 0;

    return {
      period: { start: periodStart.toISOString(), end: periodEnd.toISOString(), type },
      strategies: strategiesData,
      tradingAgent: tradingAgentData,
      signals: signalsData,
      overall: {
        totalTrades,
        totalProfit,
        totalWinRate: Math.round(totalWinRate * 10000) / 10000,
      },
    };
  }

  private async buildStrategiesData(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<schema.PeriodicReportContent['strategies']> {
    const trades = await this.dbService.db
      .select({
        id: schema.simulationTrades.id,
        strategyId: schema.simulationTrades.strategyId,
        type: schema.simulationTrades.type,
        profit: schema.simulationTrades.profit,
        totalAmount: schema.simulationTrades.totalAmount,
        tradeTime: schema.simulationTrades.tradeTime,
      })
      .from(schema.simulationTrades)
      .where(
        and(
          gte(schema.simulationTrades.tradeTime, periodStart),
          lte(schema.simulationTrades.tradeTime, periodEnd),
        ),
      );

    const strategyIds = [...new Set(trades.map(t => t.strategyId).filter((id): id is string => !!id))];
    if (strategyIds.length === 0) {
      return [];
    }

    const strategyRecords = await this.dbService.db
      .select({
        id: schema.strategies.id,
        name: schema.strategies.name,
      })
      .from(schema.strategies)
      .where(
        sql`${schema.strategies.id} IN ${strategyIds}`,
      );

    const strategyNameMap = new Map(strategyRecords.map(s => [s.id, s.name]));

    const groupedByStrategy = new Map<string, typeof trades>();
    for (const trade of trades) {
      if (!trade.strategyId) continue;
      const existing = groupedByStrategy.get(trade.strategyId) || [];
      existing.push(trade);
      groupedByStrategy.set(trade.strategyId, existing);
    }

    const result: schema.PeriodicReportContent['strategies'] = [];
    for (const [strategyId, strategyTrades] of groupedByStrategy) {
      const sellTrades = strategyTrades.filter(t => t.type === 'sell');
      const tradeCount = sellTrades.length;
      const winCount = sellTrades.filter(t => t.profit !== null && parseFloat(t.profit) > 0).length;
      const winRate = tradeCount > 0 ? winCount / tradeCount : 0;
      const totalProfit = sellTrades.reduce(
        (sum, t) => sum + (t.profit ? parseFloat(t.profit) : 0),
        0,
      );
      const totalBuyCost = strategyTrades
        .filter(t => t.type === 'buy')
        .reduce((sum, t) => sum + (t.totalAmount ? parseFloat(t.totalAmount) : 0), 0);
      const totalReturn = totalBuyCost > 0 ? totalProfit / totalBuyCost : 0;

      result.push({
        id: strategyId,
        name: strategyNameMap.get(strategyId) || strategyId,
        tradeCount,
        winRate: Math.round(winRate * 10000) / 10000,
        totalProfit: Math.round(totalProfit * 100) / 100,
        totalReturn: Math.round(totalReturn * 10000) / 10000,
      });
    }

    return result;
  }

  private async buildTradingAgentData(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<schema.PeriodicReportContent['tradingAgent']> {
    const decisions = await this.dbService.db
      .select({
        id: schema.tradingAgentDecisions.id,
        decision: schema.tradingAgentDecisions.decision,
        strategyId: schema.tradingAgentDecisions.strategyId,
      })
      .from(schema.tradingAgentDecisions)
      .where(
        and(
          gte(schema.tradingAgentDecisions.createdAt, periodStart),
          lte(schema.tradingAgentDecisions.createdAt, periodEnd),
        ),
      );

    const decisionCount = decisions.length;
    const approvedCount = decisions.filter(d => d.decision === 'approved').length;
    const rejectedCount = decisions.filter(d => d.decision === 'rejected').length;

    const approvedStrategyIds = decisions
      .filter(d => d.decision === 'approved' && d.strategyId)
      .map(d => d.strategyId!);

    let winRate = 0;
    let totalProfit = 0;

    if (approvedStrategyIds.length > 0) {
      const agentTrades = await this.dbService.db
        .select({
          profit: schema.simulationTrades.profit,
          type: schema.simulationTrades.type,
        })
        .from(schema.simulationTrades)
        .where(
          and(
            sql`${schema.simulationTrades.strategyId} IN ${approvedStrategyIds}`,
            gte(schema.simulationTrades.tradeTime, periodStart),
            lte(schema.simulationTrades.tradeTime, periodEnd),
            eq(schema.simulationTrades.type, 'sell'),
          ),
        );

      const sellCount = agentTrades.length;
      const winCount = agentTrades.filter(t => t.profit !== null && parseFloat(t.profit) > 0).length;
      winRate = sellCount > 0 ? winCount / sellCount : 0;
      totalProfit = agentTrades.reduce(
        (sum, t) => sum + (t.profit ? parseFloat(t.profit) : 0),
        0,
      );
    }

    return {
      decisionCount,
      approvedCount,
      rejectedCount,
      winRate: Math.round(winRate * 10000) / 10000,
      totalProfit: Math.round(totalProfit * 100) / 100,
    };
  }

  private async buildSignalsData(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<schema.PeriodicReportContent['signals']> {
    const signalsResult = await this.dbService.db
      .select({
        action: schema.signals.action,
        direction: schema.signals.direction,
      })
      .from(schema.signals)
      .where(
        and(
          gte(schema.signals.generatedAt, periodStart),
          lte(schema.signals.generatedAt, periodEnd),
        ),
      );

    const totalCount = signalsResult.length;
    let longCount = 0;
    let shortCount = 0;
    let holdCount = 0;

    for (const signal of signalsResult) {
      const action = (signal.action || signal.direction || '').toLowerCase();
      if (action === 'long' || action === 'bullish' || action === 'buy') {
        longCount++;
      } else if (action === 'short' || action === 'bearish' || action === 'sell') {
        shortCount++;
      } else {
        holdCount++;
      }
    }

    return { totalCount, longCount, shortCount, holdCount };
  }

  buildReportSummary(content: schema.PeriodicReportContent): string {
    const periodStart = new Date(content.period.start);
    const periodEnd = new Date(content.period.end);
    const typeLabel = content.period.type === 'daily' ? '日报' : '周报';
    const dateLabel = content.period.type === 'daily'
      ? periodStart.toLocaleDateString('zh-CN')
      : `${periodStart.toLocaleDateString('zh-CN')} ~ ${periodEnd.toLocaleDateString('zh-CN')}`;

    const profitStr = content.overall.totalProfit >= 0
      ? `+${content.overall.totalProfit.toFixed(2)}`
      : content.overall.totalProfit.toFixed(2);

    const agentProfitStr = content.tradingAgent.totalProfit >= 0
      ? `+${content.tradingAgent.totalProfit.toFixed(2)}`
      : content.tradingAgent.totalProfit.toFixed(2);

    let summary = `**📊 ${typeLabel} - ${dateLabel}**\n\n` +
      `>周期: ${periodStart.toLocaleString('zh-CN')} ~ ${periodEnd.toLocaleString('zh-CN')}\n\n` +
      `**📈 策略表现**\n` +
      `>活跃策略: ${content.strategies.length} 个 | 总交易: ${content.overall.totalTrades} 笔 | 胜率: ${(content.overall.totalWinRate * 100).toFixed(1)}% | 盈利: ${profitStr}\n\n` +
      `**🤖 交易 Agent**\n` +
      `>决策: ${content.tradingAgent.decisionCount} 次 | 批准: ${content.tradingAgent.approvedCount} 次 | 胜率: ${(content.tradingAgent.winRate * 100).toFixed(1)}% | 盈利: ${agentProfitStr}\n\n` +
      `**📡 信号统计**\n` +
      `>总信号: ${content.signals.totalCount} | 做多: ${content.signals.longCount} | 做空: ${content.signals.shortCount} | 观望: ${content.signals.holdCount}`;

    if (content.strategies.length > 0) {
      summary += '\n\n**策略明细**';
      for (const strategy of content.strategies) {
        const sProfitStr = strategy.totalProfit >= 0
          ? `+${strategy.totalProfit.toFixed(2)}`
          : strategy.totalProfit.toFixed(2);
        summary += `\n> ${strategy.name}: ${strategy.tradeCount}笔 | 胜率${(strategy.winRate * 100).toFixed(1)}% | 盈利${sProfitStr}`;
      }
    }

    return summary;
  }

  async sendReportToWebhooks(report: schema.PeriodicReport, webhookIds: string[]): Promise<void> {
    try {
      if (!webhookIds || webhookIds.length === 0) {
        this.logger.log(
          `PeriodicReportService.sendReportToWebhooks: no webhookIds specified, skipping`,
        );
        return;
      }

      const targetWebhooks = await this.dbService.db
        .select()
        .from(schema.webhooks)
        .where(
          and(
            eq(schema.webhooks.enabled, true),
            sql`${schema.webhooks.id} IN ${webhookIds}`,
          ),
        );

      if (targetWebhooks.length === 0) {
        this.logger.log(
          `PeriodicReportService.sendReportToWebhooks: no enabled webhooks found for specified ids`,
        );
        return;
      }

      this.logger.log(
        `PeriodicReportService.sendReportToWebhooks: sending ${report.type} report to ${targetWebhooks.length} webhooks`,
      );

      for (const webhook of targetWebhooks) {
        try {
          await this.notificationsService.sendWebhookNotification(webhook, {
            type: report.type === 'daily' ? 'daily_report' : 'weekly_report',
            title: report.type === 'daily' ? '📊 日报' : '📊 周报',
            content: report.summary || '',
            timestamp: report.createdAt.toISOString(),
          });
        } catch (error) {
          this.logger.error(
            `PeriodicReportService.sendReportToWebhooks: failed to send to webhook ${webhook.name}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `PeriodicReportService.sendReportToWebhooks: error sending report to webhooks: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async testPush(): Promise<void> {
    const config = await this.getConfig();
    const allWebhookIds = [...new Set([...(config.dailyWebhookIds || []), ...(config.weeklyWebhookIds || [])])];

    if (allWebhookIds.length === 0) {
      this.logger.log('PeriodicReportService.testPush: no webhooks configured');
      return;
    }

    const testContent: schema.PeriodicReportContent = {
      period: { start: new Date().toISOString(), end: new Date().toISOString(), type: 'daily' },
      strategies: [],
      tradingAgent: { decisionCount: 0, approvedCount: 0, rejectedCount: 0, winRate: 0, totalProfit: 0 },
      signals: { totalCount: 0, longCount: 0, shortCount: 0, holdCount: 0 },
      overall: { totalTrades: 0, totalProfit: 0, totalWinRate: 0 },
    };

    const summary = '**📊 测试推送**\n\n>这是一条测试消息，用于验证定期报告推送配置是否正常。';

    await this.sendReportToWebhooks(
      {
        id: 'test',
        type: 'daily',
        periodStart: new Date(),
        periodEnd: new Date(),
        content: testContent,
        summary,
        webhookIds: allWebhookIds,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as schema.PeriodicReport,
      allWebhookIds,
    );
  }

  async findAll(params: {
    type?: 'daily' | 'weekly';
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: schema.PeriodicReport[]; total: number }> {
    const { type, page = 1, pageSize = 20, startDate, endDate } = params;

    const conditions = [];
    if (type) {
      conditions.push(eq(schema.periodicReports.type, type));
    }
    if (startDate) {
      conditions.push(gte(schema.periodicReports.periodStart, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(schema.periodicReports.periodEnd, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.dbService.db
        .select()
        .from(schema.periodicReports)
        .where(whereClause)
        .orderBy(desc(schema.periodicReports.periodStart))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.dbService.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.periodicReports)
        .where(whereClause),
    ]);

    return {
      data,
      total: countResult[0]?.count || 0,
    };
  }

  async findById(id: string): Promise<schema.PeriodicReport | null> {
    const result = await this.dbService.db
      .select()
      .from(schema.periodicReports)
      .where(eq(schema.periodicReports.id, id))
      .limit(1);
    return result[0] || null;
  }
}
