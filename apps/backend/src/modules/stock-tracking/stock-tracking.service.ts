import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, desc, and, gte, lte, inArray, sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { DbService } from '../../core/db/db.service.js';
import {
  stockTrackings,
  news,
  signals,
  backtestRecords,
  type NewStockTracking,
  type StockTracking,
  type NewNews,
} from '../../core/db/schema.js';
import { QueueService } from '../../core/queue/queue.service.js';
import { QUEUE_NAMES } from '../../core/queue/queue.constants.js';
import { StockService } from '../stock/stock.service.js';

export interface CreateTrackingDto {
  stockCode: string;
  stockName: string;
}

export interface FetchNewsResult {
  news: Array<{
    title: string;
    content: string;
    publishTime: string;
    source: string;
  }>;
  total: number;
}

@Injectable()
export class StockTrackingService {
  private readonly logger = new Logger(StockTrackingService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly stockService: StockService,
  ) {}

  async findAll(userId: string): Promise<StockTracking[]> {
    const trackings = await this.dbService.db
      .select()
      .from(stockTrackings)
      .where(eq(stockTrackings.userId, userId))
      .orderBy(desc(stockTrackings.createdAt));

    if (trackings.length === 0) {
      return trackings;
    }

    const stockCodes = trackings.map(t => t.stockCode);
    const stockMap = await this.stockService.findByCodes(stockCodes);

    return trackings.map(tracking => ({
      ...tracking,
      stockName: stockMap.get(tracking.stockCode)?.name || tracking.stockCode,
    }));
  }

  async findById(id: string, userId: string): Promise<StockTracking | null> {
    const [tracking] = await this.dbService.db
      .select()
      .from(stockTrackings)
      .where(and(eq(stockTrackings.id, id), eq(stockTrackings.userId, userId)))
      .limit(1);
    return tracking || null;
  }

  async findByStockCode(stockCode: string, userId: string): Promise<StockTracking | null> {
    const [tracking] = await this.dbService.db
      .select()
      .from(stockTrackings)
      .where(and(eq(stockTrackings.stockCode, stockCode), eq(stockTrackings.userId, userId)))
      .limit(1);
    return tracking || null;
  }

  async create(dto: CreateTrackingDto, userId: string): Promise<StockTracking> {
    const existing = await this.findByStockCode(dto.stockCode, userId);
    if (existing) {
      throw new Error(`Stock ${dto.stockCode} is already being tracked`);
    }

    const newTracking: NewStockTracking = {
      userId,
      stockCode: dto.stockCode,
      stockName: dto.stockName,
      status: 'pending',
      totalNews: 0,
    };

    const [tracking] = await this.dbService.db
      .insert(stockTrackings)
      .values(newTracking)
      .returning();

    this.logger.log(`Created stock tracking for ${dto.stockCode}`);
    return tracking;
  }

  async delete(id: string, userId: string): Promise<void> {
    const tracking = await this.findById(id, userId);
    if (!tracking) {
      throw new NotFoundException('Tracking not found');
    }

    const { stockCode } = tracking;

    this.logger.log(`[StockTrackingService] 开始删除追踪 ${id} 及其关联数据，股票代码: ${stockCode}`);

    const deletedSignals = await this.dbService.db
      .delete(signals)
      .where(eq(signals.stockCode, stockCode))
      .returning({ id: signals.id });
    this.logger.log(`[StockTrackingService] 删除信号 ${deletedSignals.length} 条`);

    const deletedNews = await this.dbService.db
      .delete(news)
      .where(sql`${news.uniqueKey} LIKE ${stockCode + '_%'}`)
      .returning({ id: news.id });
    this.logger.log(`[StockTrackingService] 删除新闻 ${deletedNews.length} 条`);

    await this.dbService.db
      .delete(stockTrackings)
      .where(eq(stockTrackings.id, id));

    this.logger.log(`[StockTrackingService] 追踪 ${id} 删除完成`);
  }

  async updateStatus(
    id: string,
    userId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    totalNews?: number,
  ): Promise<void> {
    const tracking = await this.findById(id, userId);
    if (!tracking) {
      throw new NotFoundException('Tracking not found');
    }

    const updateData: Partial<StockTracking> = { status };
    if (totalNews !== undefined) {
      updateData.totalNews = totalNews;
    }

    await this.dbService.db
      .update(stockTrackings)
      .set(updateData)
      .where(eq(stockTrackings.id, id));

    this.logger.log(`Updated tracking ${id} status to ${status}`);
  }

