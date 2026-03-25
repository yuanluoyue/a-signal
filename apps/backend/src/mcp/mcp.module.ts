import { Module, OnModuleInit } from '@nestjs/common';
import { McpController } from './mcp.controller.js';
import { McpService } from './mcp.service.js';
import { McpAuthGuard } from './mcp.guard.js';
import { RateLimiterService } from './rate-limiter.service.js';
import { McpLoggerService } from './mcp-logger.service.js';
import { ApiKeyModule } from '../api-key/api-key.module.js';
import { NewsModule } from '../news/news.module.js';
import { SignalsModule } from '../signals/signals.module.js';
import { BacktestModule } from '../backtest/backtest.module.js';
import { VectorModule } from '../vector/vector.module.js';
import { VolcengineModule } from '../volcengine/volcengine.module.js';

// Tools
import {
  QueryRecentNewsTool,
  QueryNewsByKeywordTool,
} from './tools/query-news.tool.js';
import { QueryRecentSignalsTool } from './tools/query-signals.tool.js';
import { QueryBacktestDataTool } from './tools/query-backtest.tool.js';

@Module({
  imports: [
    ApiKeyModule,
    NewsModule,
    SignalsModule,
    BacktestModule,
    VectorModule,
    VolcengineModule,
  ],
  controllers: [McpController],
  providers: [
    McpService,
    McpAuthGuard,
    RateLimiterService,
    McpLoggerService,
    QueryRecentNewsTool,
    QueryNewsByKeywordTool,
    QueryRecentSignalsTool,
    QueryBacktestDataTool,
  ],
})
export class McpModule implements OnModuleInit {
  constructor(
    private readonly mcpService: McpService,
    private readonly queryRecentNewsTool: QueryRecentNewsTool,
    private readonly queryNewsByKeywordTool: QueryNewsByKeywordTool,
    private readonly queryRecentSignalsTool: QueryRecentSignalsTool,
    private readonly queryBacktestDataTool: QueryBacktestDataTool,
  ) {}

  onModuleInit() {
    // 注册所有 MCP Tools
    this.mcpService.registerTool(this.queryRecentNewsTool);
    this.mcpService.registerTool(this.queryNewsByKeywordTool);
    this.mcpService.registerTool(this.queryRecentSignalsTool);
    this.mcpService.registerTool(this.queryBacktestDataTool);
  }
}
