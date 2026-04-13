import client from './client';
import type {
  BacktestRequest,
  BacktestResult,
} from './types';

export const backtestApi = {
  runBacktest: async (data: BacktestRequest): Promise<BacktestResult> => {
    const response = await client.post<BacktestResult>('/backtest', data);
    return response as unknown as BacktestResult;
  },
};
