import client from './client';
import type {
  Webhook,
  SchedulerTask,
  CreateWebhookData,
  UpdateWebhookData,
  WebhooksListResponse,
  SchedulerTasksListResponse,
} from './types';

export const webhooksApi = {
  getWebhooks: async (): Promise<Webhook[]> => {
    const response = await client.get<WebhooksListResponse>('/webhooks');
    return (response as unknown as WebhooksListResponse).data;
  },

  createWebhook: async (data: CreateWebhookData): Promise<Webhook> => {
    const response = await client.post<{ data: Webhook }>('/webhooks', data);
    return (response as unknown as { data: Webhook }).data;
  },

  updateWebhook: async (id: string, data: UpdateWebhookData): Promise<Webhook> => {
    const response = await client.put<{ data: Webhook }>(`/webhooks/${id}`, data);
    return (response as unknown as { data: Webhook }).data;
  },

  deleteWebhook: async (id: string): Promise<void> => {
    await client.delete(`/webhooks/${id}`);
  },

  testWebhook: async (id: string): Promise<void> => {
    await client.post(`/webhooks/${id}/test`);
  },

  toggleWebhook: async (id: string): Promise<Webhook> => {
    const response = await client.put<{ data: Webhook }>(`/webhooks/${id}/toggle`);
    return (response as unknown as { data: Webhook }).data;
  },
};

export const schedulerTasksApi = {
  getSchedulerTasks: async (): Promise<SchedulerTask[]> => {
    const response = await client.get<SchedulerTasksListResponse>('/scheduler-tasks');
    return (response as unknown as SchedulerTasksListResponse).data;
  },

  toggleSchedulerTask: async (id: string): Promise<SchedulerTask> => {
    const response = await client.put<{ data: SchedulerTask }>(`/scheduler-tasks/${id}/toggle`);
    return (response as unknown as { data: SchedulerTask }).data;
  },

  triggerSchedulerTask: async (id: string): Promise<void> => {
    await client.post(`/scheduler-tasks/${id}/trigger`);
  },
};
