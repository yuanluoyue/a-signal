# AGENTS.md

开发项目时需要遵守项目已有 skill

## 项目概述

A Signal 是一个全栈 monorepo 项目，提供股票分析系统，包含 AI 驱动的新闻分析、量化回测、持仓管理、智能投研 Agent 和 MCP 服务等功能。

### 技术栈

| 层级 | 技术 |
|------|------|
| 包管理器 | pnpm 10.x |
| 后端框架 | NestJS 11.x |
| 数据库 | PostgreSQL 15 + Drizzle ORM |
| 消息队列 | RabbitMQ |
| 向量数据库 | ChromaDB |
| AI/ML | LangChain + LangGraph + 火山引擎 |
| 前端框架 | UMI 4.x + React 18 |
| UI 组件库 | Ant Design 5.x |
| API 文档 | Swagger (OpenAPI 3.0) |

### 架构说明

```
apps/
├── backend/          # NestJS 后端服务
│   └── src/
│       ├── agent/    # 投研 Agent (LangGraph)
│       ├── mcp/      # MCP Server 服务
│       ├── api-key/  # API Key 管理
│       ├── signals/  # 信号管理
│       ├── backtest/ # 回测引擎
│       ├── news/     # 新闻采集与向量存储
│       ├── klines/   # K线数据
│       ├── queue/    # RabbitMQ 队列
│       └── ...
├── frontend/         # UMI 前端应用
│   └── src/pages/    # 页面组件
└── mcp-demo/         # Next.js MCP 调用演示
```

---

## 可用 Skills

项目已配置以下 Skill，开发对应功能时必须参考：

| Skill | 路径 | 用途 |
|-------|------|------|
| `nestjs-best-practices` | `.trae/skills/nestjs-best-practices/` | 开发 NestJS 后端代码时参考 |
| `vercel-react-best-practices` | `.trae/skills/vercel-react-best-practices/` | 开发 React 前端代码时参考 |
| `volcengine-llm-call` | `.trae/skills/volcengine-llm-call/` | 调用火山引擎 LLM API 时参考 |
| `news-analyze` | `.trae/skills/news-analyze/` | 开发新闻分析模块时参考 |

---

## 开发命令

### 环境准备

```bash
# 安装依赖（根目录执行）
pnpm install

# 复制环境变量配置
cp docker/.env.example docker/.env
# 编辑 docker/.env 填入实际配置
```

**启动应用：**

```bash
# 启动基础设施（PostgreSQL、RabbitMQ、ChromaDB）
pnpm run dev:docker

# 启动后端（热重载）
pnpm run dev:backend

# 启动前端
pnpm run dev:frontend

# 启动 MCP Demo
pnpm run dev:demo
```

### 构建

```bash
# 构建后端
pnpm run build:backend

# 构建前端
pnpm run build:frontend

# 构建全部
pnpm run build
```

### 代码质量

```bash
# 格式化代码（整个项目）
pnpm run format

# 后端 Lint
pnpm run lint

# 后端单元测试
pnpm run test:backend

# 后端 E2E 测试
pnpm run test:e2e:backend
```

### 数据库迁移

```bash
# 生成迁移文件
cd apps/backend && pnpm run db:generate

# 执行迁移
cd apps/backend && pnpm run db:migrate

# 启动 Drizzle Studio
cd apps/backend && pnpm run db:studio
```

---

## 项目结构

### 后端核心模块

