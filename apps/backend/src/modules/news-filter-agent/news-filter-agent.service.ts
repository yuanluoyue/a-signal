import { Injectable, Logger } from '@nestjs/common';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { z } from 'zod';
import { DbService } from '../../core/db/db.service.js';
import { LlmService } from '../llm/gateway/llm.service.js';
import { newsFilterAgentConfigs, newsFilterAgentLogs } from '../../core/db/schema.js';

const NewsFilterResultSchema = z.object({
  decision: z.enum(['analyze', 'skip']),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
});

const DEFAULT_PROMPT = `你是一个金融新闻过滤器。你的任务是根据新闻标题判断这条新闻是否值得进行深度金融事件分析。

判断标准：
1. 新闻是否与金融市场、股票、经济政策相关
2. 新闻是否可能包含影响交易决策的信息
3. 新闻是否涉及上市公司、行业政策、宏观经济等

应该跳过（skip）的新闻类型：
- 纯娱乐、体育新闻
- 与金融市场无关的社会新闻
- 重复或无实质内容的新闻
- 广告或推广内容

应该通过（analyze）的新闻类型：
- 上市公司相关新闻（业绩、并购、重组等）
- 宏观经济政策新闻（利率、GDP、通胀等）
- 行业政策变化新闻
- 市场行情相关新闻
- 国际贸易、地缘政治对市场有影响的新闻

请根据新闻标题做出判断，返回 JSON 格式结果。

新闻标题：{newsTitle}`;

@Injectable()
export class NewsFilterAgentService {
  private readonly logger = new Logger(NewsFilterAgentService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly llmService: LlmService,
  ) {}

  async getConfig() {
    const [config] = await this.dbService.db
      .select()
      .from(newsFilterAgentConfigs)
      .limit(1);

    if (!config) {
      return {
        id: null as string | null,
        enabled: false,
        prompt: DEFAULT_PROMPT,
      };
    }
    return config;
  }

  async updateConfig(dto: { enabled?: boolean; prompt?: string }) {
    const existing = await this.getConfig();

    if (existing.id) {
      await this.dbService.db
        .update(newsFilterAgentConfigs)
        .set({
          ...dto,
          updatedAt: new Date(),
        })
        .where(eq(newsFilterAgentConfigs.id, existing.id));
      return this.getConfig();
    }

    const [created] = await this.dbService.db
      .insert(newsFilterAgentConfigs)
      .values({
        enabled: dto.enabled ?? false,
        prompt: dto.prompt ?? DEFAULT_PROMPT,
      })
      .returning();
    return created;
  }

  async filterNews(newsId: string, newsTitle: string) {
    const config = await this.getConfig();

    if (!config.enabled) {
      return { decision: 'analyze' as const, reasoning: '过滤 Agent 未启用', confidence: 0 };
    }

    try {
      const prompt = (config.prompt || DEFAULT_PROMPT).replace('{newsTitle}', newsTitle);

      const response = await this.llmService.chatCompletion({
        module: 'news-filter',
        task: 'filter',
        messages: [
          { role: 'system', content: '你必须返回 JSON 格式的结果，包含 decision（analyze 或 skip）、reasoning（字符串）和 confidence（0-1 的数字）三个字段。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        maxTokens: 500,
        responseFormat: { type: 'json_object' },
      });

      let parsed: unknown;
      try {
        parsed = JSON.parse(response);
      } catch {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse JSON response');
        }
      }

      const result = NewsFilterResultSchema.parse(parsed);

      await this.dbService.db.insert(newsFilterAgentLogs).values({
        newsId,
        newsTitle,
        decision: result.decision,
        reasoning: result.reasoning,
        confidence: result.confidence.toString(),
      });

      this.logger.log(`[NewsFilterAgentService] Filter result for news ${newsId}: ${result.decision} (confidence: ${result.confidence})`);

      return result;
    } catch (error) {
      this.logger.error(
        `[NewsFilterAgentService] Filter failed for news ${newsId}: ${error instanceof Error ? error.message : String(error)}`,
      );

      await this.dbService.db.insert(newsFilterAgentLogs).values({
        newsId,
        newsTitle,
        decision: 'analyze',
        reasoning: 'LLM 调用失败，默认通过',
        confidence: '0',
      });

      return { decision: 'analyze' as const, reasoning: 'LLM 调用失败，默认通过', confidence: 0 };
    }
  }

  async getLogs(query: { decision?: string; page?: number; pageSize?: number }) {
    const { decision, page = 1, pageSize = 20 } = query;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (decision) {
      conditions.push(eq(newsFilterAgentLogs.decision, decision));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.dbService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(newsFilterAgentLogs)
      .where(whereClause || sql`1=1`);
    const total = Number(countResult?.count || 0);

    const data = await this.dbService.db
      .select()
      .from(newsFilterAgentLogs)
      .where(whereClause || sql`1=1`)
      .orderBy(desc(newsFilterAgentLogs.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { data, total, page, pageSize };
  }

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [result] = await this.dbService.db
      .select({
        total: sql<number>`COUNT(*)`,
        analyzed: sql<number>`COUNT(*) FILTER (WHERE ${newsFilterAgentLogs.decision} = 'analyze')`,
        skipped: sql<number>`COUNT(*) FILTER (WHERE ${newsFilterAgentLogs.decision} = 'skip')`,
      })
      .from(newsFilterAgentLogs)
      .where(gte(newsFilterAgentLogs.createdAt, todayStart));

    const total = Number(result?.total || 0);
    const analyzed = Number(result?.analyzed || 0);
    const skipped = Number(result?.skipped || 0);
    const skipRate = total > 0 ? Math.round((skipped / total) * 100) : 0;

    return { total, analyzed, skipped, skipRate };
  }

  getDefaultPrompt() {
    return DEFAULT_PROMPT;
  }
}
