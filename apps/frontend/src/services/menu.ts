import client from './client';
import type { MenuItem, CreateMenuRequest, UpdateMenuRequest } from './types';

export const menuApi = {
  getMyMenus: async (): Promise<MenuItem[]> => {
    const response = await client.get<MenuItem[]>('/menus/my');
    return response as unknown as MenuItem[];
  },

  getAllMenus: async (): Promise<MenuItem[]> => {
    const response = await client.get<MenuItem[]>('/menus');
    return response as unknown as MenuItem[];
  },

  create: async (data: CreateMenuRequest): Promise<MenuItem> => {
    const response = await client.post<MenuItem>('/menus', data);
    return response as unknown as MenuItem;
  },

  update: async (id: string, data: UpdateMenuRequest): Promise<MenuItem> => {
    const response = await client.put<MenuItem>(`/menus/${id}`, data);
    return response as unknown as MenuItem;
  },

  updateSort: async (id: string, sort: number): Promise<MenuItem> => {
    const response = await client.put<MenuItem>(`/menus/${id}/sort`, { sort });
    return response as unknown as MenuItem;
  },

  delete: async (id: string): Promise<MenuItem> => {
    const response = await client.delete<MenuItem>(`/menus/${id}`);
    return response as unknown as MenuItem;
  },
};
