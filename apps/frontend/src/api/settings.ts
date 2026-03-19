import api from '@/services/api';
import {
  Webhook,
  SchedulerTask,
  CreateWebhookData,
  UpdateWebhookData,
  WebhooksListResponse,
  SchedulerTasksListResponse,
} from './types';

/**
 * Webhook 管理 API
 */
export const webhooksApi = {
  /**
   * 获取 Webhook 列表
   */
  getWebhooks: async (): Promise<Webhook[]> => {
    const response = await api.get<WebhooksListResponse>('/webhooks');
    return (response as unknown as WebhooksListResponse).data;
  },

  /**
   * 创建 Webhook
   */
  createWebhook: async (data: CreateWebhookData): Promise<Webhook> => {
    const response = await api.post<{ data: Webhook }>('/webhooks', data);
    return (response as unknown as { data: Webhook }).data;
  },

  /**
   * 更新 Webhook
   */
  updateWebhook: async (id: string, data: UpdateWebhookData): Promise<Webhook> => {
    const response = await api.put<{ data: Webhook }>(`/webhooks/${id}`, data);
    return (response as unknown as { data: Webhook }).data;
  },

  /**
   * 删除 Webhook
   */
  deleteWebhook: async (id: string): Promise<void> => {
    await api.delete(`/webhooks/${id}`);
  },

  /**
   * 测试 Webhook
   */
  testWebhook: async (id: string): Promise<void> => {
    await api.post(`/webhooks/${id}/test`);
  },

  /**
   * 启用/禁用 Webhook
   */
  toggleWebhook: async (id: string): Promise<Webhook> => {
    const response = await api.put<{ data: Webhook }>(`/webhooks/${id}/toggle`);
    return (response as unknown as { data: Webhook }).data;
  },
};

/**
 * 定时任务管理 API
 */
export const schedulerTasksApi = {
  /**
   * 获取定时任务列表
   */
  getSchedulerTasks: async (): Promise<SchedulerTask[]> => {
    const response = await api.get<SchedulerTasksListResponse>('/scheduler-tasks');
    return (response as unknown as SchedulerTasksListResponse).data;
  },

  /**
   * 启用/禁用定时任务
   */
  toggleSchedulerTask: async (id: string): Promise<SchedulerTask> => {
    const response = await api.put<{ data: SchedulerTask }>(`/scheduler-tasks/${id}/toggle`);
    return (response as unknown as { data: SchedulerTask }).data;
  },

  /**
   * 手动触发定时任务
   */
  triggerSchedulerTask: async (id: string): Promise<void> => {
    await api.post(`/scheduler-tasks/${id}/trigger`);
  },
};
