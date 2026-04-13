import client from './client';
import type {
  News,
  Signal,
  NewsListQueryParams,
  NewsListResponse,
} from './types';

export const newsApi = {
  getNewsList: async (params?: NewsListQueryParams): Promise<NewsListResponse> => {
    const response = await client.get<NewsListResponse>('/news', { params });
    return response as unknown as NewsListResponse;
  },

  getNewsById: async (id: string): Promise<News> => {
    const response = await client.get<{ data: News }>(`/news/${id}`);
    return (response as unknown as { data: News }).data;
  },

  analyzeNews: async (id: string): Promise<void> => {
    await client.post(`/news/${id}/analyze`);
  },

  getNewsSignals: async (id: string): Promise<Signal[]> => {
    const response = await client.get<{ data: Signal[]; total: number }>(`/news/${id}/signals`);
    return (response as unknown as { data: Signal[] }).data;
  },

  crawlNews: async (pages?: number): Promise<void> => {
    await client.post('/news/crawl', null, {
      params: pages ? { pages } : undefined,
    });
  },

  vectorizeNews: async (id: string): Promise<void> => {
    await client.post(`/news/${id}/vectorize`);
  },

  batchVectorize: async (): Promise<{ count: number }> => {
    const response = await client.post<{ count: number }>('/news/batch-vectorize');
    return response as unknown as { count: number };
  },

  getVectorizeProgress: async (): Promise<{
    pending: number;
    vectorizing: number;
    vectorized: number;
    failed: number;
  }> => {
    const response = await client.get<{
      pending: number;
      vectorizing: number;
      vectorized: number;
      failed: number;
    }>('/news/vectorize-progress');
    return response as unknown as {
      pending: number;
      vectorizing: number;
      vectorized: number;
      failed: number;
    };
  },
};
