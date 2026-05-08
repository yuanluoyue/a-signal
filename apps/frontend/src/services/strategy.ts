import client from './client';
import type {
  Strategy,
  StrategiesListQueryParams,
  StrategiesListResponse,
  CreateStrategyParams,
  UpdateStrategyParams,
} from './types';

export const strategyApi = {
  getStrategiesList: async (params?: StrategiesListQueryParams): Promise<StrategiesListResponse> => {
    const response = await client.get<StrategiesListResponse>('/strategies', { params });
    return response as unknown as StrategiesListResponse;
  },

  getStrategyById: async (id: string): Promise<Strategy> => {
    const response = await client.get<{ data: Strategy }>(`/strategies/${id}`);
    return (response as unknown as { data: Strategy }).data;
  },

  createStrategy: async (params: CreateStrategyParams): Promise<Strategy> => {
    const response = await client.post<{ data: Strategy }>('/strategies', params);
    return (response as unknown as { data: Strategy }).data;
  },

  updateStrategy: async (id: string, params: UpdateStrategyParams): Promise<Strategy> => {
    const response = await client.put<{ data: Strategy }>(`/strategies/${id}`, params);
    return (response as unknown as { data: Strategy }).data;
  },
};
