import client from './client';
import type {
  ApiKeyResponse,
  ApiKeyWithKeyResponse,
  CreateApiKeyRequest,
} from './types';

export async function getApiKeys(): Promise<ApiKeyResponse[]> {
  return client.get('/api-keys');
}

export async function createApiKey(data: CreateApiKeyRequest): Promise<ApiKeyWithKeyResponse> {
  return client.post('/api-keys', data);
}

export async function deleteApiKey(id: string): Promise<{ success: boolean }> {
  return client.delete(`/api-keys/${id}`);
}
