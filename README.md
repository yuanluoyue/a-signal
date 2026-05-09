# A Signal - AI 驱动的量化交易信号系统

A Signal 是一个基于 AI 的智能股票分析平台，通过新闻事件提取、情绪分析、信号生成、策略过滤、Webhook 通知的完整链路，将非结构化新闻信息转化为可执行的交易机会。

## 核心流程

```
新闻采集 → 事件提取（AI）→ 信号生成（规则引擎）→ 策略过滤 → Webhook 通知
                                                              ↓
                                                         量化回测验证
```

1. **新闻采集**：定时爬取财经新闻，入队待处理
2. **事件提取**：AI 分析新闻，提取结构化事件（类别、方向、重要性、置信度、有效期）
3. **信号生成**：规则引擎基于事件生成交易信号（做多/做空/观望），计算综合分数
4. **策略过滤**：已启用的策略按条件（分数、方向、类别、规则）过滤信号，匹配的交易机会通过策略绑定的 Webhook 发送通知
5. **量化回测**：基于历史信号和策略参数回测，验证策略有效性

## 功能模块

### 信号管线

| 模块 | 说明 |
|------|------|
| 新闻管理 | 自动爬取、AI 分析、向量化存储 |
| 事件分析 | 从新闻提取结构化事件（宏观/政策/公司/市场/情绪） |
| 信号规则 | 全局规则 + 事件类型专属规则，控制信号生成的阈值和乘数 |
| 信号生成 | 基于规则引擎自动生成交易信号，计算综合分数 |
| 策略管理 | 定义筛选条件（分数范围、方向模式、事件类别、规则 ID）并绑定 Webhook |
| 策略通知 | 信号经策略过滤后，通过绑定的 Webhook 推送交易机会（含策略名称） |

### 辅助功能

| 模块 | 说明 |
|------|------|
| 量化回测 | 选择策略 + 时间范围回测，生成交易记录和绩效指标 |
| 股票追踪 | 追踪关注股票，K 线叠加信号标记，关联新闻和事件 |
| 模拟交易 | 虚拟账户、持仓管理、交易记录 |
| AI 投研助手 | 基于 LangGraph 的多轮对话，支持工具调用和记忆系统 |
| MCP 服务 | 符合 Model Context Protocol 的外部 API 接入 |
| 黑名单 | 过滤不想接收信号的股票 |

## 技术架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (Umi 4 + React 18)               │
│  ┌───────┬──────┬───────┬──────────┬──────────┬───────────────┐ │
│  │Dashboard│News │Signals│ Strategy │ Backtest │ Agent Chat    │ │
│  └───────┴──────┴───────┴──────────┴──────────┴───────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Backend (NestJS 11)                        │
│                                                                  │
│  信号管线          辅助模块           基础设施                    │
│  ┌──────────┐     ┌──────────┐      ┌──────────┐               │
│  │News      │     │Backtest  │      │Auth      │               │
│  │Event     │     │Simulation│      │Users     │               │
│  │SignalRule│     │StockTrack│      │API Key   │               │
│  │SignalGen │     │Agent     │      │Scheduler │               │
│  │Strategy  │     │MCP       │      │Webhook   │               │
│  │Notification│   │Blacklist │      │Dashboard │               │
│  └──────────┘     └──────────┘      └──────────┘               │
│                                                                  │
│  队列消费者                                                       │
│  ┌─────────┬──────────────┬──────────────┬─────────────────┐    │
│  │NewsCrawl│EventAnalyze  │NewsVectorize │KlineFetch       │    │
│  └─────────┴──────────────┴──────────────┴─────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
 ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
 │  PostgreSQL   │     │   RabbitMQ    │     │   ChromaDB    │
 │  (主数据库)    │     │  (消息队列)    │     │ (向量数据库)   │
 └───────────────┘     └───────────────┘     └───────────────┘
```

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 10
- Docker & Docker Compose

### 1. 克隆项目

```bash
git clone <repository-url>
cd a-signal
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cp docker/.env.example docker/.env
# 编辑 docker/.env 填入实际配置
```

必需配置项：

```env
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

# 火山引擎 (AI 服务)
VOLCENGINE_API_KEY=your-volcengine-api-key

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

### 4. 启动基础设施

```bash
pnpm run dev:docker
```

这将启动：
- PostgreSQL 15 (端口 5432)
- RabbitMQ (端口 5672, 管理界面 15672)
- ChromaDB (端口 8000)

### 5. 启动应用

```bash
# 终端 1: 启动后端
pnpm run dev:backend

# 终端 2: 启动前端
pnpm run dev:frontend
```

