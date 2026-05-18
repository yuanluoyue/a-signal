export interface PositionInfo {
  stockCode: string;
  stockName: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  profit: number;
  returnPct: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
}

export interface AccountInfo {
  accountId: string;
  availableCash: number;
  currentCapital: number;
  totalProfit: number;
  totalReturn: number;
  positions: PositionInfo[];
}

export interface SignalInfo {
  signalId: string;
  stockCode: string;
  stockName: string;
  action: string;
  score: number;
  reason: string;
  eventId?: string;
  ruleId?: string;
}

export interface StrategyInfo {
  strategyId: string;
  name: string;
  directionMode: string;
  minScore: number;
  maxScore: number | null;
  holdPeriod: number;
  stopLossPct: number | null;
  takeProfitPct: number | null;
  eventCategories: string[] | null;
}

export interface RelevantMemory {
  id: string;
  type: string;
  title: string;
  summary: string;
  confidence: number;
  status: string;
}

export interface PositionAction {
  action: 'buy' | 'sell';
  stockCode: string;
  stockName: string;
  quantity: number;
  price?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
}

export type TradingAgentDecisionType = 'execute' | 'reject' | 'adjust_position' | 'close_position' | 'modify_holding';
export type TradingAgentDecision = 'approved' | 'rejected';
export type TradingAgentRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface TradingAgentState {
  userId: string;
  accountId: string;
  signalId: string;
  strategyId?: string;

  accountInfo?: AccountInfo;
  signalInfo?: SignalInfo;
  strategyInfo?: StrategyInfo;
  relevantMemories?: RelevantMemory[];
  currentPositions?: PositionInfo[];

  riskLevel?: TradingAgentRiskLevel;
  conflictInfo?: string;
  concentrationInfo?: string;

  decisionType?: TradingAgentDecisionType;
  decision?: TradingAgentDecision;
  rationale?: string;
  confidence?: number;
  positionAction?: PositionAction;

  executionResult?: { success: boolean; error?: string };
  memoryCreated?: boolean;
  newMemoryData?: Record<string, unknown>;

  error?: string;
}

export const initialTradingAgentState = (
  userId: string,
  accountId: string,
  signalId: string,
  strategyId?: string,
): TradingAgentState => ({
  userId,
  accountId,
  signalId,
  strategyId,
});
