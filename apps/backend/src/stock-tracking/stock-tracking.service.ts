import { Injectable, Logger } from '@nestjs/common';
import { eq, desc, and, gte, lte, inArray, sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service.js';
import {
  stockTrackings,
  news,
  signals,
  backtestRecords,
  type NewStockTracking,
  type StockTracking,
  type NewNews,
} from '../database/schema.js';
import { QueueService } from '../queue/queue.service.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';

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
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 获取所有股票追踪
   */
  async findAll(): Promise<StockTracking[]> {
    return this.databaseService.db
      .select()
      .from(stockTrackings)
      .orderBy(desc(stockTrackings.createdAt));
  }

  /**
   * 根据 ID 获取追踪
   */
  async findById(id: string): Promise<StockTracking | null> {
    const [tracking] = await this.databaseService.db
      .select()
      .from(stockTrackings)
      .where(eq(stockTrackings.id, id))
      .limit(1);
    return tracking || null;
  }

  /**
   * 根据股票代码获取追踪
   */
  async findByStockCode(stockCode: string): Promise<StockTracking | null> {
    const [tracking] = await this.databaseService.db
      .select()
      .from(stockTrackings)
      .where(eq(stockTrackings.stockCode, stockCode))
      .limit(1);
    return tracking || null;
  }

  /**
   * 创建股票追踪
   */
  async create(dto: CreateTrackingDto): Promise<StockTracking> {
    // 检查是否已存在
    const existing = await this.findByStockCode(dto.stockCode);
    if (existing) {
      throw new Error(`Stock ${dto.stockCode} is already being tracked`);
    }

    const newTracking: NewStockTracking = {
      stockCode: dto.stockCode,
      stockName: dto.stockName,
      status: 'pending',
      totalNews: 0,
    };

    const [tracking] = await this.databaseService.db
      .insert(stockTrackings)
      .values(newTracking)
      .returning();

    this.logger.log(`Created stock tracking for ${dto.stockCode}`);
    return tracking;
  }

  /**
   * 删除股票追踪及其关联数据
   */
  async delete(id: string): Promise<void> {
    const tracking = await this.findById(id);
    if (!tracking) {
      throw new Error('Tracking not found');
    }

    const { stockCode } = tracking;

    this.logger.log(`[StockTrackingService] 开始删除追踪 ${id} 及其关联数据，股票代码: ${stockCode}`);

    // 1. 删除该股票相关的信号
    const deletedSignals = await this.databaseService.db
      .delete(signals)
      .where(eq(signals.stockCode, stockCode))
      .returning({ id: signals.id });
    this.logger.log(`[StockTrackingService] 删除信号 ${deletedSignals.length} 条`);

    // 2. 删除该追踪相关的新闻（通过 uniqueKey 前缀匹配）
    // 新闻的 uniqueKey 格式: ${stockCode}_${title}_${date}
    const deletedNews = await this.databaseService.db
      .delete(news)
      .where(sql`${news.uniqueKey} LIKE ${stockCode + '_%'}`)
      .returning({ id: news.id });
    this.logger.log(`[StockTrackingService] 删除新闻 ${deletedNews.length} 条`);

    // 3. 删除回测记录（回测记录没有 stockCode，可以选择全部删除或保留）
    // 这里选择保留回测记录，因为回测可能是跨股票的

    // 4. 删除追踪记录
    await this.databaseService.db
      .delete(stockTrackings)
      .where(eq(stockTrackings.id, id));

    this.logger.log(`[StockTrackingService] 追踪 ${id} 删除完成`);
  }

  /**
   * 更新追踪状态
   */
  async updateStatus(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    totalNews?: number,
  ): Promise<void> {
    const updateData: Partial<StockTracking> = { status };
    if (totalNews !== undefined) {
      updateData.totalNews = totalNews;
    }

    await this.databaseService.db
      .update(stockTrackings)
      .set(updateData)
      .where(eq(stockTrackings.id, id));

    this.logger.log(`Updated tracking ${id} status to ${status}`);
  }

  /**
   * 保存获取的新闻
   */
  async saveNews(
    trackingId: string,
    stockCode: string,
    newsItems: FetchNewsResult['news'],
  ): Promise<number> {
    let savedCount = 0;

    for (const item of newsItems) {
      try {
        // 检查是否已存在相同标题的新闻
        const [existing] = await this.databaseService.db
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
          originalUrl: '', // 历史新闻可能没有URL
          uniqueKey: `${stockCode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          publishTime: new Date(item.publishTime),
          analyzeStatus: 'pending',
          vectorizeStatus: 'pending',
        };

        await this.databaseService.db.insert(news).values(newNews);
        savedCount++;
      } catch (error) {
        this.logger.error(`Failed to save news: ${item.title}`, error);
      }
    }

    // 更新追踪的新闻数量
    await this.updateStatus(trackingId, 'completed', savedCount);

    this.logger.log(`Saved ${savedCount} news items for tracking ${trackingId}`);
    return savedCount;
  }

  /**
   * 获取追踪相关的新闻列表
   */
  async getTrackingNews(trackingId: string, stockCode: string) {
    // 获取最近一年内的新闻，按发布时间倒序
    // 通过 uniqueKey 前缀匹配该股票的新闻（格式: ${stockCode}_${title}_${date}）
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const newsList = await this.databaseService.db
      .select({
        id: news.id,
        title: news.title,
        content: news.content,
        source: news.source,
        publishTime: news.publishTime,
        analyzeStatus: news.analyzeStatus,
      })
      .from(news)
      .where(
        and(
          gte(news.publishTime, oneYearAgo),
          sql`${news.uniqueKey} LIKE ${stockCode + '_%'}`, // 通过 uniqueKey 前缀匹配
        ),
      )
      .orderBy(desc(news.publishTime))
      .limit(100);

    return newsList;
  }

  /**
   * 将追踪的新闻发送到分析队列生成信号
   * 历史信号不发送 webhook 通知
   */
  async queueNewsForAnalysis(trackingId: string, stockCode: string): Promise<number> {
    // 获取该追踪下未分析的新闻（最近一年）
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const pendingNews = await this.databaseService.db
      .select({
        id: news.id,
        title: news.title,
        publishTime: news.publishTime,
      })
      .from(news)
      .where(
        and(
          eq(news.analyzeStatus, 'pending'),
          gte(news.publishTime, oneYearAgo),
        ),
      )
      .orderBy(news.publishTime);

    this.logger.log(`Found ${pendingNews.length} pending news for analysis in tracking ${trackingId}`);

    // 发送到分析队列
    for (const newsItem of pendingNews) {
      try {
        await this.queueService.sendMessage(QUEUE_NAMES.NEWS_ANALYZE, {
          newsId: newsItem.id,
          skipWebhook: true, // 历史信号不发送 webhook
        });
      } catch (error) {
        this.logger.error(`Failed to queue news ${newsItem.id} for analysis`, error);
      }
    }

    return pendingNews.length;
  }

  /**
   * 生成研投报告
   */
  async generateResearchReport(
    trackingId: string,
    stockCode: string,
    stockName: string,
  ): Promise<string> {
    this.logger.log(`[StockTrackingService] 开始生成研投报告，股票: ${stockName} (${stockCode})`);

    // 1. 获取相关新闻
    const newsList = await this.getTrackingNews(trackingId, stockCode);

    // 2. 获取生成的信号
    const signalsList = await this.getTrackingSignals(stockCode);

    // 3. 获取回测结果
    const backtestResult = await this.getLatestBacktestResult();

    // 4. 调用 AI 生成报告
    const report = await this.callAIForReport(
      stockCode,
      stockName,
      newsList,
      signalsList,
      backtestResult,
    );

    // 5. 保存报告到数据库
    await this.databaseService.db
      .update(stockTrackings)
      .set({
        report,
        reportGeneratedAt: new Date(),
      })
      .where(eq(stockTrackings.id, trackingId));

    this.logger.log(`[StockTrackingService] 研投报告生成完成并保存`);
    return report;
  }

  /**
   * 获取研投报告
   */
  async getResearchReport(trackingId: string): Promise<string | null> {
    const [tracking] = await this.databaseService.db
      .select({ report: stockTrackings.report })
      .from(stockTrackings)
      .where(eq(stockTrackings.id, trackingId))
      .limit(1);

    return tracking?.report || null;
  }

  /**
   * 获取追踪相关的信号
   */
  private async getTrackingSignals(stockCode: string) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const signalsList = await this.databaseService.db
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

    return signalsList;
  }

  /**
   * 获取最新回测结果
   */
  private async getLatestBacktestResult() {
    const [record] = await this.databaseService.db
      .select({
        totalTrades: backtestRecords.totalTrades,
        winningTrades: backtestRecords.winningTrades,
        losingTrades: backtestRecords.losingTrades,
        winRate: backtestRecords.winRate,
        totalReturn: backtestRecords.totalReturn,
        maxDrawdown: backtestRecords.maxDrawdown,
        avgReturn: backtestRecords.avgReturn,
      })
      .from(backtestRecords)
      .orderBy(desc(backtestRecords.createdAt))
      .limit(1);

    return record || null;
  }

  /**
   * 调用 AI 生成研投报告
   */
  private async callAIForReport(
    stockCode: string,
    stockName: string,
    newsList: Array<{ title: string; content: string; source: string; publishTime: Date }>,
    signalsList: Array<{ direction: string; confidence: number; sentiment: string; reasoning: string }>,
    backtestResult: {
      totalTrades: number;
      winningTrades: number;
      losingTrades: number;
      winRate: string;
      totalReturn: string;
      maxDrawdown: string;
      avgReturn: string;
    } | null,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('VOLCENGINE_API_KEY');
    if (!apiKey) {
      throw new Error('VOLCENGINE_API_KEY not configured');
    }

    // 构建新闻摘要
    const newsSummary = newsList.slice(0, 10).map((n, i) =>
      `${i + 1}. ${n.title} (${n.source})`
    ).join('\n');

    // 构建信号统计
    const bullishCount = signalsList.filter(s => s.direction === 'bullish' || s.direction === 'buy').length;
    const bearishCount = signalsList.filter(s => s.direction === 'bearish' || s.direction === 'sell').length;
    const avgConfidence = signalsList.length > 0
      ? (signalsList.reduce((sum, s) => sum + s.confidence, 0) / signalsList.length).toFixed(1)
      : 0;

    // 构建回测摘要
    const backtestSummary = backtestResult
      ? `回测结果：总交易 ${backtestResult.totalTrades} 笔，胜率 ${(parseFloat(backtestResult.winRate) * 100).toFixed(1)}%，总收益率 ${(parseFloat(backtestResult.totalReturn) * 100).toFixed(1)}%，最大回撤 ${(parseFloat(backtestResult.maxDrawdown) * 100).toFixed(1)}%`
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
      // 返回默认报告
      return `基于对 ${stockName}(${stockCode}) 的分析，近期共有 ${signalsList.length} 个交易信号，其中看涨 ${bullishCount} 个，看跌 ${bearishCount} 个。${backtestSummary}。建议关注该股票的后续走势，结合自身风险承受能力做出投资决策。`;
    }
  }
}
