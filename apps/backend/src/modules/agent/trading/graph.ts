import { Injectable, Logger } from '@nestjs/common';
import { TradingAgentState, initialTradingAgentState } from './types/trading-agent-state.js';
import { SimulationService } from '../../simulation/simulation.service.js';
import { TradingMemoryService } from '../../trading-memory/trading-memory.service.js';
import { VolcengineService } from '../../../core/volcengine/volcengine.service.js';
import { DbService } from '../../../core/db/db.service.js';
import {
  contextLoadNode,
  riskAnalysisNode,
  decisionNode,
  executionNode,
  memoryReviewNode,
  logNode,
} from './nodes/index.js';

@Injectable()
export class TradingAgentGraph {
  private readonly logger = new Logger(TradingAgentGraph.name);

  constructor(
    private readonly simulationService: SimulationService,
    private readonly tradingMemoryService: TradingMemoryService,
    private readonly volcengineService: VolcengineService,
    private readonly dbService: DbService,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    signalId: string,
    strategyId?: string,
  ): Promise<TradingAgentState> {
    this.logger.log(`[TradingAgentGraph] Starting execution for user: ${userId}, account: ${accountId}, signal: ${signalId}, strategy: ${strategyId}`);

    let state: TradingAgentState = initialTradingAgentState(userId, accountId, signalId, strategyId);

    try {
      this.logger.debug('[TradingAgentGraph] Executing contextLoad node');
      const contextResult = await contextLoadNode(
        state,
        this.simulationService,
        this.tradingMemoryService,
        this.dbService,
      );
      state = { ...state, ...contextResult };

      this.logger.debug('[TradingAgentGraph] Executing riskAnalysis node');
      const riskResult = await riskAnalysisNode(state, this.volcengineService);
      state = { ...state, ...riskResult };

      this.logger.debug('[TradingAgentGraph] Executing decision node');
      const decisionResult = await decisionNode(state, this.volcengineService);
      state = { ...state, ...decisionResult };

      if (state.decision === 'approved' && state.positionAction) {
        this.logger.debug('[TradingAgentGraph] Executing execution node');
        const executionResult = await executionNode(state, this.simulationService);
        state = { ...state, ...executionResult };
      } else {
        state = { ...state, executionResult: { success: true } };
      }

      this.logger.debug('[TradingAgentGraph] Executing memoryReview node');
      const memoryResult = await memoryReviewNode(
        state,
        this.volcengineService,
        this.tradingMemoryService,
        this.dbService,
      );
      state = { ...state, ...memoryResult };

      this.logger.debug('[TradingAgentGraph] Executing log node');
      const logResult = await logNode(state, this.dbService);
      state = { ...state, ...logResult };

      this.logger.log(`[TradingAgentGraph] Execution completed, decision: ${state.decision}`);

      return state;
    } catch (error) {
      this.logger.error(
        `[TradingAgentGraph] Execution error: ${error instanceof Error ? error.message : String(error)}`,
      );
      state = { ...state, error: error instanceof Error ? error.message : String(error) };

      try {
        await logNode(state, this.dbService);
      } catch (logError) {
        this.logger.error(
          `[TradingAgentGraph] Failed to log error state: ${logError instanceof Error ? logError.message : String(logError)}`,
        );
      }

      return state;
    }
  }
}
