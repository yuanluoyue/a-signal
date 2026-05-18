import { Module, forwardRef } from '@nestjs/common';
import { DbModule } from '../../core/db/db.module.js';
import { VectorModule } from '../../core/vector/vector.module.js';
import { LlmModule } from '../llm/llm.module.js';
import { NewsModule } from '../news/news.module.js';
import { SimulationModule } from '../simulation/simulation.module.js';
import { SignalsModule } from '../signals/signals.module.js';
import { StockTrackingModule } from '../stock-tracking/stock-tracking.module.js';
import { BacktestModule } from '../backtest/backtest.module.js';
import { TradingMemoryModule } from '../trading-memory/trading-memory.module.js';

import { ResearchAgentService } from './research-agent.service.js';
import { AgentGraph } from './graph/agent-graph.js';

import { MemoryService } from './memory/memory.service.js';
import { PgMemoryRepository } from './memory/pg-memory.repository.js';
import { VectorMemoryService } from './memory/vector-memory.service.js';

import {
  ToolRegistryService,
  GetNewsByDateRangeTool,
  SearchNewsByKeywordTool,
  GetUserPortfolioTool,
  GetSignalsByDateRangeTool,
  GetReportsByStockTool,
  GetBacktestByStockTool,
} from './tools/index.js';

import { TradingAgentService } from './trading/trading-agent.service.js';
import { TradingAgentGraph } from './trading/graph.js';

@Module({
  imports: [
    DbModule,
    VectorModule,
    LlmModule,
    forwardRef(() => NewsModule),
    SimulationModule,
    forwardRef(() => SignalsModule),
    forwardRef(() => StockTrackingModule),
    BacktestModule,
    TradingMemoryModule,
  ],
  providers: [
    ResearchAgentService,
    AgentGraph,

    MemoryService,
    PgMemoryRepository,
    VectorMemoryService,

    ToolRegistryService,
    GetNewsByDateRangeTool,
    SearchNewsByKeywordTool,
    GetUserPortfolioTool,
    GetSignalsByDateRangeTool,
    GetReportsByStockTool,
    GetBacktestByStockTool,

    TradingAgentService,
    TradingAgentGraph,
  ],
  exports: [ResearchAgentService, TradingAgentService],
})
export class AgentModule {}
