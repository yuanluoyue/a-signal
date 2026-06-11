import client from './client';

export interface PeriodicReportContent {
  period: { start: string; end: string; type: 'daily' | 'weekly' };
  strategies: {
    id: string;
    name: string;
    tradeCount: number;
    winRate: number;
    totalProfit: number;
    totalReturn: number;
  }[];
  tradingAgent: {
    decisionCount: number;
    approvedCount: number;
    rejectedCount: number;
    winRate: number;
    totalProfit: number;
  };
  signals: {
    totalCount: number;
    longCount: number;
    shortCount: number;
    holdCount: number;
  };
  overall: {
    totalTrades: number;
    totalProfit: number;
    totalWinRate: number;
  };
}

export interface PeriodicReport {
  id: string;
  type: 'daily' | 'weekly';
  periodStart: string;
  periodEnd: string;
  content: PeriodicReportContent;
  summary: string | null;
  webhookIds: string[] | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PeriodicReportConfig {
  id: string;
  dailyWebhookIds: string[];
  weeklyWebhookIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PeriodicReportsResponse {
  data: PeriodicReport[];
  total: number;
  page: number;
  pageSize: number;
}

export const periodicReportApi = {
  getReports: async (params?: {
    type?: 'daily' | 'weekly';
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<PeriodicReportsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.set('type', params.type);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    const query = queryParams.toString();
    const url = `/periodic-reports${query ? `?${query}` : ''}`;
    const response = await client.get(url);
    return response as unknown as PeriodicReportsResponse;
  },

  getReportById: async (id: string): Promise<PeriodicReport> => {
    const response = await client.get(`/periodic-reports/${id}`);
    return (response as unknown as { data: PeriodicReport }).data;
  },

  getConfig: async (): Promise<PeriodicReportConfig> => {
    const response = await client.get('/periodic-reports/config');
    return (response as unknown as { data: PeriodicReportConfig }).data;
  },

  updateConfig: async (data: { dailyWebhookIds?: string[]; weeklyWebhookIds?: string[] }): Promise<PeriodicReportConfig> => {
    const response = await client.put('/periodic-reports/config', data);
    return (response as unknown as { data: PeriodicReportConfig }).data;
  },

  testPush: async (): Promise<void> => {
    await client.post('/periodic-reports/config/test');
  },

  generateDailyReport: async (): Promise<PeriodicReport> => {
    const response = await client.post('/periodic-reports/generate/daily');
    return (response as unknown as { data: PeriodicReport }).data;
  },

  generateWeeklyReport: async (): Promise<PeriodicReport> => {
    const response = await client.post('/periodic-reports/generate/weekly');
    return (response as unknown as { data: PeriodicReport }).data;
  },
};
