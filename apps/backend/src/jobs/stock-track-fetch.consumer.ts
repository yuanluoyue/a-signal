import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { QueueConsumer } from '../core/queue/queue.consumer.js';
import { QueueMessage } from '../core/queue/queue.types.js';
import { QUEUE_NAMES } from '../core/queue/queue.constants.js';
import { StockTrackingService } from '../modules/stock-tracking/stock-tracking.service.js';
import { NewsService } from '../modules/news/news.service.js';

const VOLCENGINE_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const MODEL_NAME = 'doubao-seed-2-0-lite-260215';

const NewsItemSchema = z.object({
  title: z.string().describe('新闻标题'),
  summary: z.string().describe('新闻摘要，150字以内'),
  publishDate: z.string().describe('新闻实际发布日期，格式：YYYY-MM-DD，必须是新闻的真实发布时间'),
  source: z.string().describe('新闻来源，如：东方财富、新浪财经、腾讯财经、财联社等'),
});

const NewsListSchema = z.object({
  news: z.array(NewsItemSchema).max(100).describe('新闻列表'),
});

export type NewsItem = z.infer<typeof NewsItemSchema>;
export type NewsListResult = z.infer<typeof NewsListSchema>;

export interface StockTrackFetchTask {
  trackingId: string;
  userId: string;
}

@Injectable()
export class StockTrackFetchConsumer extends QueueConsumer {
  constructor(
    protected readonly configService: ConfigService,
    private readonly stockTrackingService: StockTrackingService,
    private readonly newsService: NewsService,
  ) {
    super(configService, {
      queueName: QUEUE_NAMES.STOCK_TRACK_FETCH,
      prefetch: 1,
      autoAck: false,
      maxRetries: 3,
    });
  }

  async processMessage<T>(message: QueueMessage<T>): Promise<void> {
    const task = message.data as StockTrackFetchTask;
    this.logger.log(`[StockTrackFetchConsumer] 开始处理股票追踪任务，trackingId: ${task.trackingId}`);

    try {
      const tracking = await this.stockTrackingService.findById(task.trackingId, task.userId);
      if (!tracking) {
        this.logger.error(`[StockTrackFetchConsumer] 追踪记录不存在，trackingId: ${task.trackingId}`);
        return;
      }

      const { stockCode, stockName } = tracking;
      this.logger.log(`[StockTrackFetchConsumer] 获取历史新闻，股票: ${stockName} (${stockCode})`);

      const newsList = await this.fetchHistoricalNews(stockCode, stockName);

      let savedCount = 0;
      for (const news of newsList.news) {
        try {
          await this.newsService.saveNews({
            title: news.title,
            content: news.summary,
            originalUrl: `tracking_${task.trackingId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            publishTime: new Date(news.publishDate),
            uniqueKey: `${stockCode}_${news.title}_${news.publishDate}`,
          });
          savedCount++;
        } catch (error) {
          this.logger.error(`[StockTrackFetchConsumer] 保存新闻失败: ${news.title}`, error);
        }
      }

      await this.stockTrackingService.updateStatus(task.trackingId, task.userId, 'completed', savedCount);

      this.logger.log(`[StockTrackFetchConsumer] 成功保存 ${savedCount} 条新闻，股票: ${stockName}`);
    } catch (error) {
      this.logger.error(
        `[StockTrackFetchConsumer] 处理任务失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.stockTrackingService.updateStatus(task.trackingId, task.userId, 'failed');
      throw error;
    }
  }

  private async fetchHistoricalNews(stockCode: string, stockName: string): Promise<NewsListResult> {
    const apiKey = this.getApiKey();

    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    const todayStr = today.toISOString().split('T')[0];
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    const formatInstructions = `你必须以JSON格式返回结果，格式如下：
{
  "news": [
    {
      "title": "新闻标题",
      "summary": "新闻摘要（150字以内）",
      "publishDate": "YYYY-MM-DD",
      "source": "新闻来源"
    }
  ]
}`;

    const systemPrompt = `你是一个专业的财经新闻搜索助手。请基于你的知识库搜索股票代码 ${stockCode} 在过去一年（${oneYearAgoStr} 至 ${todayStr}）的相关新闻。

重要要求：
1. 搜索最近一年的新闻，最多返回100条
2. 每条新闻必须包含真实的信息：
   - title: 新闻标题
   - summary: 新闻摘要（150字以内）
   - publishDate: 新闻的实际发布日期（格式：YYYY-MM-DD），必须是该新闻真实发布的时间，不能是今天
   - source: 新闻来源（如：东方财富、新浪财经、腾讯财经、财联社、证券时报、上海证券报等）
3. 新闻必须与该股票直接相关
4. 按时间倒序排列（最新的在前）
5. 来源要多样化，不要只来自一个网站

${formatInstructions}

注意：
- 只返回JSON格式的数据，不要包含任何其他文字说明
- publishDate 必须是新闻的真实发布日期，不能是当前日期
- source 必须是真实的新闻来源网站名称`;

    const userPrompt = `请搜索股票 ${stockCode}（${stockName || ''}）在过去一年的相关财经新闻。

要求：
1. 返回真实的新闻数据，包括准确的发布日期和来源
2. 来源多样化（东方财富、新浪财经、腾讯财经、财联社等）
3. 按时间倒序排列
4. 最多返回100条`;

    const requestBody = {
      model: MODEL_NAME,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    };

    try {
      this.logger.log(`[StockTrackFetchConsumer] 调用 Doubao API，股票: ${stockName}`);

      const response = await fetch(VOLCENGINE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Doubao API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
        error?: {
          message?: string;
        };
      };

      if (data.error) {
        throw new Error(`Doubao API error: ${data.error.message}`);
      }

      let content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Doubao API');
      }

      this.logger.log(`[StockTrackFetchConsumer] 收到 API 响应，长度: ${content.length}`);

      content = content.trim();
      if (content.startsWith('```json')) {
        content = content.slice(7);
      } else if (content.startsWith('```')) {
        content = content.slice(3);
      }
      if (content.endsWith('```')) {
        content = content.slice(0, -3);
      }
      content = content.trim();

      let parsedData: unknown;
      try {
        parsedData = JSON.parse(content);
      } catch {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse JSON response from Doubao API');
        }
      }

      const validatedResult = NewsListSchema.parse(parsedData);

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      validatedResult.news.forEach((news, index) => {
        if (news.publishDate === today || news.publishDate === yesterday) {
          this.logger.warn(`[StockTrackFetchConsumer] 新闻 ${index + 1} 的日期可能是当前日期: ${news.publishDate}`);
        }
      });

      this.logger.log(`[StockTrackFetchConsumer] 成功获取 ${validatedResult.news.length} 条新闻`);

      return validatedResult;
    } catch (error) {
      this.logger.error(
        `[StockTrackFetchConsumer] 获取历史新闻失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private getApiKey(): string {
    const apiKey = this.configService.get<string>('VOLCENGINE_API_KEY');
    if (!apiKey) {
      throw new Error('VOLCENGINE_API_KEY environment variable is not set');
    }
    return apiKey;
  }
}
