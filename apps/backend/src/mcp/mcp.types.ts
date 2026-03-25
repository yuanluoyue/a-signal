import { z } from 'zod';

// JSON-RPC 2.0 请求格式
export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;

// JSON-RPC 2.0 响应格式
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// MCP Tool 定义
export interface McpTool {
  name: string;
  description: string;
  inputSchema: z.ZodType<unknown>;
  execute(args: unknown): Promise<unknown>;
}

// MCP Tool 列表响应
export interface McpToolListItem {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// MCP 调用参数
export const McpCallToolParamsSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()).optional(),
});

export type McpCallToolParams = z.infer<typeof McpCallToolParamsSchema>;

// MCP 返回内容格式
export interface McpContentItem {
  type: 'text';
  text: string;
}

export interface McpToolResult {
  content: McpContentItem[];
}

// 开发者文档格式
export interface ToolDocumentation {
  name: string;
  description: string;
  params: Record<string, string>;
}
