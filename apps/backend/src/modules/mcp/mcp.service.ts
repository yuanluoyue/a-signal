import { Injectable, Logger } from '@nestjs/common';
import { McpLoggerService } from './mcp-logger.service.js';
import { RateLimiterService } from './rate-limiter.service.js';
import { ApiKeyService } from '../api-key/api-key.service.js';
import { QueryNewsTool, QuerySignalsTool, QueryBacktestTool } from './tools/index.js';
import { McpToolDefinition, McpToolCallRequest, McpToolCallResponse } from './mcp.types.js';

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(
    private readonly mcpLoggerService: McpLoggerService,
    private readonly rateLimiterService: RateLimiterService,
    private readonly apiKeyService: ApiKeyService,
    private readonly queryNewsTool: QueryNewsTool,
    private readonly querySignalsTool: QuerySignalsTool,
    private readonly queryBacktestTool: QueryBacktestTool,
  ) {}

  private getTools(): Map<string, { definition: McpToolDefinition; handler: (args: Record<string, unknown>) => Promise<unknown> }> {
    const tools = new Map<string, { definition: McpToolDefinition; handler: (args: Record<string, unknown>) => Promise<unknown> }>();

    tools.set('query_news', {
      definition: this.queryNewsTool.getDefinition(),
      handler: (args) => this.queryNewsTool.execute(args),
    });

    tools.set('query_signals', {
      definition: this.querySignalsTool.getDefinition(),
      handler: (args) => this.querySignalsTool.execute(args),
    });

    tools.set('query_backtest', {
      definition: this.queryBacktestTool.getDefinition(),
      handler: (args) => this.queryBacktestTool.execute(args),
    });

    return tools;
  }

  async listTools(): Promise<McpToolDefinition[]> {
    this.logger.debug('[McpService] Listing available tools');
    const tools = this.getTools();
    return Array.from(tools.values()).map((t) => t.definition);
  }

  async callTool(
    apiKeyId: string,
    request: McpToolCallRequest,
  ): Promise<McpToolCallResponse> {
    const startTime = Date.now();
    const { name, arguments: args } = request;

    this.logger.log(`[McpService] Tool call: ${name}`);

    try {
      const allowed = await this.rateLimiterService.checkRateLimit(apiKeyId);
      if (!allowed) {
        this.mcpLoggerService.logToolCall(apiKeyId, name, args, null, startTime, true);
        return {
          content: [{ type: 'text', text: 'Rate limit exceeded. Please try again later.' }],
          isError: true,
        };
      }

      const tools = this.getTools();
      const tool = tools.get(name);

      if (!tool) {
        this.mcpLoggerService.logToolCall(apiKeyId, name, args, null, startTime, true);
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
      }

      const result = await tool.handler(args || {});

      this.mcpLoggerService.logToolCall(apiKeyId, name, args, result, startTime, false);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error(`[McpService] Tool call error: ${error instanceof Error ? error.message : String(error)}`);
      this.mcpLoggerService.logToolCall(apiKeyId, name, args, null, startTime, true);

      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  async validateApiKey(key: string): Promise<string | null> {
    const apiKey = await this.apiKeyService.validateKey(key);
    return apiKey?.id || null;
  }
}
