# 后端代码架构重组 Spec

## Why
当前后端代码所有模块扁平化平铺在 `src/` 下，缺少分层结构（core/modules/jobs/interfaces），DTO 组织不一致，Guard 使用不统一，消费者散落各处。需要按照分层架构重新组织代码，提高可维护性和一致性。

## What Changes
- 将扁平化目录结构重组为 `common/`、`core/`、`interfaces/`、`modules/`、`jobs/` 五层架构
- 将基础设施模块（database、queue、vector、volcengine、auth 策略/guard）移入 `core/`
- 将业务模块（news、signals、backtest 等）移入 `modules/`，仅保留 service 和 module
- 将 API 控制器和 DTO 移入 `interfaces/admin/`（管理端 API）和 `interfaces/mcp/`（MCP 对外接口）
- 将消费者和定时任务移入 `jobs/`
- migrations 目录移到与 src 同级
- 统一 DTO 组织方式（全部使用 `dto/` 子目录 + `index.ts` 导出）
- 统一 Guard 使用方式（依赖全局 APP_GUARD，需要公开路由使用 @Public()）
- 统一数据库访问模式（统一使用 DbService）
- 将 `health.controller.ts` 纳入模块管理

## Impact
- Affected specs: 所有后端模块的目录位置和导入路径
- Affected code: apps/backend/src/ 下所有文件

## 最终目录结构

```
apps/backend/
├── migrations/                    # 数据库迁移（与 src 同级）
│
├── src/
│   ├── common/                    # 通用基础设施
│   │   ├── decorators/            # 自定义装饰器（@CurrentUser, @Public）
│   │   ├── filters/               # 异常过滤器
│   │   ├── guards/                # 守卫（JwtAuthGuard）
│   │   ├── interceptors/          # 拦截器
│   │   └── middleware/            # 中间件（TraceIdMiddleware）
│   │
│   ├── core/                      # 核心基础设施
│   │   ├── auth/                  # 认证基础设施（JWT 策略、API Key 策略）
│   │   ├── db/                    # 数据库（schema.ts, db.service.ts）
│   │   ├── logger/                # Winston 日志配置
│   │   ├── queue/                 # 消息队列基础设施
│   │   ├── vector/                # 向量数据库基础设施
│   │   └── volcengine/            # 火山引擎基础设施
│   │
│   ├── interfaces/                # API 接口层
│   │   ├── admin/                 # 管理端 API（/api/v1/）
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   └── dto/
│   │   │   ├── news/
│   │   │   │   ├── news.controller.ts
│   │   │   │   └── dto/
│   │   │   ├── signals/
│   │   │   │   ├── signals.controller.ts
│   │   │   │   └── dto/
│   │   │   ├── backtest/
│   │   │   │   ├── backtest.controller.ts
│   │   │   │   └── dto/
│   │   │   ├── stocks/
│   │   │   │   ├── stocks.controller.ts
│   │   │   │   └── dto/
│   │   │   ├── klines/
│   │   │   │   ├── klines.controller.ts
│   │   │   │   └── dto/
│   │   │   ├── dashboard/
│   │   │   │   ├── dashboard.controller.ts
│   │   │   │   └── dto/
│   │   │   ├── blacklist/
│   │   │   │   ├── blacklist.controller.ts
│   │   │   │   └── dto/
│   │   │   ├── simulation/
│   │   │   │   ├── simulation.controller.ts
│   │   │   │   └── dto/
│   │   │   ├── stock-tracking/
│   │   │   │   ├── stock-tracking.controller.ts
│   │   │   │   └── dto/
│   │   │   ├── scheduler/
│   │   │   │   ├── scheduler.controller.ts
│   │   │   │   └── dto/
│   │   │   ├── notifications/
│   │   │   │   ├── webhooks.controller.ts
│   │   │   │   └── dto/
│   │   │   ├── api-key/
│   │   │   │   ├── api-key.controller.ts
│   │   │   │   └── dto/
│   │   │   ├── agent/
│   │   │   │   ├── agent.controller.ts
│   │   │   │   └── dto/
│   │   │   └── health/
│   │   │       └── health.controller.ts
│   │   │
│   │   └── mcp/                   # MCP 对外接口（/mcp/v1/）
│   │       ├── mcp.controller.ts
│   │       └── dto/
│   │
│   ├── modules/                   # 业务模块（Service 层，被控制器复用）
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   └── auth.service.ts
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   └── users.service.ts
│   │   ├── news/
│   │   │   ├── news.module.ts
│   │   │   └── news.service.ts
│   │   ├── signals/
│   │   │   ├── signals.module.ts
│   │   │   ├── signals.service.ts
│   │   │   └── signal-analyze.service.ts
│   │   ├── backtest/
│   │   │   ├── backtest.module.ts
│   │   │   └── backtest.service.ts
│   │   ├── stocks/
│   │   │   ├── stocks.module.ts
│   │   │   └── stocks.service.ts
│   │   ├── klines/
│   │   │   ├── klines.module.ts
│   │   │   └── klines.service.ts
│   │   ├── dashboard/
│   │   │   ├── dashboard.module.ts
│   │   │   └── dashboard.service.ts
│   │   ├── blacklist/
│   │   │   ├── blacklist.module.ts
│   │   │   └── blacklist.service.ts
│   │   ├── simulation/
│   │   │   ├── simulation.module.ts
│   │   │   └── simulation.service.ts
│   │   ├── stock-tracking/
│   │   │   ├── stock-tracking.module.ts
│   │   │   └── stock-tracking.service.ts
│   │   ├── scheduler/
│   │   │   ├── scheduler.module.ts
│   │   │   └── scheduler.service.ts
│   │   ├── notifications/
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.service.ts
│   │   │   └── webhooks.service.ts
│   │   ├── api-key/
│   │   │   ├── api-key.module.ts
│   │   │   └── api-key.service.ts
│   │   ├── agent/
│   │   │   ├── agent.module.ts
│   │   │   ├── research-agent.service.ts
│   │   │   ├── graph/
│   │   │   ├── memory/
│   │   │   ├── nodes/
│   │   │   ├── tools/
│   │   │   └── types/
│   │   └── mcp/
│   │       ├── mcp.module.ts
│   │       ├── mcp.service.ts
│   │       ├── mcp.guard.ts
│   │       ├── mcp.types.ts
│   │       ├── mcp-logger.service.ts
│   │       ├── rate-limiter.service.ts
│   │       └── tools/
│   │
│   ├── jobs/                      # 定时任务和消费者
│   │   ├── scheduler-tasks.service.ts
│   │   ├── news-crawl.consumer.ts
│   │   ├── news-vectorize.consumer.ts
│   │   ├── signal-analyze.consumer.ts
│   │   ├── kline-fetch.consumer.ts
│   │   └── stock-track-fetch.consumer.ts
│   │
│   ├── app.module.ts              # 根模块
│   └── main.ts                    # 入口文件
```