| 模块 | 路径 | 职责 |
|------|------|------|
| `agent` | `src/agent/` | 投研 Agent (LangGraph 工作流、Memory 系统、Tools) |
| `mcp` | `src/mcp/` | MCP Server (JSON-RPC 2.0、Tools、限流、日志) |
| `api-key` | `src/api-key/` | API Key 管理 (CRUD、鉴权) |
| `signals` | `src/signals/` | 信号 CRUD、信号分析消费者 |
| `backtest` | `src/backtest/` | 回测引擎 |
| `news` | `src/news/` | 新闻采集、解析、向量化、消费者 |
| `stocks` | `src/stocks/` | 股票基础数据 |
| `klines` | `src/klines/` | K线数据获取 |
| `stock-tracking` | `src/stock-tracking/` | 股票跟踪管理 |
| `simulation` | `src/simulation/` | 模拟交易持仓 |
| `scheduler` | `src/scheduler/` | 定时任务调度 |
| `queue` | `src/queue/` | RabbitMQ 队列生产者/消费者 |
| `vector` | `src/vector/` | ChromaDB 向量存储 |
| `volcengine` | `src/volcengine/` | 火山引擎 LLM/Embedding 服务 |
| `notifications` | `src/notifications/` | Webhook 通知管理 |
| `dashboard` | `src/dashboard/` | 仪表盘数据聚合 |
| `auth` | `src/auth/` | JWT 认证 |
| `users` | `src/users/` | 用户管理 |
| `database` | `src/database/` | Drizzle ORM 配置 |

### Agent 模块结构

```
src/agent/
├── graph/
│   └── agent-graph.ts       # LangGraph 工作流定义
├── memory/
│   ├── memory.service.ts    # 记忆服务 (短期+长期)
│   ├── pg-memory.repository.ts
│   └── vector-memory.service.ts
├── nodes/
│   ├── index.ts
│   ├── memory-load.node.ts  # 加载记忆
│   ├── intent.node.ts       # 意图识别
│   ├── planner.node.ts      # 计划生成
│   ├── tool.node.ts         # 工具执行
│   ├── aggregator.node.ts   # 结果聚合
│   ├── final.node.ts        # 最终回答
│   └── memory-save.node.ts  # 保存记忆
├── tools/
│   ├── index.ts
│   ├── base.tool.ts         # Tool 基类
│   ├── news.tool.ts         # 新闻查询工具
│   ├── portfolio.tool.ts    # 持仓查询工具
│   ├── signals.tool.ts      # 信号查询工具
│   ├── backtest.tool.ts     # 回测查询工具
│   └── reports.tool.ts      # 报告查询工具
├── types/
│   └── agent-state.ts       # Agent State 定义
├── dto/
│   ├── chat-request.dto.ts
│   └── chat-response.dto.ts
├── agent.module.ts
├── agent.controller.ts
└── research-agent.service.ts
```

### MCP 模块结构

```
src/mcp/
├── tools/
│   ├── index.ts
│   ├── query-news.tool.ts
│   ├── query-signals.tool.ts
│   └── query-backtest.tool.ts
├── mcp.controller.ts        # JSON-RPC 端点
├── mcp.service.ts           # MCP 核心逻辑
├── mcp.module.ts
├── mcp.guard.ts             # API Key 鉴权
├── mcp.types.ts             # 类型定义
├── mcp-logger.service.ts    # 调用日志
└── rate-limiter.service.ts  # 限流服务
```

### 前端核心目录

```
apps/frontend/src/
├── pages/              # 页面组件 (UMI 约定式路由)
│   ├── agent-chat/     # Agent 聊天页面
│   ├── signals/        # 信号管理
│   ├── backtest/       # 回测页面
│   ├── news/           # 新闻页面
│   ├── stocks/         # 股票详情
│   ├── stock-trackings/# 股票跟踪
│   ├── simulation/     # 模拟持仓
│   ├── settings/       # 设置页面
│   └── ...
├── api/                # API 请求封装
├── components/         # 公共组件
├── layouts/            # 布局组件
├── contexts/           # React Context
├── services/           # 服务封装
├── types/              # TypeScript 类型
└── utils/              # 工具函数
```

---

## 代码规范

### TypeScript 规范

- **严格模式**：后端启用 `strictNullChecks`
- **模块**：`module: nodenext`，支持 ESM
- **装饰器**：启用 `experimentalDecorators` 和 `emitDecoratorMetadata`
- **目标**：ES2023

### 后端命名约定

| 类型 | 规则 | 示例 |
|------|------|------|
| 文件 | kebab-case | `news.service.ts` |
| 类 | PascalCase | `NewsService` |
| 接口 | PascalCase | `SignalModel` |
| 常量 | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| 函数/方法 | camelCase | `getSignalById()` |

