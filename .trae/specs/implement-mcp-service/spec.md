# MCP 服务与 API Key 管理模块 Spec

## Why

为了提供标准化的外部 API 接入能力，需要实现：
1. 符合 MCP (Model Context Protocol) 标准的服务接口
2. API Key 管理机制用于外部调用鉴权
3. 开发者文档接口便于第三方集成
4. Next.js Demo 项目展示如何调用 MCP 服务

## What Changes

### 后端 (NestJS)

1. **新增 MCP 模块** (`src/mcp/`)
   - 实现 JSON-RPC 2.0 协议接口
   - 支持 `tools/list` 和 `tools/call` 方法
   - 集成 API Key 鉴权
   - 实现限流机制
   - 记录调用日志

2. **新增 API Key 模块** (`src/api-key/`)
   - 数据库表 `api_keys`
   - CRUD 接口
   - 限流配置

3. **新增开发者文档接口** (`GET /mcp/tools`)
   - 人类可读的 tools 文档
   - 自动从 MCP tools 定义生成

### 前端 (Next.js)

1. **新增 API Key 管理页面** (`/settings/api-keys`)
   - 创建 API Key
   - 查看列表
   - 删除 API Key

### Demo 项目

1. **新增 `apps/mcp-demo`**
   - Next.js App Router 项目
   - MCP Client 封装
   - 演示页面调用 query_news
   - **端口**: 8005

## Impact

- **新增模块**: `McpModule`, `ApiKeyModule`
- **新增数据库表**: `api_keys`, `mcp_logs`
- **新增接口**: `POST /mcp`, `GET /mcp/tools`, `/api-keys/*`
- **新增前端页面**: `/settings/api-keys`
- **新增应用**: `apps/mcp-demo`

## ADDED Requirements

### Requirement: MCP JSON-RPC 2.0 协议支持

The system SHALL provide a POST /mcp endpoint that accepts JSON-RPC 2.0 requests.

#### Scenario: tools/list 请求
- **GIVEN** 有效的 API Key
- **WHEN** 发送 `{"jsonrpc": "2.0", "id": "1", "method": "tools/list"}`
- **THEN** 返回所有可用的 tools 列表

#### Scenario: tools/call 请求
- **GIVEN** 有效的 API Key
- **WHEN** 发送 `{"jsonrpc": "2.0", "id": "1", "method": "tools/call", "params": {"name": "query_news", "arguments": {...}}}`
- **THEN** 调用对应的 tool 并返回 MCP 标准格式的结果

#### Scenario: 无效的 API Key
- **GIVEN** 无效或未提供 API Key
- **WHEN** 发送任何 MCP 请求
- **THEN** 返回 401 错误，格式符合 JSON-RPC 2.0 错误规范

### Requirement: MCP Tools 实现

The system SHALL provide the following MCP tools:

#### Tool: query_recent_news
- **Description**: 查询最近的新闻
- **Parameters**: `{ limit?: number }`
- **Returns**: 新闻列表

#### Tool: query_news_by_keyword
- **Description**: 根据关键词搜索新闻
- **Parameters**: `{ keyword: string, limit?: number }`
- **Returns**: 匹配的新闻列表

#### Tool: query_backtest_data
- **Description**: 查询回测数据
- **Parameters**: `{ stockCode?: string, limit?: number }`
- **Returns**: 回测记录列表

#### Tool: query_recent_signals
- **Description**: 查询最近的信号
- **Parameters**: `{ stockCode?: string, limit?: number }`
- **Returns**: 信号列表

### Requirement: API Key 管理

The system SHALL provide API Key 管理功能.

#### Scenario: 创建 API Key
- **GIVEN** 管理员用户
- **WHEN** POST /api-keys { name: "Demo Key", rateLimit: 60 }
- **THEN** 返回新生成的 API Key（仅一次）

#### Scenario: 查询 API Key 列表
- **GIVEN** 管理员用户
- **WHEN** GET /api-keys
- **THEN** 返回所有 API Key 列表（不包含 key 值）

#### Scenario: 删除 API Key
- **GIVEN** 管理员用户
- **WHEN** DELETE /api-keys/:id
- **THEN** 删除指定的 API Key

### Requirement: MCP 鉴权与限流

The system SHALL validate API Key and enforce rate limiting.

#### Scenario: API Key 校验
- **GIVEN** 请求头包含 `x-api-key`
- **WHEN** 调用 POST /mcp
- **THEN** 校验 key 是否存在于 api_keys 表且 status 为 active

#### Scenario: 限流控制
- **GIVEN** 有效的 API Key
- **WHEN** 调用频率超过 rate_limit
- **THEN** 返回 429 错误

### Requirement: MCP 调用日志

The system SHALL log all MCP invocations.

#### Scenario: 记录调用日志
- **GIVEN** 任何 MCP 调用
- **WHEN** 调用完成
- **THEN** 记录 api_key, method, tool_name, timestamp 到 mcp_logs 表

### Requirement: 开发者文档接口

The system SHALL provide a human-readable tools documentation endpoint.

#### Scenario: 获取文档
- **GIVEN** 任何用户
- **WHEN** GET /mcp/tools
- **THEN** 返回 tools 的名称、描述、参数定义（自动从 MCP tools 生成）

### Requirement: Next.js Demo 项目

The system SHALL provide a demo project for MCP integration.

#### Scenario: 调用 query_news
- **GIVEN** 用户输入 API Key 和 keyword
- **WHEN** 点击调用按钮
- **THEN** 通过 MCP Client 调用 query_news 并展示结果

## MODIFIED Requirements

无

## REMOVED Requirements

无

## 技术规范

### MCP 返回格式

```json
{
  "content": [
    {
      "type": "text",
      "text": "JSON.stringify(data)"
    }
  ]
}
```

### JSON-RPC 2.0 错误格式

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "error": {
    "code": -32000,
    "message": "Error description"
  }
}
```

### 数据库表结构

**api_keys**
- id: uuid, primary key
- key: varchar(255), unique, not null
- name: varchar(100), not null
- status: varchar(20), not null, default 'active'
- rateLimit: integer, not null, default 60
- createdAt: timestamp

**mcp_logs**
- id: uuid, primary key
- apiKeyId: uuid, foreign key
- method: varchar(50), not null
- toolName: varchar(100)
- requestBody: jsonb
- responseStatus: varchar(20)
- createdAt: timestamp
