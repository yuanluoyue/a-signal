import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { mcpLogs, type NewMcpLog } from '../database/schema.js';

@Injectable()
export class McpLoggerService {
  private readonly logger = new Logger(McpLoggerService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * 记录 MCP 调用日志
   */
  async log(
    apiKeyId: string,
    method: string,
    toolName: string | undefined,
    requestBody: unknown,
    responseStatus: string,
  ): Promise<void> {
    try {
      const logEntry: NewMcpLog = {
        apiKeyId,
        method,
        toolName: toolName || null,
        requestBody: requestBody as Record<string, unknown>,
        responseStatus,
      };

      await this.databaseService.db.insert(mcpLogs).values(logEntry);
    } catch (error) {
      this.logger.error('Failed to log MCP request:', error);
    }
  }
}
