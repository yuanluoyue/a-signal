# AGENTS.md

AI Agent 开发本项目时必须遵守本文档中的规则和约定。

## 项目概述

A Signal 是一个 AI 驱动的量化交易信号系统。核心链路：新闻采集 → 事件提取（AI）→ 信号生成（规则引擎）→ 策略过滤 → Webhook 通知。

### 技术栈

| 层级 | 技术 |
|------|------|
| 包管理器 | pnpm 10.x (monorepo) |
| 后端框架 | NestJS 11.x (ESM) |
| 数据库 | PostgreSQL 15 + Drizzle ORM |
| 消息队列 | RabbitMQ |
| 向量数据库 | ChromaDB |
| AI/ML | LangChain + LangGraph + 火山引擎 |
| 前端框架 | Umi 4.x + React 18 |
| UI 组件库 | Ant Design 5.x |
| API 文档 | Swagger (OpenAPI 3.0) |

## 必须遵守的规则

### 数据库规则（最高优先级）

1. 只能使用 Drizzle 定义 schema，禁止手写 SQL
2. 结构变更只能通过 `drizzle-kit generate`，禁止 push
3. 绝对不能生成 DROP / DELETE / TRUNCATE / RENAME 语句
4. 字段必须默认 nullable，禁止直接加 NOT NULL 约束
5. 禁止删除表、删除字段、重命名
6. 一个需求最终只保留一个迁移文件
7. 禁止在迁移中执行数据更新（UPDATE/INSERT/DELETE）
8. 任何结构变更必须向前兼容，保证旧代码可运行
9. 有更新菜单的需求，必须同步更新 seed 文件
10. 有需要手动插入数据的需求，必须在 seed 文件中新增，禁止直接在数据库中手动插入

### 日志规则

1. 如果不确定问题的原因，就加日志排查
2. 日志要详细，能够看出来源于哪个模块或者哪个具体的函数

### 代码规则

- 禁止添加注释，除非被要求
- 修改代码前先阅读周围上下文，理解现有模式和约定
- 不要假设某个库可用，先检查项目中是否已使用

## 后端架构

### 分层约定

```
src/
├── core/           # 基础设施（db, queue, vector, volcengine, auth, logger）
├── common/         # 通用工具（decorators, guards, filters, interceptors, middleware）
├── modules/        # 业务 Service 层（纯逻辑，不依赖 HTTP 概念）
├── interfaces/     # API 接口层（Controller + DTO，依赖 modules）
└── jobs/           # 队列消费者和定时任务
```

**关键约定**：
- `modules/` 只包含业务逻辑，不引用 `@nestjs/common` 的 HTTP 装饰器
- `interfaces/` 包含 Controller 和 DTO，负责 HTTP 层适配
- 每个模块通过 `*.module.ts` 组织，对外 export Service
- Schema 统一定义在 `core/db/schema.ts`

### 核心模块

| 模块 | 路径 | 职责 |
|------|------|------|
| news | modules/news/ | 新闻采集、解析、向量化 |
| event | modules/event/ | 事件 CRUD |
| signal-rule | modules/signal-rule/ | 信号规则（全局 + 专属），控制阈值和乘数 |
| signal-generator | modules/signal-generator/ | 基于规则引擎生成交易信号 |
| strategy | modules/strategy/ | 策略管理，筛选条件过滤，绑定 Webhook |
| notifications | modules/notifications/ | 策略驱动的通知流程 + Webhook 管理 |
| backtest | modules/backtest/ | 量化回测引擎 |
| stock-tracking | modules/stock-tracking/ | 股票追踪，K 线 + 信号标记 |
| agent | modules/agent/ | 投研 Agent (LangGraph) |
| mcp | modules/mcp/ | MCP Server (JSON-RPC 2.0) |

### 信号管线

```
新闻 → EventAnalyzeConsumer → 事件提取 (AI)
                                    ↓
                              SignalGeneratorService → 信号生成 (规则引擎)
                                    ↓
                              NotificationsService → 策略过滤 → Webhook 通知
```

- 信号分数 = 重要性 × 方向 × 置信度 × (1 + 惊喜值) × 规则乘数
- 策略过滤条件：分数范围、方向模式、事件类别、规则 ID
- 通知消息包含策略名称，标明来源策略

### 队列消费者

| 消费者 | 文件 | 职责 |
|--------|------|------|
| NewsCrawlConsumer | jobs/news-crawl.consumer.ts | 爬取财经新闻 |
| EventAnalyzeConsumer | jobs/event-analyze.consumer.ts | AI 事件提取 + 信号生成 |
| NewsVectorizeConsumer | jobs/news-vectorize.consumer.ts | 新闻向量化存储 |
| KlineFetchConsumer | jobs/kline-fetch.consumer.ts | 获取 K 线数据 |
| StockTrackFetchConsumer | jobs/stock-track-fetch.consumer.ts | 股票追踪数据获取 |

### 全局配置

