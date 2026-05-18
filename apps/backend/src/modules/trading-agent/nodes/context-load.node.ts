import { Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { TradingAgentState, AccountInfo, PositionInfo, SignalInfo, StrategyInfo, RelevantMemory } from '../types/trading-agent-state.js';
import { SimulationService } from '../../simulation/simulation.service.js';
import { TradingMemoryService } from '../../trading-memory/trading-memory.service.js';
import { DbService } from '../../../core/db/db.service.js';
import { signals, strategies } from '../../../core/db/schema.js';

const logger = new Logger('contextLoadNode');

export async function contextLoadNode(
  state: TradingAgentState,
  simulationService: SimulationService,
  tradingMemoryService: TradingMemoryService,
  dbService: DbService,
): Promise<Partial<TradingAgentState>> {
  logger.log(`[contextLoadNode] Loading context for user: ${state.userId}, account: ${state.accountId}, signal: ${state.signalId}`);

  try {
    const account = await simulationService.getAccountById(state.accountId);
    const positions = await simulationService.getPositions(state.accountId);

    const [signalRow] = await dbService.db
      .select()
      .from(signals)
      .where(eq(signals.id, state.signalId));

    const memoriesResult = await tradingMemoryService.findList({ status: 'active', page: 1, pageSize: 10 });

    let strategyInfo: StrategyInfo | undefined;
    if (state.strategyId) {
      const [strategyRow] = await dbService.db
        .select()
        .from(strategies)
        .where(eq(strategies.id, state.strategyId));
      if (strategyRow) {
        strategyInfo = {
          strategyId: strategyRow.id,
          name: strategyRow.name || '',
          directionMode: strategyRow.directionMode || '',
          minScore: strategyRow.minScore ? parseFloat(strategyRow.minScore) : 0,
          maxScore: strategyRow.maxScore ? parseFloat(strategyRow.maxScore) : null,
          holdPeriod: strategyRow.holdPeriod || 0,
          stopLossPct: strategyRow.stopLossPct ? parseFloat(strategyRow.stopLossPct) : null,
          takeProfitPct: strategyRow.takeProfitPct ? parseFloat(strategyRow.takeProfitPct) : null,
          eventCategories: strategyRow.allowedCategories || null,
        };
      }
    }

    let accountInfo: AccountInfo | undefined;
    let currentPositions: PositionInfo[] = [];

    if (account) {
      accountInfo = {
        accountId: account.id,
        availableCash: parseFloat(account.availableCash),
        currentCapital: parseFloat(account.currentCapital),
        totalProfit: parseFloat(account.totalProfit),
        totalReturn: parseFloat(account.totalReturn),
        positions: [],
      };

      currentPositions = positions.map((p) => ({
        stockCode: p.stockCode,
        stockName: p.stockName,
        quantity: p.quantity,
        avgCost: parseFloat(p.avgCost),
        currentPrice: parseFloat(p.currentPrice || p.avgCost),
        marketValue: parseFloat(p.marketValue || '0'),
        profit: parseFloat(p.profit || '0'),
        returnPct: parseFloat(p.return || '0'),
        takeProfitPrice: p.takeProfitPrice ? parseFloat(p.takeProfitPrice) : undefined,
        stopLossPrice: p.stopLossPrice ? parseFloat(p.stopLossPrice) : undefined,
      }));

      accountInfo.positions = currentPositions;
    }

    let signalInfo: SignalInfo | undefined;
    if (signalRow) {
      signalInfo = {
        signalId: signalRow.id,
        stockCode: signalRow.symbol || signalRow.stockCode || '',
        stockName: signalRow.stockName || '',
        action: signalRow.action || signalRow.direction || '',
        score: signalRow.score ? parseFloat(signalRow.score) : 0,
        reason: signalRow.reason || signalRow.reasoning || '',
        eventId: signalRow.eventId || undefined,
        ruleId: signalRow.ruleId || undefined,
      };
    }

    const relevantMemories: RelevantMemory[] = memoriesResult.data.map((m) => ({
      id: m.id,
      type: m.type || '',
      title: m.title || '',
      summary: m.summary || '',
      confidence: m.confidence ? parseFloat(m.confidence) : 0,
      status: m.status || '',
    }));

    logger.log(`[contextLoadNode] Loaded account: ${!!accountInfo}, positions: ${currentPositions.length}, signal: ${!!signalInfo}, strategy: ${!!strategyInfo}, memories: ${relevantMemories.length}`);

    return {
      accountInfo,
      signalInfo,
      strategyInfo,
      relevantMemories,
      currentPositions,
    };
  } catch (error) {
    logger.error(`[contextLoadNode] Error loading context: ${error instanceof Error ? error.message : String(error)}`);
    return { error: `Context load failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}
