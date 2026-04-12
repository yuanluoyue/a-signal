import { Controller, Post, Get, Body, UseGuards, Req, Logger } from '@nestjs/common';
import { Request } from 'express';
import { McpService } from '../../modules/mcp/mcp.service.js';
import { McpGuard } from '../../modules/mcp/mcp.guard.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { McpToolDefinition, McpToolCallRequest } from '../../modules/mcp/mcp.types.js';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id?: string | number;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id?: string | number;
}

interface RequestWithApiKeyId extends Request {
  apiKeyId: string;
}

@Controller('mcp')
@Public()
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(private readonly mcpService: McpService) {}

  @Post()
  @UseGuards(McpGuard)
  async handleMcpRequest(
    @Body() body: JsonRpcRequest,
    @Req() request: RequestWithApiKeyId,
  ): Promise<JsonRpcResponse> {
    const { method, params, id } = body;

    try {
      let result: unknown;

      switch (method) {
        case 'initialize':
          result = {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'a-signal-mcp', version: '1.0.0' },
          };
          break;

        case 'tools/list':
          result = { tools: await this.mcpService.listTools() };
          break;

        case 'tools/call': {
          const toolCallRequest: McpToolCallRequest = {
            name: (params?.name as string) || '',
            arguments: (params?.arguments as Record<string, unknown>) || {},
          };
          result = await this.mcpService.callTool(request.apiKeyId, toolCallRequest);
          break;
        }

        default:
          return {
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${method}` },
            id,
          };
      }

      return { jsonrpc: '2.0', result, id };
    } catch (error) {
      this.logger.error(`[McpController] Error handling request: ${error instanceof Error ? error.message : String(error)}`);
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : String(error),
        },
        id,
      };
    }
  }

  @Get('tools')
  async getToolsList(): Promise<{ tools: McpToolDefinition[] }> {
    const tools = await this.mcpService.listTools();
    return { tools };
  }
}