- API 前缀：`api/v1`（排除 `/health` 和 `/mcp/v1/*`）
- 认证：JWT Bearer Token（`@Public()` 装饰器跳过认证）
- 验证：`ValidationPipe` + `whitelist: true` + `forbidNonWhitelisted: true`
- 响应：`ResponseInterceptor` 统一包装
- 异常：`AllExceptionsFilter` 统一处理
- 日志：Winston（`createWinstonLogger`）
- 追踪：`TraceIdMiddleware` 注入 traceId

## 前端架构

### 目录结构

```
apps/frontend/src/
├── pages/              # 页面组件（Umi 约定式路由）
│   ├── dashboard.tsx
│   ├── news/           # 新闻列表 + 详情
│   ├── events/         # 事件列表 + 详情
│   ├── signals/        # 信号列表 + 详情
│   ├── signal-rules/   # 信号规则管理
│   ├── strategy/       # 策略管理
│   ├── backtest/       # 回测分析
│   ├── stock-trackings/# 股票追踪 + 详情
│   ├── stocks/         # 股票查询 + 详情
│   ├── simulation/     # 模拟交易
│   ├── blacklist/      # 黑名单
│   ├── agent-chat/     # AI 投研助手
│   ├── settings/       # 通知设置 / 定时任务 / API Key
│   ├── login.tsx
│   ├── register.tsx
│   └── profile.tsx
├── services/           # API 封装 + 类型定义
│   ├── client.ts       # Axios 实例
│   ├── types.ts        # 全局类型定义
│   └── *.ts            # 各模块 API 函数
├── layouts/            # 布局组件
│   └── MainLayout.tsx
├── components/         # 公共组件
├── contexts/           # React Context
│   └── UserContext.tsx
└── utils/              # 工具函数
```

### 前端约定

- 路由：Umi 约定式路由，配置在 `.umirc.ts`
- API 请求：统一通过 `services/client.ts` 的 Axios 实例
- 类型定义：集中在 `services/types.ts`
- UI 组件：Ant Design 5.x，聊天界面用 @ant-design/x
- 图表：Lightweight Charts（K 线图）
- 代理：`/api` 代理到 `http://localhost:3001`

## 数据库模型

Schema 统一定义在 `apps/backend/src/core/db/schema.ts`。

| 表名 | 说明 |
|------|------|
| users | 用户 |
| news | 新闻 |
| events | 事件（从新闻提取的结构化事件） |
| signal_rules | 信号规则（全局 + 专属） |
| signals | 交易信号 |
| strategies | 策略（含 webhookId 绑定 Webhook） |
| webhooks | Webhook 配置 |
| klines | K 线数据 |
| backtest_records | 回测记录 |
| backtest_trades | 回测交易记录 |
| stock_trackings | 股票追踪 |
| stocks | 股票信息 |
| stock_blacklist | 黑名单 |
| simulation_accounts | 模拟账户 |
| simulation_positions | 模拟持仓 |
| simulation_trades | 模拟交易记录 |
| scheduler_tasks | 定时任务 |
| chat_messages | Agent 对话历史 |
| api_keys | API Key |
| mcp_logs | MCP 调用日志 |

## 开发命令

```bash
# 基础设施
pnpm run dev:docker          # 启动 PostgreSQL + RabbitMQ + ChromaDB
pnpm run dev:docker:down     # 停止基础设施

# 开发
pnpm run dev:backend         # 启动后端（热重载）
pnpm run dev:frontend        # 启动前端

# 构建
pnpm run build               # 构建全部
pnpm run build:backend       # 构建后端
pnpm run build:frontend      # 构建前端

# 代码质量
pnpm run format              # 格式化
pnpm run lint                # 后端 Lint
pnpm run test:backend        # 后端单元测试
pnpm run test:e2e:backend    # 后端 E2E 测试

# 数据库
cd apps/backend
pnpm run db:generate         # 生成迁移文件
pnpm run db:migrate          # 执行迁移
pnpm run db:studio           # Drizzle Studio
```

## 环境变量

配置文件：`docker/.env`，模板：`docker/.env.example`

```bash
DB_HOST=localhost             # 数据库主机
DB_PORT=5432                  # 数据库端口
DB_USER=admin                 # 数据库用户
DB_PASSWORD=                  # 数据库密码
DB_NAME=a_signal              # 数据库名
RABBITMQ_USER=admin           # RabbitMQ 用户
RABBITMQ_PASS=                # RabbitMQ 密码
JWT_SECRET=                   # JWT 密钥
JWT_EXPIRES_IN=7d             # JWT 过期时间
VOLCENGINE_API_KEY=           # 火山引擎 API Key
CHROMA_HOST=localhost          # ChromaDB 主机
CHROMA_PORT=8000              # ChromaDB 端口
VOLCENGINE_EMBEDDING_MODEL=doubao-embedding-vision-251215
CORS_ORIGIN=*                 # CORS 配置
BACKEND_PORT=3001             # 后端端口
FRONTEND_PORT=8001            # 前端端口
```

## 可用 Skills

| Skill | 用途 |
|-------|------|
| nestjs-best-practices | 开发 NestJS 后端代码时参考 |
| vercel-react-best-practices | 开发 React 前端代码时参考 |
| volcengine-llm-call | 调用火山引擎 LLM API 时参考 |
| news-analyze | 开发新闻分析模块时参考 |
