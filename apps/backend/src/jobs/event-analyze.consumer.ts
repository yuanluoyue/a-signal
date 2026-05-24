import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { QueueConsumer } from '../core/queue/queue.consumer.js';
import { QueueMessage } from '../core/queue/queue.types.js';
import { QUEUE_NAMES } from '../core/queue/queue.constants.js';
import { RedisService } from '../core/redis/redis.service.js';
import { LlmService } from '../modules/llm/gateway/llm.service.js';
import { EventOutput, EventOutputSchema, NewsEventAnalysisSchema, NewsAnalysisInput } from '../core/volcengine/volcengine.service.js';
import { DbService } from '../core/db/db.service.js';
import { EventService, CreateEventDto } from '../modules/event/event.service.js';
import { SignalGeneratorService } from '../modules/signal-generator/signal-generator.service.js';
import { NewsFilterAgentService } from '../modules/news-filter-agent/news-filter-agent.service.js';
import { news, News } from '../core/db/schema.js';
import { filterAStockSubjects } from '../common/utils/stock.utils.js';
import { SensitiveContentError } from '../common/errors/index.js';

export interface EventAnalyzeMessage {
  newsId: string;
  stockCode?: string;
}

@Injectable()
export class EventAnalyzeConsumer extends QueueConsumer {
  protected readonly logger = new Logger(EventAnalyzeConsumer.name);

