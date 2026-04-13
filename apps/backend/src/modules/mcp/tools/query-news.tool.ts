import { Injectable, Logger } from '@nestjs/common';
import { NewsService } from '../../news/news.service.js';
import { McpToolDefinition, McpToolProperty } from '../mcp.types.js';
import { AnalyzeStatus } from '../../../interfaces/admin/news/dto/news-list-query.dto.js';

@Injectable()
export class QueryNewsTool {
  private readonly logger = new Logger(QueryNewsTool.name);

  constructor(private readonly newsService: NewsService) {}

  getDefinition(): McpToolDefinition {
    const properties: Record<string, McpToolProperty> = {
      page: {
        type: 'number',
        description: '页码，默认1',
        default: 1,
      },
      pageSize: {
        type: 'number',
        description: '每页数量，默认20',
        default: 20,
      },
      source: {
        type: 'string',
        description: '新闻来源筛选',
      },
      analyzeStatus: {
        type: 'string',
        description: '分析状态筛选',
        enum: ['pending', 'analyzing', 'analyzed', 'failed'],
      },
    };

    return {
      name: 'query_news',
      description: '查询财经新闻列表，支持分页和筛选',
      inputSchema: {
        type: 'object',
        properties,
      },
    };
  }

  async execute(args: Record<string, unknown>): Promise<unknown> {
    this.logger.debug(`[QueryNewsTool] Executing with args: ${JSON.stringify(args)}`);

    try {
      const result = await this.newsService.getNewsList({
        page: (args.page as number) || 1,
        pageSize: (args.pageSize as number) || 20,
        source: args.source as string | undefined,
        analyzeStatus: args.analyzeStatus as AnalyzeStatus | undefined,
      });

      return {
        data: result.data.map((item) => ({
          id: item.id,
          title: item.title,
          content: item.content.slice(0, 500),
          source: item.source,
          publishTime: item.publishTime,
          analyzeStatus: item.analyzeStatus,
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      };
    } catch (error) {
      this.logger.error(`[QueryNewsTool] Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
