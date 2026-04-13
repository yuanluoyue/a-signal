import client from './client';
import type {
  Signal,
  Kline,
  SignalsListQueryParams,
  SignalsListResponse,
  KlinesQueryParams,
  SignalKlinesResponse,
  KlinePeriod,
} from './types';

export const signalsApi = {
  getSignalsList: async (params?: SignalsListQueryParams): Promise<SignalsListResponse> => {
    const response = await client.get<SignalsListResponse>('/signals', { params });
    return response as unknown as SignalsListResponse;
  },

  getSignalById: async (id: string): Promise<Signal> => {
    const response = await client.get<{ data: Signal }>(`/signals/${id}`);
    return (response as unknown as { data: Signal }).data;
  },

  getSignalKlines: async (
    id: string,
    params?: KlinesQueryParams
  ): Promise<SignalKlinesResponse> => {
    const response = await client.get<SignalKlinesResponse>(`/signals/${id}/klines`, { params });
    return response as unknown as SignalKlinesResponse;
  },

  fetchKlines: async (id: string, data?: { period?: KlinePeriod }): Promise<void> => {
    await client.post(`/signals/${id}/fetch-klines`, data);
  },
};
