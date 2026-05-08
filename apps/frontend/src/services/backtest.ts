import client from './client';
import type {
  BacktestRecord,
  BacktestTrade,
  StrategyBacktestRequest,
  BacktestRecordsQueryParams,
} from './types';

export const backtestApi = {
  runBacktest: async (data: StrategyBacktestRequest): Promise<BacktestRecord> => {
    const response = await client.post<{ data: BacktestRecord }>('/backtest', data);
    return (response as unknown as { data: BacktestRecord }).data;
  },

  getRecords: async (params?: BacktestRecordsQueryParams): Promise<BacktestRecord[]> => {
    const response = await client.get<{ data: BacktestRecord[] }>('/backtest/records', { params });
    return (response as unknown as { data: BacktestRecord[] }).data;
  },

  getRecordById: async (id: string): Promise<BacktestRecord> => {
    const response = await client.get<{ data: BacktestRecord }>(`/backtest/records/${id}`);
    return (response as unknown as { data: BacktestRecord }).data;
  },

  getRecordTrades: async (id: string): Promise<BacktestTrade[]> => {
    const response = await client.get<{ data: BacktestTrade[] }>(`/backtest/records/${id}/trades`);
    return (response as unknown as { data: BacktestTrade[] }).data;
  },

  deleteRecord: async (id: string): Promise<void> => {
    await client.delete(`/backtest/records/${id}`);
  },
};
