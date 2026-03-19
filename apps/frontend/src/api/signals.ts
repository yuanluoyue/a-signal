import api from '@/services/api';
import {
  Signal,
  Kline,
  SignalsListQueryParams,
  SignalsListResponse,
  KlinesQueryParams,
  SignalKlinesResponse,
  KlinePeriod,
} from './types';

export const signalsApi = {
  /**
   * 获取信号列表（支持分页和筛选）
   */
  getSignalsList: async (params?: SignalsListQueryParams): Promise<SignalsListResponse> => {
    const response = await api.get<SignalsListResponse>('/signals', { params });
    return response as unknown as SignalsListResponse;
  },

  /**
   * 根据 ID 获取信号详情
   */
  getSignalById: async (id: string): Promise<Signal> => {
    const response = await api.get<{ data: Signal }>(`/signals/${id}`);
    return (response as unknown as { data: Signal }).data;
  },

  /**
   * 获取信号关联的K线数据
   */
  getSignalKlines: async (
    id: string,
    params?: KlinesQueryParams
  ): Promise<SignalKlinesResponse> => {
    const response = await api.get<SignalKlinesResponse>(`/signals/${id}/klines`, { params });
    return response as unknown as SignalKlinesResponse;
  },

  /**
   * 手动触发获取K线数据任务
   */
  fetchKlines: async (id: string, data?: { period?: KlinePeriod }): Promise<void> => {
    await api.post(`/signals/${id}/fetch-klines`, data);
  },
};
