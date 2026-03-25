import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import type { ApiKey } from '../database/schema.js';
import {
  type JsonRpcRequest,
  type JsonRpcResponse,
  type McpTool,
  type McpToolListItem,
  type McpToolResult,
  type ToolDocumentation,
  JsonRpcRequestSchema,
  McpCallToolParamsSchema,
} from './mcp.types.js';
import { RateLimiterService } from './rate-limiter.service.js';
import { McpLoggerService } from './mcp-logger.service.js';

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);
  private readonly tools = new Map<string, McpTool>();

  constructor(
    private readonly rateLimiterService: RateLimiterService,
    private readonly mcpLoggerService: McpLoggerService,
  ) {}

  /**
   * 注册 MCP Tool
   */
  registerTool(tool: McpTool): void {
    this.tools.set(tool.name, tool);
    this.logger.log(`Registered MCP tool: ${tool.name}`);
  }

  /**
   * 处理 JSON-RPC 请求
   */
  async handleRequest(
    requestBody: unknown,
    apiKey: ApiKey,
  ): Promise<JsonRpcResponse> {
    // 验证请求格式
    const parseResult = JsonRpcRequestSchema.safeParse(requestBody);
    if (!parseResult.success) {
      return this.createErrorResponse(
        null,
        -32700,
        'Parse error: Invalid JSON-RPC 2.0 request',
      );
    }

    const request = parseResult.data;

    // 检查限流
    const allowed = await this.rateLimiterService.checkLimit(
      apiKey.key,
      apiKey.rateLimit,
    );
    if (!allowed) {
      await this.logRequest(apiKey.id, request.method, undefined, requestBody, 'rate_limited');
      return this.createErrorResponse(
        request.id,
        -32000,
        'Rate limit exceeded',
      );
    }

    try {
      let result: unknown;

      switch (request.method) {
        case 'tools/list':
          result = await this.handleToolsList();
          break;
        case 'tools/call':
          result = await this.handleToolsCall(request.params);
          break;
        default:
          await this.logRequest(apiKey.id, request.method, undefined, requestBody, 'method_not_found');
          return this.createErrorResponse(
            request.id,
            -32601,
            `Method not found: ${request.method}`,
          );
      }

      await this.logRequest(
        apiKey.id,
        request.method,
        request.params?.name as string | undefined,
        requestBody,
        'success',
      );

      return {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
    } catch (error) {
      this.logger.error(`MCP request failed: ${request.method}`, error);
      
      await this.logRequest(
        apiKey.id,
        request.method,
        request.params?.name as string | undefined,
        requestBody,
        'error',
      );

      if (error instanceof z.ZodError) {
        return this.createErrorResponse(
          request.id,
          -32602,
          `Invalid params: ${error.issues.map((e: z.ZodIssue) => e.message).join(', ')}`,
        );
      }

      if (error instanceof HttpException) {
        return this.createErrorResponse(
          request.id,
          -32000,
          error.message,
        );
      }

      return this.createErrorResponse(
        request.id,
        -32603,
        `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 处理 tools/list 方法
   */
  private async handleToolsList(): Promise<{ tools: McpToolListItem[] }> {
    const tools: McpToolListItem[] = Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: this.zodSchemaToJsonSchema(tool.inputSchema),
    }));

    return { tools };
  }

  /**
   * 处理 tools/call 方法
   */
  private async handleToolsCall(params?: Record<string, unknown>): Promise<McpToolResult> {
    const parseResult = McpCallToolParamsSchema.safeParse(params);
    if (!parseResult.success) {
      throw new HttpException('Invalid tool call params', HttpStatus.BAD_REQUEST);
    }

    const { name, arguments: args = {} } = parseResult.data;
    const tool = this.tools.get(name);

    if (!tool) {
      throw new HttpException(`Tool not found: ${name}`, HttpStatus.NOT_FOUND);
    }

    const result = await tool.execute(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  }

  /**
   * 获取开发者文档
   */
  getToolsDocumentation(): ToolDocumentation[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      params: this.extractParamsFromSchema(tool.inputSchema),
    }));
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(
    id: string | number | null,
    code: number,
    message: string,
  ): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id: id ?? 'null',
      error: {
        code,
        message,
      },
    };
  }

  /**
   * 记录请求日志
   */
  private async logRequest(
    apiKeyId: string,
    method: string,
    toolName: string | undefined,
    requestBody: unknown,
    status: string,
  ): Promise<void> {
    await this.mcpLoggerService.log(apiKeyId, method, toolName, requestBody, status);
  }

  /**
   * 将 Zod Schema 转换为 JSON Schema
   */
  private zodSchemaToJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
    // 简化处理，返回基本的 JSON Schema 结构
    const description = schema.description;
    const jsonSchema: Record<string, unknown> = {
      type: 'object',
      properties: {},
    };

    if (description) {
      jsonSchema.description = description;
    }

    // 这里可以扩展更复杂的 schema 转换逻辑
    return jsonSchema;
  }

  /**
   * 从 Zod Schema 提取参数信息
   */
  private extractParamsFromSchema(schema: z.ZodType<unknown>): Record<string, string> {
    const params: Record<string, string> = {};
    
    // 尝试提取 ZodObject 的 shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shape = (schema as any)._def?.shape?.();
    if (shape) {
      for (const [key, value] of Object.entries(shape)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zodType = value as any;
        const typeName = zodType._def?.typeName || 'unknown';
        const isOptional = zodType.isOptional?.() || false;
        const description = zodType.description;
        
        let typeStr = 'unknown';
        switch (typeName) {
          case 'ZodString':
            typeStr = 'string';
            break;
          case 'ZodNumber':
            typeStr = 'number';
            break;
          case 'ZodBoolean':
            typeStr = 'boolean';
            break;
          case 'ZodOptional':
            typeStr = `${this.extractParamsFromSchema(zodType._def.innerType)[key] || 'unknown'} (optional)`;
            break;
          default:
            typeStr = typeName.replace('Zod', '').toLowerCase();
        }

        params[key] = description ? `${typeStr} - ${description}` : typeStr;
      }
    }

    return params;
  }
}
