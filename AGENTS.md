# AGENTS.md

开发项目时需要遵守项目已有 skill

## 项目概述

A Signal 是一个全栈 monorepo 项目，提供股票分析系统，包含 AI 驱动的新闻分析、量化回测、持仓管理等功能。

### 技术栈

| 层级 | 技术 |
|------|------|
| 包管理器 | pnpm |
| 后端框架 | NestJS 11.x |
| 数据库 | PostgreSQL 15 + Drizzle ORM |
| 消息队列 | RabbitMQ |
| 向量数据库 | ChromaDB |
| AI/ML | LangChain + LangGraph + OpenAI |
| 前端框架 | UMI 4.x + React 18 |
| UI 组件库 | Ant Design 5.x |
| API 文档 | Swagger (OpenAPI 3.0) |

### 架构说明

```
apps/
├── backend/          # NestJS 后端服务
│   └── src/
│       ├── ai/       # AI 新闻分析 (LangGraph)
│       ├── ai-chat/  # AI 对话功能
│       ├── signals/  # 信号管理
│       ├── positions/# 持仓管理
│       ├── news/     # 新闻采集
│       ├── queue/    # RabbitMQ 队列
│       └── ...
└── frontend/         # UMI 前端应用
```

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
# 启动后端（热重载）
pnpm run dev:backend

# 启动前端
pnpm run dev:frontend

```

### 构建

```bash
# 构建后端
pnpm run build:backend

# 构建前端
pnpm run build:frontend
```


### 代码质量

```bash
# 格式化代码（整个项目）
pnpm run format

# 后端 Lint
pnpm --filter backend run lint
```

### 数据库迁移

```bash
# 数据库迁移文件位于 src/migrations/
# 使用 Drizzle ORM 管理数据库 schema
```

---

## 项目结构

### 后端核心模块

| 模块 | 路径 | 职责 |
|------|------|------|
| `ai` | `src/ai/` | LangGraph 新闻分析图、状态管理 |
| `ai-chat` | `src/ai-chat/` | AI 对话、LangChain Tools |
| `signals` | `src/signals/` | 信号 CRUD、信号历史 |
| `positions` | `src/positions/` | 持仓管理 |
| `news` | `src/news/` | 新闻采集、解析、定时任务 |
| `stocks` | `src/stocks/` | 股票数据 |
| `klines` | `src/klines/` | K线数据 |
| `backtest` | `src/backtest/` | 回测引擎 |
| `queue` | `src/queue/` | RabbitMQ 队列生产者/消费者 |
| `vector` | `src/vector/` | ChromaDB 向量存储 |
| `mcp` | `src/mcp/` | MCP Server 集成 |
| `scheduler` | `src/scheduler/` | 定时任务调度 |

### 前端核心目录

```
apps/frontend/src/
├── pages/          # 页面组件
├── api/             # API 请求封装
└── layouts/         # 布局组件
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

- **模块化**：每个功能域独立模块（如 `SignalsModule`、`PositionsModule`）
- **依赖注入**：优先使用构造函数注入
- **DTO**：使用 `class-validator` + `class-transformer` 验证输入
- **异常处理**：使用 `AllExceptionsFilter` 统一处理
- **响应拦截**：使用 `ResponseInterceptor` 统一响应格式
- **API 版本**：全局前缀 `api/v1`，排除 `/mcp/v1/*`

### 前端规范

- 使用 UMI 4.x 约定式路由
- API 请求封装在 `src/api/` 目录
- 使用 Ant Design 组件库

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

---

## 环境变量

### 必需配置（docker/.env）

```bash
# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=your-secure-password
DB_NAME=a_signal_test

# RabbitMQ
RABBITMQ_USER=admin
RABBITMQ_PASS=your-secure-password

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# 火山平台 key
VOLCENGINE_API_KEY=your-key

# ChromaDB Configuration
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

---

