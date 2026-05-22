import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, sql, like, gte, lte } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { auditLogs, type AuditLog } from '../../core/db/schema.js';

export interface AuditLogParams {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  detail?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
}

export interface AuditLogQueryParams {
  action?: string;
  resource?: string;
  status?: string;
  startTime?: Date;
  endTime?: Date;
  page: number;
  pageSize: number;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly dbService: DbService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.dbService.db.insert(auditLogs).values({
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        detail: params.detail,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        status: params.status,
      });
      this.logger.debug(`Audit log recorded: ${params.action} on ${params.resource} [${params.status}]`);
    } catch (error) {
      this.logger.error(`Failed to record audit log: ${error.message}`, error.stack);
    }
  }

  async findByUserId(userId: string, params: AuditLogQueryParams): Promise<{ data: AuditLog[]; total: number }> {
    const conditions = [eq(auditLogs.userId, userId)];

    if (params.action) {
      conditions.push(like(auditLogs.action, `${params.action}%`));
    }
    if (params.resource) {
      conditions.push(eq(auditLogs.resource, params.resource));
    }
    if (params.status) {
      conditions.push(eq(auditLogs.status, params.status));
    }
    if (params.startTime) {
      conditions.push(gte(auditLogs.createdAt, params.startTime));
    }
    if (params.endTime) {
      conditions.push(lte(auditLogs.createdAt, params.endTime));
    }

    const whereClause = and(...conditions);

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause);

    const data = await this.dbService.db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);

    return { data, total: count };
  }

  async findAll(params: AuditLogQueryParams & { userId?: string }): Promise<{ data: AuditLog[]; total: number }> {
    const conditions = [];

    if (params.userId) {
      conditions.push(eq(auditLogs.userId, params.userId));
    }
    if (params.action) {
      conditions.push(like(auditLogs.action, `${params.action}%`));
    }
    if (params.resource) {
      conditions.push(eq(auditLogs.resource, params.resource));
    }
    if (params.status) {
      conditions.push(eq(auditLogs.status, params.status));
    }
    if (params.startTime) {
      conditions.push(gte(auditLogs.createdAt, params.startTime));
    }
    if (params.endTime) {
      conditions.push(lte(auditLogs.createdAt, params.endTime));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause);

    const data = await this.dbService.db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);

    return { data, total: count };
  }
}
