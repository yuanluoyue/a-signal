import client from './client';
import type { InviteCode, InviteCodesListResponse, GenerateInviteCodeRequest } from './types';

export const inviteCodeApi = {
  generate: async (data?: GenerateInviteCodeRequest): Promise<InviteCode> => {
    const response = await client.post<InviteCode>('/invite-codes', data || {});
    return response as unknown as InviteCode;
  },

  getList: async (params?: { page?: number; pageSize?: number }): Promise<InviteCodesListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.pageSize) queryParams.set('pageSize', String(params.pageSize));
    const query = queryParams.toString();
    const url = query ? `/invite-codes?${query}` : '/invite-codes';
    const response = await client.get<InviteCodesListResponse>(url);
    return response as unknown as InviteCodesListResponse;
  },
};
