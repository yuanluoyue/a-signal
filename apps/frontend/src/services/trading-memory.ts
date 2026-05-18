import client from './client';
import type {
  TradingMemory,
  TradingMemoriesListQueryParams,
  TradingMemoriesListResponse,
  TradingMemoryStatsResponse,
} from './types';

export const tradingMemoryApi = {
  getList: async (params?: TradingMemoriesListQueryParams): Promise<TradingMemoriesListResponse> => {
    const response = await client.get<TradingMemoriesListResponse>('/trading-memory', { params });
    return response as unknown as TradingMemoriesListResponse;
  },

  getStats: async (): Promise<TradingMemoryStatsResponse> => {
    const response = await client.get<TradingMemoryStatsResponse>('/trading-memory/stats');
    return response as unknown as TradingMemoryStatsResponse;
  },

  getById: async (id: string): Promise<TradingMemory> => {
    const response = await client.get<{ data: TradingMemory }>(`/trading-memory/${id}`);
    return (response as unknown as { data: TradingMemory }).data;
  },

  invalidate: async (id: string): Promise<TradingMemory> => {
    const response = await client.patch<{ data: TradingMemory }>(`/trading-memory/${id}/invalidate`);
    return (response as unknown as { data: TradingMemory }).data;
  },
};
