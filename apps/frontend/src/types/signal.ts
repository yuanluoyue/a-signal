/**
 * 信号类型定义
 */

export type SignalType = 'buy' | 'sell';

export interface Signal {
  id: string;
  symbol: string;
  name?: string;
  type: SignalType;
  price: number;
  change?: number;
  changePercent?: number;
  time: string;
  confidence: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SignalStats {
  total: number;
  today: number;
  pending: number;
}

export interface RecentSignal {
  id: string;
  symbol: string;
  name?: string;
  type: SignalType;
  price: number;
  confidence: number;
  createdAt: string;
}

export interface SignalFilter {
  type?: SignalType[];
  startDate?: string;
  endDate?: string;
  minConfidence?: number;
  maxConfidence?: number;
  symbol?: string;
}

export interface SignalListParams {
  page?: number;
  pageSize?: number;
  type?: SignalType;
  startDate?: string;
  endDate?: string;
  minConfidence?: number;
  maxConfidence?: number;
}

export interface SignalListResponse {
  list: Signal[];
  total: number;
  page: number;
  pageSize: number;
}
