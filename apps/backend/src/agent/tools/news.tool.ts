import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool } from './base.tool.js';
import { NewsService } from '../../news/news.service.js';
import { VectorService } from '../../vector/vector.service.js';
import { VolcengineEmbeddingService } from '../../volcengine/volcengine-embedding.service.js';

const GetNewsByDateRangeSchema = z.object({
  startDate: z.string().describe('开始日期，格式: YYYY-MM-DD'),
  endDate: z.string().describe('结束日期，格式: YYYY-MM-DD'),
  limit: z.number().optional().default(10).describe('返回数量限制'),
});

const SearchNewsByKeywordSchema = z.object({
  keyword: z.string().describe('搜索关键词'),
  limit: z.number().optional().default(5).describe('返回数量限制'),
});

type GetNewsByDateRangeInput = z.infer<typeof GetNewsByDateRangeSchema>;
type SearchNewsByKeywordInput = z.infer<typeof SearchNewsByKeywordSchema>;

interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  publishTime: Date;
}

@Injectable()
export class GetNewsByDateRangeTool extends BaseTool<GetNewsByDateRangeInput, NewsItem[]> {
  readonly name = 'get_news_by_date_range';
  readonly description = '按日期范围查询新闻，用于获取特定时间段内的财经新闻';
  readonly inputSchema = GetNewsByDateRangeSchema;

  private readonly logger = new Logger(GetNewsByDateRangeTool.name);

  constructor(private readonly newsService: NewsService) {
    super();
  }

  async execute(input: GetNewsByDateRangeInput): Promise<NewsItem[]> {
    try {
      this.logger.debug(`[GetNewsByDateRangeTool] Executing with input: ${JSON.stringify(input)}`);

      const news = await this.newsService.getNewsList({
        page: 1,
        pageSize: input.limit,
      });

      return news.data.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content.slice(0, 500),
        source: item.source,
        publishTime: item.publishTime,
      }));
    } catch (error) {
      this.logger.error(`[GetNewsByDateRangeTool] Error: ${this.formatError(error)}`);
      throw error;
    }
  }
}

@Injectable()
export class SearchNewsByKeywordTool extends BaseTool<SearchNewsByKeywordInput, NewsItem[]> {
  readonly name = 'search_news_by_keyword';
  readonly description = '使用关键词向量搜索相关新闻，用于查找与特定主题相关的财经新闻';
  readonly inputSchema = SearchNewsByKeywordSchema;

  private readonly logger = new Logger(SearchNewsByKeywordTool.name);

  constructor(
    private readonly vectorService: VectorService,
    private readonly embeddingService: VolcengineEmbeddingService,
  ) {
    super();
  }

  async execute(input: SearchNewsByKeywordInput): Promise<NewsItem[]> {
    try {
      this.logger.debug(`[SearchNewsByKeywordTool] Executing with keyword: ${input.keyword}`);

      const embedding = await this.embeddingService.getTextEmbedding(input.keyword);
      const results = await this.vectorService.similaritySearch(embedding, input.limit);

      return results.map((result) => ({
        id: result.id,
        title: (result.metadata.title as string) || 'Unknown',
        content: (result.metadata.content as string)?.slice(0, 500) || '',
        source: (result.metadata.source as string) || 'Unknown',
        publishTime: new Date((result.metadata.publishTime as string) || Date.now()),
      }));
    } catch (error) {
      this.logger.error(`[SearchNewsByKeywordTool] Error: ${this.formatError(error)}`);
      throw error;
    }
  }
}
