# A Signal - AI 驱动的量化交易信号系统

A Signal 是一个基于 AI 的智能股票分析平台，通过新闻事件提取、情绪分析、信号生成、策略过滤、Webhook 通知的完整链路，将非结构化新闻信息转化为可执行的交易机会。同时内置 AI 投研助手、交易经验管理、量化回测、模拟交易等功能模块。

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

### 交易与分析

| 模块 | 说明 |
|------|------|
| 量化回测 | 选择策略 + 时间范围回测，生成交易记录和绩效指标 |
| 模拟交易 | 虚拟账户、持仓管理、交易记录、权益曲线 |
| 运行管理 | 策略运行时配置（Webhook / 模拟 / 实盘开关） |
| 综合分析 | 仪表盘统计、综合分析、策略总览 |
| 交易经验 | 经验统计与列表，支持类型/状态/关键词筛选，详情弹窗查看模式匹配与统计数据 |

### AI 智能体

| 模块 | 说明 |
|------|------|
| AI 投研助手 | 基于 LangGraph 的多轮对话，支持工具调用和记忆系统 |
| 交易经验 | 管理 Agent 积累的交易经验模式（事件/信号/策略/市场环境/风险），为交易 Agent 提供决策依据 |
| MCP 服务 | 符合 Model Context Protocol 的外部 API 接入 |

### 数据中心

| 模块 | 说明 |
|------|------|
| 新闻管理 | 新闻列表、详情、AI 分析状态 |
| 股票查询 | 股票搜索、详情、K 线数据 |
| 股票追踪 | 追踪关注股票，关联新闻和事件 |

### 系统设置

| 模块 | 说明 |
|------|------|
| 通知设置 | Webhook 管理（微信通知） |
| 定时任务 | 定时任务调度管理 |
| API Key | 外部 API 密钥管理 |
| 黑名单 | 过滤不想接收信号的股票 |
| 审计日志 | 系统操作审计记录 |

## 技术架构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Frontend (Umi 4 + React 18)                       │
│  ┌─────────┬──────┬────────┬──────────┬──────────┬──────────┬─────────┐ │
│  │Dashboard │News  │Signals │ Strategy │ Backtest │ Agent    │Trading  │ │
│  │Analysis  │Stocks│Events  │ Runtime  │Simulation│ Chat     │Memory   │ │
│  └─────────┴──────┴────────┴──────────┴──────────┴──────────┴─────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         Backend (NestJS 11)                              │
│                                                                          │
│  信号管线            交易与分析          基础设施                        │
│  ┌──────────┐       ┌──────────┐        ┌──────────┐                   │
│  │News      │       │Backtest  │        │Auth      │                   │
│  │Event     │       │Simulation│        │Users     │                   │
│  │SignalRule│       │Runtime   │        │API Key   │                   │
│  │SignalGen │       │Dashboard │        │Scheduler │                   │
│  │Strategy  │       │Analysis  │        │Webhook   │                   │
│  │Notification│     │AuditLog  │        │Cache     │                   │
│  └──────────┘       └──────────┘        └──────────┘                   │
│                                                                          │
│  AI 智能体            数据中心                                           │
│  ┌──────────┐       ┌──────────┐                                       │
│  │Agent     │       │Stocks    │                                       │
│  │TradingMem│       │StockTrack│                                       │
│  │MCP       │       │Klines    │                                       │
│  └──────────┘       └──────────┘                                       │
│                                                                          │
│  队列消费者                                                               │
│  ┌─────────┬──────────────┬──────────────┬──────────────┬────────────┐  │
│  │NewsCrawl│EventAnalyze  │NewsVectorize │KlineFetch    │StockTrack  │  │
│  └─────────┴──────────────┴──────────────┴──────────────┴────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
   ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
   │  PostgreSQL   │       │   RabbitMQ    │       │   ChromaDB    │
   │  (主数据库)    │       │  (消息队列)    │       │ (向量数据库)   │
   └───────────────┘       └───────────────┘       └───────────────┘
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
- RabbitMQ 4.2 (端口 5672, 管理界面 15672)
- ChromaDB (端口 8000)

### 5. 数据库迁移与种子数据

```bash
cd apps/backend

# 执行迁移
pnpm run db:migrate

# 插入种子数据
pnpm run seed
```

### 6. 启动应用

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
│   │   │   ├── core/             # 核心基础设施（数据库、队列、向量、缓存、日志、认证）
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
│   │       ├── components/       # 公共组件
│   │       ├── contexts/         # React Context
│   │       └── utils/            # 工具函数
│   └── mcp-demo/                 # MCP 调用演示 (Next.js)
├── docker/
│   ├── docker-compose.dev.yml
│   └── .env.example
└── .trae/
    ├── documents/                # 开发计划文档
    ├── rules/                    # 开发规则约束
    ├── skills/                   # AI 技能定义
    └── specs/                    # 功能规格文档
