import client from './client';

export type KlinePeriod = '1d' | '4h';

export interface CheckAndUpdateResult {
  updated: boolean;
  latestTime: string | null;
  message: string;
}

export interface BatchUpdateResult {
  stockCodes: string[];
  updated: number;
  failed: number;
}

export const klinesApi = {
  checkAndUpdate: async (stockCode: string, period?: KlinePeriod): Promise<CheckAndUpdateResult | Record<KlinePeriod, CheckAndUpdateResult>> => {
    const params = period ? { period } : {};
    const response = await client.post<{ updated: boolean; latestTime: string | null; message: string } | Record<KlinePeriod, CheckAndUpdateResult>>(
      `/klines/check-and-update/${stockCode}`,
      {},
      { params }
    );
    return response as unknown as CheckAndUpdateResult | Record<KlinePeriod, CheckAndUpdateResult>;
  },

  checkAndUpdateBatch: async (stockCodes: string[]): Promise<BatchUpdateResult> => {
    const response = await client.post<BatchUpdateResult>('/klines/check-and-update-batch', { stockCodes });
    return (response as unknown as BatchUpdateResult);
  },

  getKlines: async (stockCode: string, period: KlinePeriod = '1d') => {
    const response = await client.get<{ data: unknown[]; total: number }>(`/klines/${stockCode}`, {
      params: { period },
    });
    return (response as unknown as { data: unknown[]; total: number });
  },
};