  async saveNews(
    trackingId: string,
    stockCode: string,
    newsItems: FetchNewsResult['news'],
    userId: string,
  ): Promise<number> {
    let savedCount = 0;

    for (const item of newsItems) {
      try {
        const [existing] = await this.dbService.db
          .select({ id: news.id })
          .from(news)
          .where(eq(news.title, item.title))
          .limit(1);

        if (existing) {
          this.logger.debug(`News already exists: ${item.title}`);
          continue;
        }

        const newNews: NewNews = {
          title: item.title,
          content: item.content,
          source: item.source,
          originalUrl: '',
          uniqueKey: `${stockCode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          publishTime: new Date(item.publishTime),
          analyzeStatus: 'pending',
          vectorizeStatus: 'pending',
        };

        await this.dbService.db.insert(news).values(newNews);
        savedCount++;
      } catch (error) {
        this.logger.error(`Failed to save news: ${item.title}`, error);
      }
    }

    await this.updateStatus(trackingId, userId, 'completed', savedCount);

    this.logger.log(`Saved ${savedCount} news items for tracking ${trackingId}`);
    return savedCount;
  }

  async getTrackingNews(trackingId: string, stockCode: string) {
    const newsList = await this.dbService.db
      .select({
        id: news.id,
        title: news.title,
        content: news.content,
        source: news.source,
        publishTime: news.publishTime,
        analyzeStatus: news.analyzeStatus,
      })
      .from(news)
      .where(sql`${news.uniqueKey} LIKE ${stockCode + '_%'}`)
      .orderBy(desc(news.publishTime))
      .limit(100);

    return newsList;
  }

  async queueNewsForAnalysis(trackingId: string, stockCode: string): Promise<number> {
    const pendingNews = await this.dbService.db
      .select({
        id: news.id,
        title: news.title,
        publishTime: news.publishTime,
      })
      .from(news)
      .where(
        and(
          eq(news.analyzeStatus, 'pending'),
          sql`${news.uniqueKey} LIKE ${stockCode + '_%'}`,
        ),
      )
      .orderBy(news.publishTime);

    this.logger.log(`Found ${pendingNews.length} pending news for stock ${stockCode} in tracking ${trackingId}`);

    for (const newsItem of pendingNews) {
      try {
        await this.queueService.sendMessage(QUEUE_NAMES.EVENT_ANALYZE, {
          newsId: newsItem.id,
          stockCode,
          skipWebhook: true,
        });
      } catch (error) {
        this.logger.error(`Failed to queue news ${newsItem.id} for analysis`, error);
      }
    }

    return pendingNews.length;
  }

  async generateResearchReport(
    trackingId: string,
    stockCode: string,
    stockName: string,
    userId: string,
  ): Promise<string> {
    this.logger.log(`[StockTrackingService] 开始生成研投报告，股票: ${stockName} (${stockCode})`);

    const newsList = await this.getTrackingNews(trackingId, stockCode);

    const signalsList = await this.getTrackingSignals(stockCode);

    const backtestResult = await this.getLatestBacktestResult();

    const report = await this.callAIForReport(
      stockCode,
      stockName,
      newsList,
      signalsList,
      backtestResult,
    );

    await this.dbService.db
      .update(stockTrackings)
      .set({
        report,
        reportGeneratedAt: new Date(),
      })
      .where(eq(stockTrackings.id, trackingId));

    this.logger.log(`[StockTrackingService] 研投报告生成完成并保存`);
    return report;
  }

  async getResearchReport(trackingId: string, userId: string): Promise<string | null> {
    const [tracking] = await this.dbService.db
      .select({ report: stockTrackings.report })
      .from(stockTrackings)
      .where(and(eq(stockTrackings.id, trackingId), eq(stockTrackings.userId, userId)))
      .limit(1);

    return tracking?.report || null;
  }

  private async getTrackingSignals(stockCode: string) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const signalsList = await this.dbService.db
      .select({
        id: signals.id,
        direction: signals.direction,
        confidence: signals.confidence,
        sentiment: signals.sentiment,
        reasoning: signals.reasoning,
        signalTime: signals.signalTime,
      })
      .from(signals)
      .where(
        and(
          eq(signals.stockCode, stockCode),
          gte(signals.signalTime, oneYearAgo),
        ),
      )
      .orderBy(desc(signals.signalTime))
      .limit(20);

    return signalsList.map(s => ({
      direction: s.direction ?? '',
      confidence: s.confidence ?? 0,
      sentiment: s.sentiment ?? '',
      reasoning: s.reasoning ?? '',
    }));
  }

  private async getLatestBacktestResult() {
    const [record] = await this.dbService.db
      .select({
        totalTrades: backtestRecords.totalTrades,
        winningTrades: backtestRecords.winningTrades,
        losingTrades: backtestRecords.losingTrades,
        winRate: backtestRecords.winRate,
        totalReturnPct: backtestRecords.totalReturnPct,
        maxDrawdownPct: backtestRecords.maxDrawdownPct,
        avgReturnPct: backtestRecords.avgReturnPct,
      })
      .from(backtestRecords)
      .orderBy(desc(backtestRecords.createdAt))
      .limit(1);

    return record || null;
  }

  private async callAIForReport(
    stockCode: string,
    stockName: string,
    newsList: Array<{ title: string; content: string; source: string; publishTime: Date }>,
    signalsList: Array<{ direction: string; confidence: number; sentiment: string; reasoning: string }>,
    backtestResult: {
      totalTrades: number;
      winningTrades: number;
      losingTrades: number;
      winRate: string | null;
      totalReturnPct: string | null;
      maxDrawdownPct: string | null;
      avgReturnPct: string | null;
    } | null,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('VOLCENGINE_API_KEY');
    if (!apiKey) {
      throw new Error('VOLCENGINE_API_KEY not configured');
    }

    const newsSummary = newsList.slice(0, 10).map((n, i) =>
      `${i + 1}. ${n.title} (${n.source})`
    ).join('\n');

    const bullishCount = signalsList.filter(s => s.direction === 'bullish' || s.direction === 'buy').length;
    const bearishCount = signalsList.filter(s => s.direction === 'bearish' || s.direction === 'sell').length;
    const avgConfidence = signalsList.length > 0
      ? (signalsList.reduce((sum, s) => sum + s.confidence, 0) / signalsList.length).toFixed(1)
      : 0;

    const backtestSummary = backtestResult
      ? `回测结果：总交易 ${backtestResult.totalTrades} 笔，胜率 ${backtestResult.winRate ? (parseFloat(backtestResult.winRate) * 100).toFixed(1) : 'N/A'}%，总收益率 ${backtestResult.totalReturnPct ? (parseFloat(backtestResult.totalReturnPct) * 100).toFixed(1) : 'N/A'}%，最大回撤 ${backtestResult.maxDrawdownPct ? (parseFloat(backtestResult.maxDrawdownPct) * 100).toFixed(1) : 'N/A'}%`
      : '暂无回测数据';

    const systemPrompt = `你是专业的股票投资分析师，基于提供的新闻、信号和回测数据生成简洁的研投报告。

要求：
1. 报告长度控制在 200 字左右
2. 包含：市场 sentiment、关键新闻影响、信号分析、投资建议
3. 语言专业、简洁、有洞察力
4. 投资建议要明确（买入/卖出/观望）

输出格式：直接返回报告文本，不要包含标题或格式标记。`;

    const userPrompt = `请为 ${stockName} (${stockCode}) 生成研投报告：

【近期新闻摘要】
${newsSummary || '暂无新闻数据'}

【信号统计】
- 看涨信号：${bullishCount} 个
- 看跌信号：${bearishCount} 个
- 平均置信度：${avgConfidence}%

【回测数据】
${backtestSummary}

请生成 200 字左右的投资分析报告。`;

    try {
      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'doubao-seed-2-0-lite-260215',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from API');
      }

      return content.trim();
    } catch (error) {
      this.logger.error(`Failed to generate report: ${error instanceof Error ? error.message : String(error)}`);
      return `基于对 ${stockName}(${stockCode}) 的分析，近期共有 ${signalsList.length} 个交易信号，其中看涨 ${bullishCount} 个，看跌 ${bearishCount} 个。${backtestSummary}。建议关注该股票的后续走势，结合自身风险承受能力做出投资决策。`;
    }
  }
}