```

### 后端架构分层

```
src/
├── common/                       # 通用基础设施
│   ├── decorators/               # @CurrentUser, @Public
│   ├── errors/                   # 错误定义
│   ├── filters/                  # 异常过滤器
│   ├── guards/                   # JwtAuthGuard
│   ├── interceptors/             # 响应拦截器
│   └── middleware/               # TraceIdMiddleware
│
├── core/                         # 核心基础设施
│   ├── auth/                     # JWT/API Key 认证策略
│   ├── cache/                    # 缓存服务
│   ├── db/                       # 数据库（Drizzle ORM + Schema）
│   ├── logger/                   # Winston 日志
│   ├── queue/                    # RabbitMQ 消息队列
│   ├── vector/                   # ChromaDB 向量数据库
│   └── volcengine/               # 火山引擎 AI 服务
│
├── interfaces/                   # API 接口层（Controller + DTO）
│   ├── admin/                    # 管理端 API（/api/v1/）
│   │   ├── agent/                # AI 投研助手
│   │   ├── api-key/              # API Key 管理
│   │   ├── audit-log/            # 审计日志
│   │   ├── auth/                 # 认证
│   │   ├── backtest/             # 回测
│   │   ├── blacklist/            # 黑名单
│   │   ├── dashboard/            # 仪表盘
│   │   ├── events/               # 事件
│   │   ├── health/               # 健康检查
│   │   ├── klines/               # K 线数据
│   │   ├── news/                 # 新闻
│   │   ├── notifications/        # Webhook 通知
│   │   ├── scheduler/            # 定时任务
│   │   ├── signal-rules/         # 信号规则
│   │   ├── signals/              # 信号
│   │   ├── simulation/           # 模拟交易
│   │   ├── stock-tracking/       # 股票追踪
│   │   ├── stock/                # 股票信息
│   │   ├── stocks/               # 股票列表
│   │   ├── strategy/             # 策略
│   │   └── trading-memory/       # 交易经验
│   └── mcp/                      # MCP 对外接口（/mcp/）
│
├── modules/                      # 业务模块（Service 层）
│   ├── agent/                    # Agent 服务（graph/memory/nodes/tools）
│   ├── api-key/                  # API Key 服务
│   ├── audit-log/                # 审计日志服务
│   ├── auth/                     # 认证服务
│   ├── backtest/                 # 回测服务
│   ├── blacklist/                # 黑名单服务
│   ├── dashboard/                # 仪表盘服务
│   ├── event/                    # 事件服务
│   ├── klines/                   # K 线服务
│   ├── mcp/                      # MCP 服务
│   ├── news/                     # 新闻服务
│   ├── notifications/            # 通知 + Webhook 服务
│   ├── scheduler/                # 定时任务服务
│   ├── signal-generator/         # 信号生成服务
│   ├── signal-rule/              # 信号规则服务
│   ├── signals/                  # 信号服务
│   ├── simulation/               # 模拟交易服务
│   ├── stock/                    # 股票信息服务
│   ├── stock-tracking/           # 股票追踪服务
│   ├── stocks/                   # 股票列表服务
│   ├── strategy/                 # 策略服务
│   ├── trading-memory/           # 交易经验服务
│   └── users/                    # 用户服务
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

# 插入种子数据
pnpm run seed

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

**记忆系统：**
- 短期记忆：当前会话上下文
- 长期记忆：PostgreSQL 持久化 + ChromaDB 向量检索
- 记忆加载/保存节点自动管理

### 交易经验模块

管理 Agent 积累的交易经验模式，为后续交易 Agent 提供决策依据：

**经验类型：**
- `event_pattern` - 事件模式（如并购事件短期做多）
- `signal_pattern` - 信号模式（如高分信号跟随策略）
- `strategy_pattern` - 策略模式（如低波动保守多头）
- `market_regime_pattern` - 市场环境模式（如高波动做空优势）
- `risk_pattern` - 风险模式（如盈利超预期后追高风险）

**经验状态：**
- `testing` - 测试中
- `active` - 活跃（已验证有效）
- `dormant` - 休眠（长期未验证）
- `invalidated` - 已失效

**每条经验包含：**
- 模式匹配条件（pattern）：事件类型、市场环境、信号方向、分数范围等
- 统计数据（stats）：样本量、胜率、平均收益、夏普比率、最大回撤等
- 置信度（confidence）：0~1，≥ 0.8 为高置信

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
| `strategies_runtime` | 策略运行时配置表 |
| `webhooks` | Webhook 配置表 |
| `klines` | K 线数据表 |
| `backtest_records` | 回测记录表 |
| `backtest_trades` | 回测交易明细表 |
| `stock_trackings` | 股票追踪表 |
| `stocks` | 股票信息表 |
| `stock_blacklist` | 黑名单表 |
| `simulation_accounts` | 模拟账户表 |
| `simulation_positions` | 模拟持仓表 |
| `simulation_trades` | 模拟交易记录表 |
| `simulation_equity_curve` | 模拟权益曲线表 |
| `scheduler_tasks` | 定时任务表 |
| `chat_messages` | Agent 对话历史表 |
| `api_keys` | API Key 表 |
| `mcp_logs` | MCP 调用日志表 |
| `audit_logs` | 审计日志表 |
| `trading_memories` | 交易经验表 |

## 技术栈

### 后端
- **框架**: NestJS 11.x
- **语言**: TypeScript 5.x
- **数据库**: PostgreSQL 15 + Drizzle ORM
- **消息队列**: RabbitMQ (amqplib)
- **向量数据库**: ChromaDB
- **AI/ML**: LangChain + LangGraph + 火山引擎
- **认证**: JWT + Passport
- **缓存**: 内存缓存
- **日志**: Winston
- **文档**: Swagger/OpenAPI

### 前端
- **框架**: Umi 4.x + React 18
- **语言**: TypeScript
- **UI 库**: Ant Design 5.x + @ant-design/x
- **图表**: Lightweight Charts
- **状态管理**: Umi Model
- **国际化**: @umijs/plugin-locale

### 基础设施
- **包管理**: pnpm 10.x (monorepo)
- **容器**: Docker + Docker Compose
- **测试**: Jest + SuperTest

## 文档

- [AGENTS.md](./AGENTS.md) - 开发指南和项目规范
- [Swagger API](http://localhost:3001/api) - API 文档
- [MCP Tools](http://localhost:3001/mcp/tools) - MCP Tools 文档
