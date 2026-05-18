import { Module } from '@nestjs/common';
import { DbModule } from '../../core/db/db.module.js';
import { VolcengineModule } from '../../core/volcengine/volcengine.module.js';
import { SimulationModule } from '../simulation/simulation.module.js';
import { TradingMemoryModule } from '../trading-memory/trading-memory.module.js';
import { TradingAgentService } from './trading-agent.service.js';
import { TradingAgentGraph } from './trading-agent-graph.js';

@Module({
  imports: [
    DbModule,
    VolcengineModule,
    SimulationModule,
    TradingMemoryModule,
  ],
  providers: [
    TradingAgentService,
    TradingAgentGraph,
  ],
  exports: [TradingAgentService],
})
export class TradingAgentModule {}
