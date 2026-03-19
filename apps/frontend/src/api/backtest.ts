import api from '@/services/api';
import {
  BacktestRequest,
  BacktestResult,
} from './types';

export const backtestApi = {
  /**
   * 执行回测
   * @param data 回测请求参数
   * @returns 回测结果
   */
  runBacktest: async (data: BacktestRequest): Promise<BacktestResult> => {
    const response = await api.post<BacktestResult>('/backtest', data);
    return response as unknown as BacktestResult;
  },
};
