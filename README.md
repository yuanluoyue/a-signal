# A Signal - 智能股票分析系统

A Signal 是一个基于 AI 的智能股票分析平台，提供新闻情绪分析、交易信号生成、量化回测、智能投研助手和 MCP 服务等功能。

## ✨ 核心功能

### 📊 智能投研助手 (Agent)
基于 LangGraph 的多轮对话投研助手，支持：
- **多轮对话** - 上下文感知的连续对话能力
- **智能工具调用** - 自动识别用户意图并调用相应工具
- **记忆系统** - 短期记忆（PostgreSQL）+ 长期记忆（ChromaDB 向量检索）
- **专业分析输出** - 标准化的投资分析结论格式

### 🔌 MCP 服务
符合 Model Context Protocol 标准的外部 API 接入服务：
- **JSON-RPC 2.0 协议** - 标准化的接口协议
- **API Key 管理** - 完整的密钥生命周期管理
- **限流控制** - 基于令牌桶的速率限制
- **调用日志** - 完整的 API 调用审计

### 📈 信号分析
- **AI 新闻分析** - 基于火山引擎大模型分析新闻情绪
- **交易信号生成** - 自动生成买入/卖出/持有信号
- **信号追踪** - 信号历史记录与效果追踪

### 📰 新闻管理
- **新闻采集** - 自动化新闻爬取
- **向量化存储** - 基于 ChromaDB 的向量检索
- **情绪分析** - 新闻情绪倾向判断

### 💼 模拟交易
- **虚拟账户** - 模拟真实交易环境
- **持仓管理** - 实时盈亏计算
- **交易记录** - 完整的交易历史

### 📊 量化回测
- **策略回测** - 基于历史信号的回测引擎
- **风险控制** - 止盈止损设置
- **绩效报告** - 胜率、收益率、最大回撤等指标

### 🔔 通知系统
- **Webhook 推送** - 支持自定义 Webhook 通知
- **信号过滤** - 基于置信度的通知过滤
- **定时任务** - 可配置的定时调度

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (UMI 4)                        │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │ Dashboard│  News    │ Signals  │ Backtest │ Agent Chat   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (NestJS 11)                        │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐ │
│  │  Agent  │   MCP   │ Signals │ Backtest│  News   │  Queue  │ │
│  │ (LangGraph)│(JSON-RPC)│       │         │         │(RabbitMQ)│
│  └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘ │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐ │
│  │ API Key │  Auth   │  Users  │Simulation│Scheduler│Webhook │ │
│  └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  PostgreSQL   │    │   RabbitMQ    │    │   ChromaDB    │
│  (主数据库)    │    │  (消息队列)    │    │ (向量数据库)   │
└───────────────┘    └───────────────┘    └───────────────┘
```

## 🚀 快速开始

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

## 📁 项目结构

```
a-signal/
├── apps/
│   ├── backend/              # NestJS 后端
│   │   ├── src/
│   │   │   ├── agent/        # 投研 Agent (LangGraph)
│   │   │   ├── mcp/          # MCP Server
│   │   │   ├── api-key/      # API Key 管理
│   │   │   ├── signals/      # 信号管理
│   │   │   ├── backtest/     # 回测引擎
│   │   │   ├── news/         # 新闻管理
│   │   │   ├── queue/        # RabbitMQ 队列
│   │   │   ├── scheduler/    # 定时任务
│   │   │   ├── simulation/   # 模拟交易
│   │   │   └── ...
│   │   └── test/             # E2E 测试
│   ├── frontend/             # UMI 前端
│   │   └── src/
│   │       ├── pages/        # 页面组件
│   │       ├── api/          # API 封装
│   │       └── components/   # 公共组件
│   └── mcp-demo/             # MCP 调用演示 (Next.js)
├── docker/
│   ├── docker-compose.dev.yml
│   └── .env.example
└── .trae/
    ├── skills/               # AI 开发技能
    └── specs/                # 功能规格文档
```

## 🛠️ 开发指南

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

## 📚 核心模块说明

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

**Endpoints:**
- `POST /mcp/v1` - JSON-RPC 2.0 接口
- `GET /mcp/tools` - Tools 文档

**Tools:**
- `query_recent_news` - 查询最近新闻
- `query_news_by_keyword` - 关键词搜索新闻
- `query_backtest_data` - 查询回测数据
- `query_recent_signals` - 查询最近信号

### 队列消费者

| 消费者 | 职责 |
|--------|------|
| `KlineFetchConsumer` | 获取 K线数据 |
| `NewsCrawlConsumer` | 爬取新闻 |
| `NewsVectorizeConsumer` | 新闻向量化 |
| `SignalAnalyzeConsumer` | 信号分析 |
| `StockTrackFetchConsumer` | 股票跟踪数据获取 |

## 🗄️ 数据库模型

### 核心表

| 表名 | 说明 |
|------|------|
| `users` | 用户表 |
| `news` | 新闻表 |
| `signals` | 交易信号表 |
| `klines` | K线数据表 |
| `simulation_accounts` | 模拟账户表 |
| `simulation_positions` | 模拟持仓表 |
| `simulation_trades` | 模拟交易记录表 |
| `backtest_records` | 回测记录表 |
| `stock_trackings` | 股票追踪表 |
| `stock_blacklist` | 黑名单表 |
| `webhooks` | Webhook 配置表 |
| `scheduler_tasks` | 定时任务表 |
| `chat_messages` | Agent 对话历史表 |
| `api_keys` | API Key 表 |
| `mcp_logs` | MCP 调用日志表 |

## 🔧 技术栈

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
- **框架**: UMI 4.x + React 18
- **语言**: TypeScript
- **UI 库**: Ant Design 5.x + @ant-design/x
- **图表**: Lightweight Charts
- **状态管理**: UMI Model

### 基础设施
- **包管理**: pnpm 10.x
- **容器**: Docker + Docker Compose
- **测试**: Jest + SuperTest

## 📖 文档

- [AGENTS.md](./AGENTS.md) - 开发指南和项目规范
- [Swagger API](http://localhost:3001/api) - API 文档
- [MCP Tools](http://localhost:3001/mcp/tools) - MCP Tools 文档
