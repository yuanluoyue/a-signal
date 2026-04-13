import client from './client';
import type {
  DashboardStats,
  RecentSignalItem,
  RecentSignalsResponse,
} from './types';

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await client.get<DashboardStats>('/dashboard/stats');
    return response as unknown as DashboardStats;
  },

  getRecentSignals: async (limit?: number): Promise<RecentSignalItem[]> => {
    const response = await client.get<RecentSignalsResponse>('/dashboard/recent-signals', {
      params: limit ? { limit } : undefined,
    });
    return (response as unknown as RecentSignalsResponse).data;
  },
};
