import client from './client';
import type {
  EventItem,
  EventsListQueryParams,
  EventsListResponse,
  Signal,
} from './types';

export const eventsApi = {
  getEventsList: async (params?: EventsListQueryParams): Promise<EventsListResponse> => {
    const response = await client.get<EventsListResponse>('/events', { params });
    return response as unknown as EventsListResponse;
  },

  getEventById: async (id: string): Promise<EventItem> => {
    const response = await client.get<{ data: EventItem }>(`/events/${id}`);
    return (response as unknown as { data: EventItem }).data;
  },

  getEventSignals: async (id: string): Promise<Signal[]> => {
    const response = await client.get<{ data: Signal[] }>(`/events/${id}/signals`);
    return (response as unknown as { data: Signal[] }).data;
  },

  getUnprocessedEvents: async (): Promise<EventItem[]> => {
    const response = await client.get<{ data: EventItem[] }>('/events/unprocessed');
    return (response as unknown as { data: EventItem[] }).data;
  },

  generateEvents: async (newsId: string): Promise<void> => {
    await client.post(`/news/${newsId}/generate-events`);
  },

  regenerateSignals: async (eventId: string): Promise<{ message: string; count: number }> => {
    const response = await client.post<{ message: string; data: Signal[] }>(`/events/${eventId}/regenerate-signals`);
    return {
      message: (response as unknown as { message: string }).message,
      count: (response as unknown as { data: Signal[] }).data?.length || 0,
    };
  },
};
