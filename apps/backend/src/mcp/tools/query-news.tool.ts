import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import type { McpTool } from '../mcp.types.js';
import { NewsService } from '../../news/news.service.js';
import { VectorService } from '../../vector/vector.service.js';
import { VolcengineEmbeddingService } from '../../volcengine/volcengine-embedding.service.js';

// Tool 1: query_recent_news
const QueryRecentNewsSchema = z.object({
  limit: z.number().optional().default(10).describe('返回新闻数量限制'),
});

type QueryRecentNewsInput = z.infer<typeof QueryRecentNewsSchema>;

interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  publishTime: Date;
}

@Injectable()
export class QueryRecentNewsTool implements McpTool {
  readonly name = 'query_recent_news';
  readonly description = '查询最近的新闻，用于获取最新的财经新闻列表';
  readonly inputSchema = QueryRecentNewsSchema;

  private readonly logger = new Logger(QueryRecentNewsTool.name);

  constructor(private readonly newsService: NewsService) {}

  async execute(input: QueryRecentNewsInput): Promise<NewsItem[]> {
    this.logger.debug(`[MCP Tool: ${this.name}] Executing with input: ${JSON.stringify(input)}`);

    const news = await this.newsService.getRecentNews(input.limit);

    return news.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content.slice(0, 500),
      source: item.source,
      publishTime: item.publishTime,
    }));
  }
}

// Tool 2: query_news_by_keyword
const QueryNewsByKeywordSchema = z.object({
  keyword: z.string().describe('搜索关键词'),
  limit: z.number().optional().default(5).describe('返回数量限制'),
});

type QueryNewsByKeywordInput = z.infer<typeof QueryNewsByKeywordSchema>;

@Injectable()
export class QueryNewsByKeywordTool implements McpTool {
  readonly name = 'query_news_by_keyword';
  readonly description = '根据关键词搜索新闻，使用向量搜索查找与关键词相关的财经新闻';
  readonly inputSchema = QueryNewsByKeywordSchema;

  private readonly logger = new Logger(QueryNewsByKeywordTool.name);

  constructor(
    private readonly vectorService: VectorService,
    private readonly embeddingService: VolcengineEmbeddingService,
  ) {}

  async execute(input: QueryNewsByKeywordInput): Promise<NewsItem[]> {
    this.logger.debug(`[MCP Tool: ${this.name}] Executing with keyword: ${input.keyword}`);

    const embedding = await this.embeddingService.getTextEmbedding(input.keyword);
    const results = await this.vectorService.similaritySearch(embedding, input.limit);

    return results.map((result) => ({
      id: result.id,
      title: (result.metadata.title as string) || 'Unknown',
      content: ((result.metadata.content as string) || '').slice(0, 500),
      source: (result.metadata.source as string) || 'Unknown',
      publishTime: new Date((result.metadata.publishTime as string) || Date.now()),
    }));
  }
}