访问地址：
- 前端: http://localhost:8001
- 后端 API: http://localhost:3001
- Swagger 文档: http://localhost:3001/api
- RabbitMQ 管理界面: http://localhost:15672

## 项目结构

```
a-signal/
├── apps/
│   ├── backend/                  # NestJS 后端
│   │   ├── migrations/           # 数据库迁移文件 (Drizzle ORM)
│   │   ├── scripts/              # 迁移和种子脚本
│   │   ├── src/
│   │   │   ├── common/           # 通用基础设施（装饰器、守卫、拦截器、中间件）
│   │   │   ├── core/             # 核心基础设施（数据库、队列、向量、日志、认证）
│   │   │   ├── interfaces/       # API 接口层
│   │   │   │   ├── admin/        # 管理端 API（/api/v1/）
│   │   │   │   └── mcp/          # MCP 对外接口（/mcp/）
│   │   │   ├── modules/          # 业务模块（Service 层）
│   │   │   ├── jobs/             # 定时任务和队列消费者
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── test/
│   ├── frontend/                 # Umi 前端
│   │   └── src/
│   │       ├── pages/            # 页面组件
│   │       ├── services/         # API 封装和类型定义
│   │       ├── layouts/          # 布局组件
│   │       └── components/       # 公共组件
│   └── mcp-demo/                 # MCP 调用演示 (Next.js)
├── docker/
│   ├── docker-compose.dev.yml
│   └── .env.example
└── .trae/
    └── specs/                    # 功能规格文档
```

### 后端架构分层

```
src/
├── common/                       # 通用基础设施
│   ├── decorators/               # @CurrentUser, @Public
│   ├── filters/                  # 异常过滤器
│   ├── guards/                   # JwtAuthGuard
│   ├── interceptors/             # 响应拦截器
│   └── middleware/               # TraceIdMiddleware
│
├── core/                         # 核心基础设施
│   ├── auth/                     # JWT/API Key 认证策略
│   ├── db/                       # 数据库（Drizzle ORM + Schema）
│   ├── logger/                   # Winston 日志
│   ├── queue/                    # RabbitMQ 队列
│   ├── vector/                   # ChromaDB 向量数据库
│   └── volcengine/               # 火山引擎 AI 服务
│
├── interfaces/                   # API 接口层（Controller + DTO）
│   ├── admin/                    # 管理端 API（/api/v1/）
│   │   ├── auth/                 # 认证
│   │   ├── news/                 # 新闻
│   │   ├── events/               # 事件
│   │   ├── signals/              # 信号
│   │   ├── signal-rules/         # 信号规则
│   │   ├── strategy/             # 策略
│   │   ├── notifications/        # Webhook 通知
│   │   ├── backtest/             # 回测
│   │   ├── stock-tracking/       # 股票追踪
│   │   ├── simulation/           # 模拟交易
│   │   ├── agent/                # AI 投研
│   │   └── ...
│   └── mcp/                      # MCP 对外接口（/mcp/）
│
├── modules/                      # 业务模块（Service 层）
│   ├── news/                     # 新闻服务
│   ├── event/                    # 事件服务
│   ├── signal-rule/              # 信号规则服务
│   ├── signal-generator/         # 信号生成服务
│   ├── strategy/                 # 策略服务
│   ├── notifications/            # 通知 + Webhook 服务
│   ├── backtest/                 # 回测服务
│   ├── stock-tracking/           # 股票追踪服务
│   ├── agent/                    # Agent 服务（graph/memory/nodes/tools）
│   ├── mcp/                      # MCP 服务
│   └── ...
│
└── jobs/                         # 定时任务和队列消费者
    ├── scheduler-tasks.service.ts
    ├── news-crawl.consumer.ts
    ├── event-analyze.consumer.ts
    ├── news-vectorize.consumer.ts
    ├── kline-fetch.consumer.ts
    └── stock-track-fetch.consumer.ts
```

## 开发指南

### 常用命令

```bash
# 启动基础设施
pnpm run dev:docker

# 启动后端开发服务器
pnpm run dev:backend

# 启动前端开发服务器
pnpm run dev:frontend

# 启动 MCP Demo
pnpm run dev:demo

# 代码格式化
pnpm run format

# 代码检查
pnpm run lint

# 运行测试
pnpm run test:backend
pnpm run test:e2e:backend
```

### 数据库迁移

```bash
cd apps/backend

# 生成迁移文件
pnpm run db:generate

# 执行迁移
pnpm run db:migrate

# 启动 Drizzle Studio
pnpm run db:studio
```

### 构建部署

```bash
# 构建后端
pnpm run build:backend

# 构建前端
pnpm run build:frontend

# 构建全部
pnpm run build
```

