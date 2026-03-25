# Checklist

## 数据库

- [x] api_keys 表已添加到 schema.ts
- [x] mcp_logs 表已添加到 schema.ts
- [x] 数据库迁移已执行

## API Key 模块

- [x] api-key.module.ts 已创建
- [x] api-key.service.ts 已实现（生成 key、CRUD）
- [x] api-key.controller.ts 已实现（POST /api-keys, GET /api-keys, DELETE /api-keys/:id）
- [x] api-key.dto.ts 已创建
- [x] ApiKeyModule 已导入到 AppModule

## MCP 模块

- [x] mcp.module.ts 已创建
- [x] mcp.controller.ts 已实现（POST /mcp, GET /mcp/tools）
- [x] mcp.service.ts 已实现（JSON-RPC 处理）
- [x] mcp.guard.ts 已实现（API Key 鉴权）
- [x] mcp.types.ts 已创建
- [x] McpModule 已导入到 AppModule

## MCP Tools

- [x] query-recent-news.tool.ts 已实现
- [x] query-news-by-keyword.tool.ts 已实现
- [x] query-backtest-data.tool.ts 已实现
- [x] query-recent-signals.tool.ts 已实现
- [x] tools/index.ts 已创建

## MCP 限流与日志

- [x] rate-limiter.service.ts 已实现
- [x] mcp-logger.service.ts 已实现
- [x] 限流功能已集成到 MCP 服务
- [x] 日志功能已集成到 MCP 服务

## 前端 API Key 管理

- [x] pages/settings/api-keys.tsx 已创建
- [x] services/api-key.ts 已创建
- [x] 导航中已添加 API Keys 入口

## MCP Demo 项目

- [x] apps/mcp-demo 目录结构已创建
- [x] package.json 已配置（端口 8005）
- [x] next.config.js 已配置
- [x] tsconfig.json 已配置
- [x] lib/mcp-client.ts 已实现
- [x] app/page.tsx 已实现
- [x] app/layout.tsx 已实现

## 验收标准

- [x] POST /mcp 支持 tools/list 方法
- [x] POST /mcp 支持 tools/call 方法
- [x] GET /mcp/tools 返回人类可读的文档
- [x] API Key 可以创建/查询/删除
- [x] 未携带 API Key 调用 MCP 返回 401
- [x] 超过 rate_limit 返回 429
- [x] MCP 返回符合 JSON-RPC 2.0 标准
- [x] MCP tools 与文档接口一致
- [x] Next.js demo 可以成功调用 query_news
- [x] 所有代码遵循 TypeScript 规范
- [x] 不修改已有业务逻辑
