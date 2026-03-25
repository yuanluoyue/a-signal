import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { McpService } from './mcp.service.js';
import { McpAuthGuard } from './mcp.guard.js';
import { Public } from '../common/decorators/public.decorator.js';
import type { ApiKey } from '../database/schema.js';
import type { JsonRpcResponse, ToolDocumentation } from './mcp.types.js';

interface RequestWithApiKey extends Request {
  apiKey: ApiKey;
}

@Controller('mcp')
@Public()
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Post()
  @UseGuards(McpAuthGuard)
  async handleMcpRequest(
    @Body() body: unknown,
    @Req() request: RequestWithApiKey,
  ): Promise<JsonRpcResponse> {
    return this.mcpService.handleRequest(body, request.apiKey);
  }

  @Get('tools')
  getToolsDocumentation(): ToolDocumentation[] {
    return this.mcpService.getToolsDocumentation();
  }
}
