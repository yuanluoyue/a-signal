import client from './client';

export interface NewsFilterAgentConfig {
  id?: string;
  enabled: boolean;
  prompt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NewsFilterAgentLog {
  id: string;
  newsId: string | null;
  newsTitle: string | null;
  decision: string;
  reasoning: string | null;
  confidence: string | null;
  createdAt: string;
}

export interface NewsFilterAgentStats {
  total: number;
  analyzed: number;
  skipped: number;
  skipRate: number;
}

export interface NewsFilterAgentLogsResponse {
  data: NewsFilterAgentLog[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NewsFilterAgentLogsQueryParams {
  decision?: string;
  page?: number;
  pageSize?: number;
}

export const newsFilterAgentApi = {
  getConfig: async (): Promise<NewsFilterAgentConfig> => {
    const response = await client.get<NewsFilterAgentConfig>('/news-filter-agent/config');
    return response as unknown as NewsFilterAgentConfig;
  },

  updateConfig: async (params: { enabled?: boolean; prompt?: string }): Promise<NewsFilterAgentConfig> => {
    const response = await client.put<NewsFilterAgentConfig>('/news-filter-agent/config', params);
    return response as unknown as NewsFilterAgentConfig;
  },

  getLogs: async (params?: NewsFilterAgentLogsQueryParams): Promise<NewsFilterAgentLogsResponse> => {
    const response = await client.get<NewsFilterAgentLogsResponse>('/news-filter-agent/logs', { params });
    return response as unknown as NewsFilterAgentLogsResponse;
  },

  getStats: async (): Promise<NewsFilterAgentStats> => {
    const response = await client.get<NewsFilterAgentStats>('/news-filter-agent/stats');
    return response as unknown as NewsFilterAgentStats;
  },
};
