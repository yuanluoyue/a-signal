import client from './client';

export interface LlmLog {
  id: string;
  module: string;
  task: string;
  provider: string;
  model: string;
  userId: string;
  requestId: string;
  traceId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: string;
  latencyMs: number;
  success: boolean;
  errorMessage: string;
  retryCount: number;
  cacheHit: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface LlmLogQueryDto {
  page?: number;
  pageSize?: number;
  module?: string;
  task?: string;
  provider?: string;
  model?: string;
  success?: string;
  startDate?: string;
  endDate?: string;
}

export interface LlmLogListResponse {
  data: LlmLog[];
  total: number;
}

export const llmApi = {
  getTodayStats: () => client.get('/llm/stats/today'),
  getModuleUsage: (params?: { startDate?: string; endDate?: string }) =>
    client.get('/llm/stats/module-usage', { params }),
  getProviderUsage: (params?: { startDate?: string; endDate?: string }) =>
    client.get('/llm/stats/provider-usage', { params }),
  getLatencyStats: (params?: { startDate?: string; endDate?: string }) =>
    client.get('/llm/stats/latency', { params }),
  getProviderConfigs: () => client.get('/llm/provider-configs'),
  updateProviderConfig: (provider: string, data: Record<string, unknown>) =>
    client.put(`/llm/provider-configs/${provider}`, data),
  createProviderConfig: (data: Record<string, unknown>) =>
    client.post('/llm/provider-configs', data),

  getLogList: async (params: LlmLogQueryDto): Promise<LlmLogListResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.pageSize) query.append('pageSize', String(params.pageSize));
    if (params.module) query.append('module', params.module);
    if (params.task) query.append('task', params.task);
    if (params.provider) query.append('provider', params.provider);
    if (params.model) query.append('model', params.model);
    if (params.success) query.append('success', params.success);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    const queryString = query.toString();
    return client.get(`/llm/logs${queryString ? `?${queryString}` : ''}`);
  },

  getLogDetail: async (id: string): Promise<LlmLog> => {
    return client.get(`/llm/logs/${id}`);
  },
};
