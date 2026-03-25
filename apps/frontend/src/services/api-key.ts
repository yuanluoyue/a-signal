import api from './api';

export interface ApiKeyResponse {
  id: string;
  name: string;
  status: string;
  rateLimit: number;
  createdAt: string;
}

export interface ApiKeyWithKeyResponse extends ApiKeyResponse {
  key: string;
}

export interface CreateApiKeyRequest {
  name: string;
  rateLimit?: number;
}

export async function getApiKeys(): Promise<ApiKeyResponse[]> {
  return api.get('/api-keys');
}

export async function createApiKey(data: CreateApiKeyRequest): Promise<ApiKeyWithKeyResponse> {
  return api.post('/api-keys', data);
}

export async function deleteApiKey(id: string): Promise<{ success: boolean }> {
  return api.delete(`/api-keys/${id}`);
}