### NestJS 最佳实践

- **模块化**：每个功能域独立模块（如 `SignalsModule`、`AgentModule`）
- **依赖注入**：优先使用构造函数注入
- **DTO**：使用 `class-validator` + `class-transformer` 验证输入
- **异常处理**：使用 `AllExceptionsFilter` 统一处理
- **响应拦截**：使用 `ResponseInterceptor` 统一响应格式
- **API 版本**：全局前缀 `api/v1`，排除 `/mcp/v1/*`

### 前端规范

- 使用 UMI 4.x 约定式路由
- API 请求封装在 `src/api/` 目录
- 使用 Ant Design 5.x 组件库
- 使用 @ant-design/x 的 XChat 组件实现聊天界面

---

## 队列消费者

| 消费者 | 路径 | 职责 |
|--------|------|------|
| `KlineFetchConsumer` | `klines/kline-fetch.consumer.ts` | 获取 K线数据 |
| `NewsCrawlConsumer` | `news/news-crawl.consumer.ts` | 爬取新闻 |
| `NewsVectorizeConsumer` | `news/news-vectorize.consumer.ts` | 新闻向量化 |
| `SignalAnalyzeConsumer` | `signals/signal-analyze.consumer.ts` | 信号分析 |
| `StockTrackFetchConsumer` | `stock-tracking/stock-track-fetch.consumer.ts` | 股票跟踪数据获取 |

---

## 测试策略

### 测试框架

| 层级 | 框架 |
|------|------|
| 单元测试 | Jest 30.x |
| E2E 测试 | SuperTest |

### 运行命令

```bash
# 单元测试
pnpm --filter backend run test

# 覆盖率报告
pnpm --filter backend run test:cov

# E2E 测试
pnpm --filter backend run test:e2e
```

### 测试文件位置

- 单元测试：`src/**/*.spec.ts`
- E2E 测试：`test/**/*.e2e-spec.ts`

---

## API 文档

启动后端后访问：

- **Swagger UI**: `http://localhost:3001/api`
- **健康检查**: `http://localhost:3001/health`
- **MCP 文档**: `http://localhost:3001/mcp/tools`

---

## 环境变量

### 必需配置（docker/.env）

```bash
# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=your-secure-password
DB_NAME=a_signal

# RabbitMQ
RABBITMQ_USER=admin
RABBITMQ_PASS=your-secure-password

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# 火山引擎
VOLCENGINE_API_KEY=your-key

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000
VOLCENGINE_EMBEDDING_MODEL=doubao-embedding-vision-251215
```

---

## Docker 服务

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 主数据库 |
| RabbitMQ | 5672, 15672 | 消息队列 + 管理界面 |
| ChromaDB | 8000 | 向量数据库 |
| 后端 | 3001 | API 服务 |
| 前端 | 8001 | Web UI |
| MCP Demo | 8005 | MCP 演示项目 |

---

## 开发规则

### 日志规范

1. 如果不确定问题的原因，就加日志排查
2. 日志要详细，能够看出来源于哪个模块或者哪个具体的函数

### Agent 开发规范

1. **数据真实性**: 必须优先使用 tools 获取数据，禁止编造
2. **分析规范**: 涉及投资分析必须调用 tool
3. **风险提示**: 不允许直接给出确定性买卖建议
4. **输出格式**: 投资相关回答必须包含【结论】【理由】【风险】【数据来源】

### MCP 开发规范

1. 遵循 JSON-RPC 2.0 协议
2. 所有 tools 必须包含 name、description、inputSchema
3. 返回格式必须符合 MCP 标准
4. 记录所有调用日志

---

## 历史 Spec

项目迭代历史记录在 `.trae/specs/` 目录：

| Spec | 说明 |
|------|------|
| `init-fullstack-project` | 项目初始化 |
| `core-signal-pipeline` | 核心信号流水线 |
| `enhanced-features-v2` | 增强功能 V2 |
| `research-agent` | 投研 Agent |
| `implement-mcp-service` | MCP 服务实现 |
