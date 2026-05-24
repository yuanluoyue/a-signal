import client from './client';
import type { TradingMemoryLogsResponse } from './types';

export const tradingMemoryLogApi = {
  getByMemoryId: async (memoryId: string, params?: { page?: number; pageSize?: number }): Promise<TradingMemoryLogsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.pageSize) queryParams.set('pageSize', String(params.pageSize));
    const query = queryParams.toString();
    const url = query ? `/trading-memory-logs/${memoryId}?${query}` : `/trading-memory-logs/${memoryId}`;
    const response = await client.get<TradingMemoryLogsResponse>(url);
    return response as unknown as TradingMemoryLogsResponse;
  },

  getAll: async (params?: { page?: number; pageSize?: number; action?: string }): Promise<TradingMemoryLogsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params?.action) queryParams.set('action', params.action);
    const query = queryParams.toString();
    const url = query ? `/trading-memory-logs?${query}` : '/trading-memory-logs';
    const response = await client.get<TradingMemoryLogsResponse>(url);
    return response as unknown as TradingMemoryLogsResponse;
  },
};