## 核心模块说明

### 信号生成管线

信号从新闻到通知的完整链路：

```
新闻 → EventAnalyzeConsumer → 事件提取 (AI)
                                    ↓
                              SignalGeneratorService → 信号生成 (规则引擎)
                                    ↓
                              NotificationsService → 策略过滤 → Webhook 通知
```

**信号规则引擎**：
- 全局规则：所有事件通用的阈值和乘数
- 专属规则：按事件类型（如 cpi、earnings_actual）定制的乘数
- 信号分数 = 重要性 × 方向 × 置信度 × (1 + 惊喜值) × 规则乘数

**策略过滤**：
- 分数范围：minScore / maxScore
- 方向模式：仅做多 / 仅做空 / 双向
- 事件类别：macro / policy / company / market / sentiment
- 规则 ID：限定信号来源规则

### Agent 模块

基于 LangGraph 的投研助手，包含 7 个核心节点：

| 节点 | 职责 |
|------|------|
| `memoryLoadNode` | 加载短期记忆和长期记忆 |
| `intentNode` | 识别用户意图 |
| `plannerNode` | 生成工具调用计划 |
| `toolNode` | 执行工具 |
| `aggregatorNode` | 整合观察结果 |
| `finalNode` | 生成最终回答 |
| `memorySaveNode` | 保存对话和记忆 |

**可用 Tools：**
- `get_news_by_date_range` - 按日期查询新闻
- `search_news_by_keyword` - 向量搜索新闻
- `get_user_portfolio` - 获取用户持仓
- `get_signals_by_date_range` - 按日期查询信号
- `get_reports_by_stock` - 获取股票研报
- `get_backtest_by_stock` - 获取回测记录

### MCP 模块

提供符合 MCP 标准的外部 API：

**Endpoints：**
- `POST /mcp/v1` - JSON-RPC 2.0 接口
- `GET /mcp/tools` - Tools 文档

**Tools：**
- `query_recent_news` - 查询最近新闻
- `query_news_by_keyword` - 关键词搜索新闻
- `query_backtest_data` - 查询回测数据
- `query_recent_signals` - 查询最近信号

### 队列消费者

| 消费者 | 职责 |
|--------|------|
| `NewsCrawlConsumer` | 爬取财经新闻 |
| `EventAnalyzeConsumer` | AI 事件提取和信号生成 |
| `NewsVectorizeConsumer` | 新闻向量化存储 |
| `KlineFetchConsumer` | 获取 K 线数据 |
| `StockTrackFetchConsumer` | 股票追踪数据获取 |

## 数据库模型

| 表名 | 说明 |
|------|------|
| `users` | 用户表 |
| `news` | 新闻表 |
| `events` | 事件表（从新闻提取的结构化事件） |
| `signal_rules` | 信号规则表（全局 + 专属规则） |
| `signals` | 交易信号表 |
| `strategies` | 策略表（含 webhookId 绑定 Webhook） |
| `webhooks` | Webhook 配置表 |
| `klines` | K 线数据表 |
| `backtest_records` | 回测记录表 |
| `backtest_trades` | 回测交易记录表 |
| `stock_trackings` | 股票追踪表 |
| `stocks` | 股票信息表 |
| `stock_blacklist` | 黑名单表 |
| `simulation_accounts` | 模拟账户表 |
| `simulation_positions` | 模拟持仓表 |
| `simulation_trades` | 模拟交易记录表 |
| `scheduler_tasks` | 定时任务表 |
| `chat_messages` | Agent 对话历史表 |
| `api_keys` | API Key 表 |
| `mcp_logs` | MCP 调用日志表 |

## 技术栈

### 后端
- **框架**: NestJS 11.x
- **语言**: TypeScript 5.x
- **数据库**: PostgreSQL 15 + Drizzle ORM
- **消息队列**: RabbitMQ
- **向量数据库**: ChromaDB
- **AI/ML**: LangChain + LangGraph + 火山引擎
- **认证**: JWT + Passport
- **文档**: Swagger/OpenAPI

### 前端
- **框架**: Umi 4.x + React 18
- **语言**: TypeScript
- **UI 库**: Ant Design 5.x + @ant-design/x
- **图表**: Lightweight Charts
- **状态管理**: Umi Model

### 基础设施
- **包管理**: pnpm 10.x
- **容器**: Docker + Docker Compose
- **测试**: Jest + SuperTest

## 文档

- [AGENTS.md](./AGENTS.md) - 开发指南和项目规范
- [Swagger API](http://localhost:3001/api) - API 文档
- [MCP Tools](http://localhost:3001/mcp/tools) - MCP Tools 文档
