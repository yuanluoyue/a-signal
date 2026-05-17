import client from './client';

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  detail: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  createdAt: string;
}

export interface AuditLogQueryParams {
  action?: string;
  resource?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  total: number;
}

export async function getAuditLogs(params: AuditLogQueryParams): Promise<AuditLogListResponse> {
  const query = new URLSearchParams();
  if (params.action) query.append('action', params.action);
  if (params.resource) query.append('resource', params.resource);
  if (params.page) query.append('page', String(params.page));
  if (params.pageSize) query.append('pageSize', String(params.pageSize));
  const queryString = query.toString();
  return client.get(`/audit-logs${queryString ? `?${queryString}` : ''}`);
}