## ADDED Requirements

### Requirement: 分层目录结构
The system SHALL 将后端代码按 `common/`、`core/`、`interfaces/`、`modules/`、`jobs/` 五层组织

#### Scenario: 目录结构验证
- **GIVEN** 后端项目源码目录
- **WHEN** 检查目录结构
- **THEN** 存在 `common/`、`core/`、`interfaces/`、`modules/`、`jobs/` 五个顶层目录
- **AND** 不存在旧的扁平化模块目录（如 `src/auth/`、`src/news/` 等）

### Requirement: migrations 目录位置
The system SHALL 将 migrations 目录放在与 src 同级的位置

#### Scenario: migrations 目录验证
- **GIVEN** apps/backend/ 目录
- **WHEN** 检查目录结构
- **THEN** migrations 目录存在于 apps/backend/migrations/
- **AND** migrations 目录不在 src/ 内部

### Requirement: interfaces 层 - API 接口层
The system SHALL 在 `interfaces/` 目录下按端点类型组织 API 控制器

#### Scenario: 管理端接口
- **GIVEN** interfaces/admin/ 目录
- **WHEN** 检查结构
- **THEN** 所有管理端控制器按模块组织

#### Scenario: MCP 对外接口
- **GIVEN** interfaces/mcp/ 目录
- **WHEN** 检查文件
- **THEN** 包含 mcp.controller.ts（MCP 协议对外接口）

