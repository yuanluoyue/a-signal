import client from './client';

export interface StrategyAnalytics {
  strategyId: string;
  strategyName: string;
  enabled: boolean;
  directionMode: string;
  totalTrades: number;
  totalProfit: number;
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  avgReturn: number;
  avgHoldingTime: number | null;
}

export interface EquityCurvePoint {
  time: string;
  cumulativeProfit: number;
  tradeType: string;
  stockCode: string;
}

export interface SimulationTradeItem {
  id: string;
  accountId: string;
  stockCode: string;
  stockName: string;
  type: string;
  quantity: number;
  price: string;
  totalAmount: string;
  profit: string | null;
  closeReason: string | null;
  tradeSource: string;
  strategyId: string | null;
  tradeTime: string;
  createdAt: string;
}

export interface SimulationPositionItem {
  id: string;
  accountId: string;
  stockCode: string;
  stockName: string;
  quantity: number;
  avgCost: string;
  currentPrice: string | null;
  marketValue: string | null;
  profit: string;
  return: string;
  takeProfitPrice: string | null;
  stopLossPrice: string | null;
  tradeSource: string;
  strategyId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyDetailAnalytics {
  strategy: {
    id: string;
    name: string;
    description: string | null;
    enabled: boolean;
    directionMode: string;
    minScore: string;
    maxScore: string | null;
    holdPeriod: number;
    stopLossPct: string | null;
    takeProfitPct: string | null;
    maxSignalsPerDay: number | null;
    maxPositions: number | null;
    [key: string]: unknown;
  };
  runtime: {
    accountId: string | null;
    webhookId: string | null;
    enableWebhook: boolean;
    enableSimulation: boolean;
    enableLiveTrading: boolean;
    accountName: string | null;
    webhookName: string | null;
  } | null;
  metrics: StrategyAnalytics;
  equityCurve: EquityCurvePoint[];
  recentTrades: SimulationTradeItem[];
  recentPositions: SimulationPositionItem[];
}

export async function getStrategiesAnalytics(): Promise<StrategyAnalytics[]> {
  return client.get('/strategies/analytics');
}

export async function getStrategyDetailAnalytics(id: string): Promise<StrategyDetailAnalytics> {
  return client.get(`/strategies/${id}/analytics`);
}
