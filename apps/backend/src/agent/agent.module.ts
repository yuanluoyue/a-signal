import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { VectorModule } from '../vector/vector.module.js';
import { VolcengineModule } from '../volcengine/volcengine.module.js';
import { NewsModule } from '../news/news.module.js';
import { SimulationModule } from '../simulation/simulation.module.js';
import { SignalsModule } from '../signals/signals.module.js';
import { StockTrackingModule } from '../stock-tracking/stock-tracking.module.js';
import { BacktestModule } from '../backtest/backtest.module.js';

import { AgentController } from './agent.controller.js';
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

@Module({
  imports: [
    DatabaseModule,
    VectorModule,
    VolcengineModule,
    NewsModule,
    SimulationModule,
    SignalsModule,
    StockTrackingModule,
    BacktestModule,
  ],
  controllers: [AgentController],
  providers: [
    // Services
    ResearchAgentService,
    AgentGraph,

    // Memory
    MemoryService,
    PgMemoryRepository,
    VectorMemoryService,

    // Tools
    ToolRegistryService,
    GetNewsByDateRangeTool,
    SearchNewsByKeywordTool,
    GetUserPortfolioTool,
    GetSignalsByDateRangeTool,
    GetReportsByStockTool,
    GetBacktestByStockTool,
  ],
  exports: [ResearchAgentService],
})
export class AgentModule {}
