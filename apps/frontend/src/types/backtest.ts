/**
 * 回测分析类型定义
 */

import { SignalType } from './signal';

export interface BacktestFilter {
  dateRange: [string, string];
  confidenceRange: [number, number];
  signalTypes: SignalType[];
  takeProfitPercent: number;
  stopLossPercent: number;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  type: SignalType;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  exitReason: 'take_profit' | 'stop_loss' | 'signal';
}

export interface BacktestResult {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalReturn: number;
  totalReturnPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  trades: BacktestTrade[];
}

export interface BacktestRequest {
  startDate: string;
  endDate: string;
  minConfidence: number;
  maxConfidence: number;
  signalTypes: SignalType[];
  takeProfitPercent: number;
  stopLossPercent: number;
}

export interface BacktestResponse {
  success: boolean;
  data: BacktestResult;
  timestamp: string;
}
