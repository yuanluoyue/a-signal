export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, McpToolProperty>;
    required?: string[];
  };
}

export interface McpToolProperty {
  type: string;
  description: string;
  enum?: string[];
  default?: unknown;
}

export interface McpToolCallRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface McpToolCallResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface McpListToolsResponse {
  tools: McpToolDefinition[];
}

export interface McpInitializeRequest {
  protocolVersion?: string;
  capabilities?: Record<string, unknown>;
  clientInfo?: {
    name: string;
    version?: string;
  };
}

export interface McpInitializeResponse {
  protocolVersion: string;
  capabilities: {
    tools: Record<string, unknown>;
  };
  serverInfo: {
    name: string;
    version: string;
  };
}
