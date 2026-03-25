# Tasks

## 后端开发

### Task 1: 数据库表结构
- [x] 在 schema.ts 中添加 api_keys 表
- [x] 在 schema.ts 中添加 mcp_logs 表
- [x] 创建数据库迁移文件

### Task 2: API Key 模块
- [x] 创建 api-key.module.ts
- [x] 创建 api-key.service.ts（包含生成 key、CRUD 操作）
- [x] 创建 api-key.controller.ts（POST/GET/DELETE 接口）
- [x] 创建 api-key.dto.ts（请求/响应 DTO）
- [x] 在 app.module.ts 中导入 ApiKeyModule

### Task 3: MCP 核心模块
- [x] 创建 mcp.module.ts
- [x] 创建 mcp.controller.ts（POST /mcp, GET /mcp/tools）
- [x] 创建 mcp.service.ts（处理 JSON-RPC 请求）
- [x] 创建 mcp.guard.ts（API Key 鉴权）
- [x] 创建 mcp.types.ts（类型定义）
- [x] 在 app.module.ts 中导入 McpModule

### Task 4: MCP Tools 实现
- [x] 创建 mcp/tools/query-recent-news.tool.ts
- [x] 创建 mcp/tools/query-news-by-keyword.tool.ts
- [x] 创建 mcp/tools/query-backtest-data.tool.ts
- [x] 创建 mcp/tools/query-recent-signals.tool.ts
- [x] 创建 mcp/tools/index.ts（统一导出）

### Task 5: MCP 限流与日志
- [x] 创建 mcp/rate-limiter.service.ts（基于内存的限流）
- [x] 创建 mcp/mcp-logger.service.ts（记录调用日志）
- [x] 在 mcp.service.ts 中集成限流和日志

## 前端开发

### Task 6: API Key 管理页面
- [x] 创建 pages/settings/api-keys.tsx
- [x] 创建 services/api-key.ts（API 调用封装）
- [x] 在导航中添加 API Keys 入口

## Demo 项目

### Task 7: MCP Demo 项目初始化
- [x] 创建 apps/mcp-demo 目录结构
- [x] 初始化 package.json（配置端口 8005）
- [x] 配置 next.config.js
- [x] 配置 tsconfig.json

### Task 8: MCP Demo 功能实现
- [x] 创建 lib/mcp-client.ts（MCP Client 封装）
- [x] 创建 app/page.tsx（主页面）
- [x] 创建 app/layout.tsx
- [x] 创建组件：ApiKeyInput, KeywordInput, ResultDisplay

## 验证

### Task 9: 功能验证
- [x] 验证 POST /mcp 支持 tools/list
- [x] 验证 POST /mcp 支持 tools/call
- [x] 验证 GET /mcp/tools 返回文档
- [x] 验证 API Key 创建/查询/删除
- [x] 验证无 API Key 返回 401
- [x] 验证限流功能
- [x] 验证 MCP Demo 可调用 query_news

# Task Dependencies

- Task 3 依赖 Task 1, Task 2
- Task 4 依赖 Task 3
- Task 5 依赖 Task 3
- Task 6 依赖 Task 2
- Task 8 依赖 Task 7
- Task 9 依赖所有其他任务完成
