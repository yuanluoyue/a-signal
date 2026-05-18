import client from './client';
import type {
  TradingAgentDecision,
  TradingAgentStats,
  TradingAgentRuntime,
} from './types';

export type { TradingAgentRuntime } from './types';

export interface TradingAgentDecisionsQueryParams {
  page?: number;
  pageSize?: number;
  decision?: 'approved' | 'rejected';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface TradingAgentDecisionsResponse {
  data: TradingAgentDecision[];
  total: number;
  page: number;
  pageSize: number;
}

export const tradingAgentApi = {
  getStats: async (): Promise<TradingAgentStats> => {
    const response = await client.get<TradingAgentStats>('/trading-agent/stats');
    return response as unknown as TradingAgentStats;
  },

  getDecisions: async (params?: TradingAgentDecisionsQueryParams): Promise<TradingAgentDecisionsResponse> => {
    const response = await client.get<TradingAgentDecisionsResponse>('/trading-agent/decisions', { params });
    return response as unknown as TradingAgentDecisionsResponse;
  },

  getDecisionById: async (id: string): Promise<TradingAgentDecision> => {
    const response = await client.get<TradingAgentDecision>(`/trading-agent/decisions/${id}`);
    return response as unknown as TradingAgentDecision;
  },

  getRuntime: async (): Promise<TradingAgentRuntime> => {
    const response = await client.get<TradingAgentRuntime>('/trading-agent/runtime');
    return response as unknown as TradingAgentRuntime;
  },

  updateRuntime: async (params: Partial<Pick<TradingAgentRuntime, 'status' | 'accountId'>>): Promise<TradingAgentRuntime> => {
    const response = await client.put<TradingAgentRuntime>('/trading-agent/runtime', params);
    return response as unknown as TradingAgentRuntime;
  },
};
