import client from './client';
import type { UsersListResponse, UpdateRoleRequest, UserListItem } from './types';

export interface GetUsersParams {
  keyword?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

export const usersApi = {
  getUsers: async (params?: GetUsersParams): Promise<UsersListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.keyword) queryParams.set('keyword', params.keyword);
    if (params?.role) queryParams.set('role', params.role);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.pageSize) queryParams.set('pageSize', String(params.pageSize));
    const query = queryParams.toString();
    const url = query ? `/users?${query}` : '/users';
    const response = await client.get<UsersListResponse>(url);
    return response as unknown as UsersListResponse;
  },

  updateRole: async (id: string, data: UpdateRoleRequest): Promise<UserListItem> => {
    const response = await client.put<UserListItem>(`/users/${id}/role`, data);
    return response as unknown as UserListItem;
  },
};