  constructor(
    protected readonly redisService: RedisService,
    private readonly llmService: LlmService,
    private readonly dbService: DbService,
    private readonly eventService: EventService,
    private readonly signalGeneratorService: SignalGeneratorService,
    private readonly newsFilterAgentService: NewsFilterAgentService,
  ) {
    super(redisService, {
      queueName: QUEUE_NAMES.EVENT_ANALYZE,
      concurrency: 1,
      maxRetries: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  protected async processMessage<T>(message: QueueMessage<T>): Promise<void> {
    const data = message.data as EventAnalyzeMessage;
    const { newsId, stockCode } = data;

    this.logger.log(`[EventAnalyzeConsumer] Processing event analysis for newsId: ${newsId}${stockCode ? `, stockCode: ${stockCode}` : ''}`);

    try {
      const newsItem = await this.fetchNewsById(newsId);
      if (!newsItem) {
        this.logger.warn(`[EventAnalyzeConsumer] News not found: ${newsId}`);
        return;
      }

      if (newsItem.analyzeStatus === 'analyzed') {
        this.logger.log(`[EventAnalyzeConsumer] News ${newsId} already analyzed, skipping`);
        return;
      }

      if (newsItem.analyzeStatus === 'filtered') {
        this.logger.log(`[EventAnalyzeConsumer] News ${newsId} already filtered, skipping`);
        return;
      }

      if (newsItem.analyzeStatus !== 'analyzing') {
        const filterResult = await this.newsFilterAgentService.filterNews(newsId, newsItem.title);
        if (filterResult.decision === 'skip') {
          await this.updateNewsAnalyzeStatus(newsId, 'filtered');
          this.logger.log(`[EventAnalyzeConsumer] News ${newsId} filtered out by agent`);
          return;
        }
      }

      this.logger.log(`[EventAnalyzeConsumer] Starting event extraction for news ${newsId}`);
      const analysisResult = await this.extractEventsFromNews({
        newsTitle: newsItem.title,
        newsContent: newsItem.content,
        publishTime: newsItem.publishTime.toISOString(),
      });
      this.logger.log(`[EventAnalyzeConsumer] Event extraction completed for news ${newsId}, got ${analysisResult.events.length} events`);

      const createdEvents = await this.saveEvents(newsItem, analysisResult.events, stockCode);

      for (const event of createdEvents) {
        try {
          await this.signalGeneratorService.generateSignalsFromEvent(event);
        } catch (error) {
          this.logger.error(
            `Failed to generate signals for event ${event.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      await this.updateNewsAnalyzeStatus(newsId, 'analyzed');

      this.logger.log(`[EventAnalyzeConsumer] Successfully analyzed news ${newsId}, generated ${analysisResult.events.length} events`);
    } catch (error) {
      if (error instanceof SensitiveContentError) {
        this.logger.warn(
          `[EventAnalyzeConsumer] News ${newsId} contains sensitive content, marking as failed without retry`,
        );
        await this.updateNewsAnalyzeStatus(newsId, 'failed');
        return;
      }
      
      this.logger.error(
        `[EventAnalyzeConsumer] Failed to analyze news ${newsId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.updateNewsAnalyzeStatus(newsId, 'failed');
      throw error;
    }
  }

  private async extractEventsFromNews(input: NewsAnalysisInput) {
    const { newsTitle, newsContent, publishTime } = input;

    const systemPrompt = `你是专业的金融事件分析师，基于提供的新闻内容提取标准化金融事件。

提取规则：
1. 分析依据：优先参考新闻标题，结合正文内容，不添加任何外部信息
2. 一条新闻最多提取0-3个事件，只关注中国A股市场相关事件
3. 事件分类(category)必须为：macro(宏观经济)、policy(政策法规)、company(公司事件)、market(市场异动)、sentiment(情绪指标)
4. 子分类(subcategory)：根据事件性质自定义，如：earnings(业绩)、dividend(分红)、shareholder_change(股东变动)、product_launch(产品发布)、contract(合同)、investment(投资)等
5. subjects：只提取中国A股市场相关的标的，type必须为stock，code必须是6位数字的A股股票代码（如：000001、600000、300001、688001等），weight为关联度0~1。不要提取港股、美股、债券、基金等非A股标的。
6. sentimentDirection：-1利空/0中性/1利好
7. sentimentConfidence：0~1，LLM判断的可信度
8. sentimentRationale：简短理由，不超过50字
9. importanceScore：0~1，绝对重要性
10. surpriseScore：-1~1，负值不及预期，正值超预期（如无预期对比则不填）
11. effectiveDecayType：step(阶梯)/linear(线性)/exponential(指数)
12. effectivePeriodDays：预计影响持续天数
13. metrics：如事件包含具体数字（如营收增长率），必须提取

输出格式要求：
必须返回有效的JSON格式，结构如下：
{
  "events": [
    {
      "category": "macro|policy|company|market|sentiment",
      "subcategory": "自定义子分类",
      "subjects": [{"type": "stock", "code": "000001", "weight": 1.0}],
      "sentimentDirection": -1|0|1,
      "sentimentConfidence": 0.0~1.0,
      "sentimentRationale": "不超过50字的理由",
      "importanceScore": 0.0~1.0,
      "importanceBenchmark": "global_daily|historical_similar",
      "surpriseScore": -1.0~1.0,
      "surpriseBaseline": "预期基准描述",
      "effectiveDecayType": "step|linear|exponential",
      "effectivePeriodDays": 1~365,
      "metrics": [{"name": "指标名", "value": 0, "unit": "单位", "yoyChange": 0}]
    }
  ]
}`;

    const userPrompt = `新闻标题：${newsTitle}
新闻内容：${newsContent}
${publishTime ? `发布时间：${publishTime}` : ''}

请分析以上新闻，提取标准化金融事件。`;

    const response = await this.llmService.chatCompletion({
      module: 'news-analysis',
      task: 'event-extraction',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      maxTokens: 3000,
      responseFormat: { type: 'json_object' },
    });

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse JSON response');
      }
    }

    const validatedResult = NewsEventAnalysisSchema.parse(parsedData);
    return validatedResult;
  }

  private async fetchNewsById(newsId: string): Promise<News | null> {
    try {
      const [result] = await this.dbService.db
        .select()
        .from(news)
        .where(eq(news.id, newsId));

      return result || null;
    } catch (error) {
      this.logger.error(
        `Failed to fetch news ${newsId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async saveEvents(newsItem: News, eventOutputs: EventOutput[], stockCode?: string) {
    if (eventOutputs.length === 0) {
      this.logger.log(`No events generated for news ${newsItem.id}`);
      return [];
    }

    try {
      const eventDtos = eventOutputs
        .map((eventOutput) => {
          let filteredSubjects = filterAStockSubjects(eventOutput.subjects);
          
          if (stockCode) {
            filteredSubjects = filteredSubjects.filter(
              (subject) => subject.code === stockCode,
            );
          }
          
          if (filteredSubjects.length === 0) {
            this.logger.log(
              `Event ${eventOutput.category}/${eventOutput.subcategory} has no valid subjects${stockCode ? ` for stock ${stockCode}` : ''}, skipping`,
            );
            return null;
          }

          const limitedSubjects = filteredSubjects.slice(0, 3);

          const effectivePeriodStart = new Date(newsItem.publishTime);
          let effectivePeriodEnd: Date | undefined;
          if (eventOutput.effectivePeriodDays) {
            effectivePeriodEnd = new Date(effectivePeriodStart.getTime() + eventOutput.effectivePeriodDays * 24 * 60 * 60 * 1000);
          }

          return {
            newsId: newsItem.id,
            occurredAt: new Date(newsItem.publishTime),
            category: eventOutput.category,
            subcategory: eventOutput.subcategory,
            subjects: limitedSubjects,
            sentimentDirection: eventOutput.sentimentDirection,
            sentimentConfidence: eventOutput.sentimentConfidence,
            sentimentRationale: eventOutput.sentimentRationale,
            importanceScore: eventOutput.importanceScore,
            importanceBenchmark: eventOutput.importanceBenchmark,
            surpriseScore: eventOutput.surpriseScore,
            surpriseBaseline: eventOutput.surpriseBaseline,
            effectivePeriodStart,
            effectivePeriodEnd,
            effectiveDecayType: eventOutput.effectiveDecayType,
            metrics: eventOutput.metrics,
            sourceUrl: newsItem.originalUrl,
            sourceTitle: newsItem.title,
            sourceSummary: newsItem.content.substring(0, 500),
            sourcePublisher: newsItem.source,
          };
        })
        .filter((dto): dto is NonNullable<typeof dto> => dto !== null) as CreateEventDto[];

      const results = await this.eventService.createEventsBatch(eventDtos);
      this.logger.log(`Saved ${results.length} events for news ${newsItem.id}${stockCode ? ` (filtered by stock ${stockCode})` : ''}`);
      return results;
    } catch (error) {
      this.logger.error(
        `Failed to save events for news ${newsItem.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async updateNewsAnalyzeStatus(newsId: string, status: 'analyzed' | 'failed' | 'filtered'): Promise<void> {
    try {
      await this.dbService.db
        .update(news)
        .set({ analyzeStatus: status })
        .where(eq(news.id, newsId));

      this.logger.log(`Updated news ${newsId} analyzeStatus to ${status}`);
    } catch (error) {
      this.logger.error(
        `Failed to update news ${newsId} status: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
