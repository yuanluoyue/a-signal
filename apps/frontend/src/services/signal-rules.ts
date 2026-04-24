import client from './client';
import type {
  SignalRule,
  GlobalRule,
  SignalRulesListQueryParams,
  SignalRulesListResponse,
  CreateSignalRuleParams,
  UpdateSignalRuleParams,
  UpdateGlobalRuleParams,
} from './types';

export const signalRulesApi = {
  getRulesList: async (params?: SignalRulesListQueryParams): Promise<SignalRulesListResponse> => {
    const response = await client.get<SignalRulesListResponse>('/signal-rules', { params });
    return response as unknown as SignalRulesListResponse;
  },

  getGlobalRule: async (): Promise<GlobalRule> => {
    const response = await client.get<{ data: GlobalRule }>('/signal-rules/global');
    return (response as unknown as { data: GlobalRule }).data;
  },

  updateGlobalRule: async (params: UpdateGlobalRuleParams): Promise<GlobalRule> => {
    const response = await client.put<{ data: GlobalRule }>('/signal-rules/global', params);
    return (response as unknown as { data: GlobalRule }).data;
  },

  getRuleById: async (id: string): Promise<SignalRule> => {
    const response = await client.get<{ data: SignalRule }>(`/signal-rules/${id}`);
    return (response as unknown as { data: SignalRule }).data;
  },

  createRule: async (params: CreateSignalRuleParams): Promise<SignalRule> => {
    const response = await client.post<{ data: SignalRule }>('/signal-rules', params);
    return (response as unknown as { data: SignalRule }).data;
  },

  updateRule: async (id: string, params: UpdateSignalRuleParams): Promise<SignalRule> => {
    const response = await client.put<{ data: SignalRule }>(`/signal-rules/${id}`, params);
    return (response as unknown as { data: SignalRule }).data;
  },
};
