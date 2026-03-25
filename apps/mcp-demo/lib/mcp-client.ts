export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: {
    tools?: McpTool[];
  } | McpToolResult;
  error?: {
    code: number;
    message: string;
  };
}

// 后端包装后的响应格式
interface BackendResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

const MCP_ENDPOINT = '/api/mcp';

/**
 * 解析后端响应，提取实际的 JSON-RPC 数据
 */
function parseBackendResponse<T>(response: BackendResponse<T> | T): T {
  // 如果是后端包装格式，提取 data
  if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
    return (response as BackendResponse<T>).data;
  }
  // 否则直接返回
  return response as T;
}

/**
 * MCP Client - 用于调用 MCP 服务
 */
export class McpClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 设置 API Key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * 获取所有可用的 tools
   */
  async listTools(): Promise<McpTool[]> {
    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'tools/list',
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API Key');
      }
      throw new Error(`HTTP error: ${response.status}`);
    }

    const rawData = await response.json();
    const data = parseBackendResponse<JsonRpcResponse>(rawData);

    if (data.error) {
      throw new Error(`MCP error: ${data.error.message}`);
    }

    return data.result?.tools || [];
  }

  /**
   * 调用指定的 tool
   */
  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API Key');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      throw new Error(`HTTP error: ${response.status}`);
    }

    const rawData = await response.json();
    const data = parseBackendResponse<JsonRpcResponse>(rawData);

    if (data.error) {
      throw new Error(`MCP error: ${data.error.message}`);
    }

    const result = data.result as McpToolResult;
    if (result.content && result.content.length > 0) {
      const textContent = result.content[0].text;
      try {
        return JSON.parse(textContent);
      } catch {
        return textContent;
      }
    }

    return result;
  }

  /**
   * 查询新闻
   */
  async queryNews(keyword: string, limit: number = 5): Promise<unknown> {
    return this.callTool('query_news_by_keyword', { keyword, limit });
  }
}

/**
 * 创建 MCP Client 实例
 */
export function createMcpClient(apiKey: string): McpClient {
  return new McpClient(apiKey);
}
