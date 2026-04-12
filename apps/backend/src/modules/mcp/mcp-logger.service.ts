import { Injectable, Logger } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { mcpLogs, type NewMcpLog } from '../../core/db/schema.js';

@Injectable()
export class McpLoggerService {
  private readonly logger = new Logger(McpLoggerService.name);

  constructor(private readonly dbService: DbService) {}

  async logToolCall(
    apiKeyId: string,
    toolName: string,
    args: Record<string, unknown> | undefined,
    result: unknown,
    startTime: number,
    isError: boolean,
  ): Promise<void> {
    const duration = Date.now() - startTime;

    try {
      const logEntry: NewMcpLog = {
        apiKeyId,
        method: 'tools/call',
        toolName,
        requestBody: args || {},
        responseStatus: isError ? 'error' : 'success',
      };

      await this.dbService.db.insert(mcpLogs).values(logEntry);

      this.logger.debug(
        `[McpLoggerService] Logged tool call: ${toolName}, duration: ${duration}ms, error: ${isError}`,
      );
    } catch (error) {
      this.logger.error(
        `[McpLoggerService] Failed to log tool call: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getRecentLogs(apiKeyId: string, limit: number = 50): Promise<typeof mcpLogs.$inferSelect[]> {
    try {
      const logs = await this.dbService.db
        .select()
        .from(mcpLogs)
        .where(eq(mcpLogs.apiKeyId, apiKeyId))
        .orderBy(desc(mcpLogs.createdAt))
        .limit(limit);

      return logs;
    } catch (error) {
      this.logger.error(
        `[McpLoggerService] Failed to get recent logs: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }
}
