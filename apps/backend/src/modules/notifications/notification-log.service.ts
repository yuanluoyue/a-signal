import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, gte, lte, sql, like, count } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import * as schema from '../../core/db/schema.js';

export interface QueryNotificationLogsDto {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
  webhookId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class NotificationLogService {
  private readonly logger = new Logger(NotificationLogService.name);

  constructor(private readonly dbService: DbService) {}

  async findAll(query: QueryNotificationLogsDto) {
    const { page = 1, pageSize = 20, type, status, webhookId, startDate, endDate } = query;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (type) {
      conditions.push(eq(schema.notificationLogs.type, type));
    }
    if (status) {
      conditions.push(eq(schema.notificationLogs.status, status));
    }
    if (webhookId) {
      conditions.push(eq(schema.notificationLogs.webhookId, webhookId));
    }
    if (startDate) {
      conditions.push(gte(schema.notificationLogs.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(schema.notificationLogs.createdAt, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      this.dbService.db
        .select()
        .from(schema.notificationLogs)
        .where(whereClause)
        .orderBy(desc(schema.notificationLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.dbService.db
        .select({ count: count() })
        .from(schema.notificationLogs)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;

    return { data, total, page, pageSize };
  }

  async findById(id: string): Promise<schema.NotificationLog | null> {
    const result = await this.dbService.db
      .select()
      .from(schema.notificationLogs)
      .where(eq(schema.notificationLogs.id, id))
      .limit(1);
    return result[0] || null;
  }

  async createLog(log: {
    webhookId?: string;
    webhookName?: string;
    webhookUrl?: string;
    type: string;
    title?: string;
    content?: string;
    status: string;
    response?: string;
    signalId?: string;
    strategyId?: string;
  }): Promise<schema.NotificationLog> {
    const [result] = await this.dbService.db
      .insert(schema.notificationLogs)
      .values(log)
      .returning();
    return result;
  }

  async updateLogStatus(id: string, status: string, response?: string): Promise<void> {
    const updateData: Record<string, string> = { status };
    if (response !== undefined) {
      updateData.response = response;
    }
    await this.dbService.db
      .update(schema.notificationLogs)
      .set(updateData)
      .where(eq(schema.notificationLogs.id, id));
  }
}
