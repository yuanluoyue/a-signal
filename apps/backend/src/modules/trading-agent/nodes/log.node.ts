import { Logger } from '@nestjs/common';
import { TradingAgentState } from '../types/trading-agent-state.js';
import { DbService } from '../../../core/db/db.service.js';
import { tradingAgentDecisions } from '../../../core/db/schema.js';

const logger = new Logger('logNode');

export async function logNode(
  state: TradingAgentState,
  dbService: DbService,
): Promise<Partial<TradingAgentState>> {
  logger.log(`[logNode] Logging decision for signal: ${state.signalId}`);

  try {
    const contextSnapshot = {
      accountInfo: state.accountInfo ? {
        availableCash: state.accountInfo.availableCash,
        currentCapital: state.accountInfo.currentCapital,
        totalProfit: state.accountInfo.totalProfit,
        totalReturn: state.accountInfo.totalReturn,
      } : null,
      signalInfo: state.signalInfo ? {
        stockCode: state.signalInfo.stockCode,
        stockName: state.signalInfo.stockName,
        action: state.signalInfo.action,
        score: state.signalInfo.score,
        reason: state.signalInfo.reason,
      } : null,
      strategyInfo: state.strategyInfo ? {
        name: state.strategyInfo.name,
        directionMode: state.strategyInfo.directionMode,
        minScore: state.strategyInfo.minScore,
        maxScore: state.strategyInfo.maxScore,
        holdPeriod: state.strategyInfo.holdPeriod,
        stopLossPct: state.strategyInfo.stopLossPct,
        takeProfitPct: state.strategyInfo.takeProfitPct,
      } : null,
      riskLevel: state.riskLevel,
      conflictInfo: state.conflictInfo,
      concentrationInfo: state.concentrationInfo,
      relevantMemories: state.relevantMemories?.map((m) => ({
        type: m.type,
        title: m.title,
        confidence: m.confidence,
      })) || [],
      executionResult: state.executionResult,
    };

    await dbService.db.insert(tradingAgentDecisions).values({
      userId: state.userId,
      accountId: state.accountId,
      signalId: state.signalId,
      strategyId: state.strategyId || null,
      decisionType: state.decisionType || null,
      decision: state.decision || null,
      rationale: state.rationale || null,
      confidence: state.confidence !== undefined ? String(state.confidence) : null,
      riskLevel: state.riskLevel || null,
      positionAction: state.positionAction || null,
      contextSnapshot,
      memoryCreated: state.memoryCreated || false,
    });

    logger.log(`[logNode] Decision logged successfully`);
    return {};
  } catch (error) {
    logger.error(`[logNode] Error logging decision: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}
