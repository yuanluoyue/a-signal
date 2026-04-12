import { Module } from '@nestjs/common';
import { DbModule } from '../../core/db/db.module.js';
import { McpService } from './mcp.service.js';
import { McpGuard } from './mcp.guard.js';
import { McpLoggerService } from './mcp-logger.service.js';
import { RateLimiterService } from './rate-limiter.service.js';
import { ApiKeyModule } from '../api-key/api-key.module.js';
import { NewsModule } from '../news/news.module.js';
import { SignalsModule } from '../signals/signals.module.js';
import { BacktestModule } from '../backtest/backtest.module.js';
import {
  QueryNewsTool,
  QuerySignalsTool,
  QueryBacktestTool,
} from './tools/index.js';

@Module({
  imports: [DbModule, ApiKeyModule, NewsModule, SignalsModule, BacktestModule],
  providers: [
    McpService,
    McpGuard,
    McpLoggerService,
    RateLimiterService,
    QueryNewsTool,
    QuerySignalsTool,
    QueryBacktestTool,
  ],
  exports: [McpService],
})
export class McpModule {}
