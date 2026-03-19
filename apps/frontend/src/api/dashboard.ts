import api from '@/services/api';
import {
  DashboardStats,
  RecentSignalItem,
  RecentSignalsResponse,
} from './types';

export const dashboardApi = {
  /**
   * 获取仪表盘统计数据
   */
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/dashboard/stats');
    return response as unknown as DashboardStats;
  },

  /**
   * 获取最近信号
   * @param limit 返回数量限制（默认10条）
   */
  getRecentSignals: async (limit?: number): Promise<RecentSignalItem[]> => {
    const response = await api.get<RecentSignalsResponse>('/dashboard/recent-signals', {
      params: limit ? { limit } : undefined,
    });
    return (response as unknown as RecentSignalsResponse).data;
  },
};
