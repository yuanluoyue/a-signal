import api from '@/services/api';
import {
  News,
  Signal,
  NewsListQueryParams,
  NewsListResponse,
} from './types';

export const newsApi = {
  /**
   * 获取新闻列表（支持分页和筛选）
   */
  getNewsList: async (params?: NewsListQueryParams): Promise<NewsListResponse> => {
    const response = await api.get<NewsListResponse>('/news', { params });
    return response as unknown as NewsListResponse;
  },

  /**
   * 根据 ID 获取新闻详情
   */
  getNewsById: async (id: string): Promise<News> => {
    const response = await api.get<{ data: News }>(`/news/${id}`);
    return (response as unknown as { data: News }).data;
  },

  /**
   * 手动触发新闻分析任务
   */
  analyzeNews: async (id: string): Promise<void> => {
    await api.post(`/news/${id}/analyze`);
  },

  /**
   * 获取新闻关联的信号列表
   */
  getNewsSignals: async (id: string): Promise<Signal[]> => {
    const response = await api.get<{ data: Signal[]; total: number }>(`/news/${id}/signals`);
    return (response as unknown as { data: Signal[] }).data;
  },

  /**
   * 触发新闻抓取任务
   */
  crawlNews: async (pages?: number): Promise<void> => {
    await api.post('/news/crawl', null, {
      params: pages ? { pages } : undefined,
    });
  },
};
