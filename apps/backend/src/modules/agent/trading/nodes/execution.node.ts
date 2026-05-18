import { Logger } from '@nestjs/common';
import { TradingAgentState } from '../types/trading-agent-state.js';
import { SimulationService } from '../../../simulation/simulation.service.js';

const logger = new Logger('executionNode');

export async function executionNode(
  state: TradingAgentState,
  simulationService: SimulationService,
): Promise<Partial<TradingAgentState>> {
  logger.log(`[executionNode] Processing execution for signal: ${state.signalId}, decision: ${state.decision}`);

  try {
    if (state.decision !== 'approved' || !state.positionAction) {
      logger.log(`[executionNode] No execution needed, decision: ${state.decision}`);
      return { executionResult: { success: true } };
    }

    const action = state.positionAction;

    if (!action.stockName && state.signalInfo?.stockName) {
      action.stockName = state.signalInfo.stockName;
    }
    if (!action.stockCode && state.signalInfo?.stockCode) {
      action.stockCode = state.signalInfo.stockCode;
    }

    logger.log(`[executionNode] Executing ${action.action} for ${action.stockCode}(${action.stockName}), quantity: ${action.quantity}`);

    const trade = await simulationService.executeTrade({
      accountId: state.accountId,
      stockCode: action.stockCode,
      stockName: action.stockName,
      type: action.action,
      quantity: action.quantity,
      takeProfitPrice: action.takeProfitPrice,
      stopLossPrice: action.stopLossPrice,
      tradeSource: 'agent',
    });

    logger.log(`[executionNode] Trade executed successfully, trade id: ${trade.id}`);

    return {
      executionResult: { success: true },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[executionNode] Execution failed: ${errorMessage}`);
    return {
      executionResult: { success: false, error: errorMessage },
    };
  }
}