#### Scenario: 控制器与 DTO 组织
- **GIVEN** interfaces/admin/[module]/ 目录
- **WHEN** 检查每个模块目录
- **THEN** 包含 `[module].controller.ts` 控制器文件
- **AND** 包含 `dto/` 子目录存放 DTO 类
- **AND** `dto/` 目录包含 `index.ts` barrel export

#### Scenario: 控制器依赖
- **GIVEN** interfaces 层的控制器
- **WHEN** 检查控制器代码
- **THEN** 控制器仅注入 modules 层的 Service
- **AND** 控制器不包含业务逻辑

### Requirement: modules 层 - 业务模块
The system SHALL 在 `modules/` 目录下放置业务 Service 层

#### Scenario: 模块结构
- **GIVEN** modules/[module]/ 目录
- **WHEN** 检查文件
- **THEN** 包含 `[module].module.ts` 模块定义
- **AND** 包含 `[module].service.ts` 服务定义
- **AND** 不包含控制器文件

#### Scenario: Agent 模块特殊结构
- **GIVEN** modules/agent/ 目录
- **WHEN** 检查文件
- **THEN** 包含 `graph/`、`memory/`、`nodes/`、`tools/`、`types/` 子目录
- **AND** 这些子目录保持原有结构不变

#### Scenario: MCP 模块特殊结构
- **GIVEN** modules/mcp/ 目录
- **WHEN** 检查文件
- **THEN** 保留 `mcp.guard.ts`、`mcp.types.ts`、`mcp-logger.service.ts`、`rate-limiter.service.ts`、`tools/`
- **AND** MCP 控制器移入 interfaces 层

### Requirement: jobs 层 - 定时任务和消费者
The system SHALL 在 `jobs/` 目录下集中管理所有定时任务和消息消费者

#### Scenario: 定时任务
- **GIVEN** jobs/ 目录
- **WHEN** 检查文件
- **THEN** 包含 `scheduler-tasks.service.ts`（从 scheduler 模块移入）

#### Scenario: 消息消费者
- **GIVEN** jobs/ 目录
- **WHEN** 检查文件
- **THEN** 包含从各业务模块移入的消费者文件：
  - `news-crawl.consumer.ts`
  - `news-vectorize.consumer.ts`
  - `signal-analyze.consumer.ts`
  - `kline-fetch.consumer.ts`
  - `stock-track-fetch.consumer.ts`

### Requirement: DTO 组织统一
The system SHALL 统一所有模块的 DTO 组织方式

#### Scenario: DTO 目录结构
- **GIVEN** 任何包含 DTO 的模块
- **WHEN** 检查 DTO 文件位置
- **THEN** DTO 文件位于 `dto/` 子目录中
- **AND** `dto/` 目录包含 `index.ts` barrel export
- **AND** 不存在 DTO 内联在 service 文件中的情况

### Requirement: Guard 使用统一
The system SHALL 统一 Guard 使用方式

#### Scenario: 全局 Guard + @Public()
- **GIVEN** 所有控制器
- **WHEN** 检查 Guard 使用
- **THEN** 依赖全局 `APP_GUARD`（JwtAuthGuard）进行认证
- **AND** 需要公开的路由使用 `@Public()` 装饰器
- **AND** 不存在仅在方法级别使用 `@UseGuards(JwtAuthGuard)` 的情况

### Requirement: 数据库访问模式统一
The system SHALL 统一数据库访问模式

#### Scenario: 统一使用 DbService
- **GIVEN** 所有业务 Service
- **WHEN** 检查数据库访问方式
- **THEN** 统一通过注入 `DbService` 访问数据库
- **AND** 不存在直接注入 `DRIZZLE_PROVIDER` 的情况

### Requirement: 导入路径更新
The system SHALL 更新所有文件的导入路径以匹配新目录结构

#### Scenario: 导入路径正确性
- **GIVEN** 重组后的代码
- **WHEN** 执行 `nest build`
- **THEN** 编译成功，无导入路径错误

## MODIFIED Requirements

### Requirement: app.module.ts 根模块
根模块的导入路径需要更新为新的目录结构，从各层目录导入模块

### Requirement: main.ts 入口文件
入口文件的导入路径需要更新为新的目录结构

## REMOVED Requirements

无删除的需求。此次变更仅为代码重组，不删除任何功能。
