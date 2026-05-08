# 策略管理模块 Spec

## Why

当前系统缺少交易策略管理能力。用户无法定义如何筛选信号、何时入场、何时出场、以及如何控制交易频率和仓位。需要引入策略（Strategy）概念，让用户可以配置完整的交易策略参数，为后续自动化交易执行提供基础。

## What Changes

- 新增 `strategies` 数据库表，存储交易策略配置
- 新增 StrategyModule 后端模块（Service + Controller + DTOs）
- 新增策略管理前端页面（列表 + 创建/编辑弹窗）
- 新增策略管理菜单项和路由
- 修改 seed 文件，写入初始策略数据（幂等处理）

## Impact

- Affected specs: 无直接依赖
- Affected code:
  - `apps/backend/src/core/db/schema.ts` - 新增 strategies 表
  - `apps/backend/src/modules/strategy/strategy.module.ts` - 策略模块
  - `apps/backend/src/modules/strategy/strategy.service.ts` - 策略服务
  - `apps/backend/src/interfaces/admin/strategy/strategy.controller.ts` - 策略 API
  - `apps/backend/src/interfaces/admin/strategy/dto/` - DTO 文件
  - `apps/backend/src/app.module.ts` - 注册模块和控制器
  - `apps/backend/scripts/seed.ts` - 初始策略数据
  - `apps/frontend/src/services/strategy.ts` - 策略 API 服务
  - `apps/frontend/src/services/types.ts` - 策略相关类型
  - `apps/frontend/src/pages/strategy/index.tsx` - 策略管理页面
  - `apps/frontend/src/layouts/MainLayout.tsx` - 新增菜单
  - `apps/frontend/.umirc.ts` - 新增路由

## ADDED Requirements

### Requirement 1: 策略表

系统 SHALL 新增 `strategies` 表，字段如下：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | UUID |
| name | varchar(100) | 策略名称 |
| description | text nullable | 策略描述 |
| enabled | boolean | 是否启用，默认 true |
| minScore | decimal(5,4) | 最低分数阈值 |
| maxScore | decimal(5,4) nullable | 最高分数阈值 |
| allowedRuleIds | jsonb nullable | 允许的规则 ID 列表，$type<string[]> |
| allowedCategories | jsonb nullable | 允许的事件类别列表，$type<string[]> |
| directionMode | varchar(20) | 方向模式：long_only / short_only / both |
| entryMode | varchar(20) | 入场模式：next_open，默认 next_open |
| holdPeriod | integer | 持仓周期（K 线根数） |
| stopLossPct | decimal(5,4) nullable | 止损百分比 |
| takeProfitPct | decimal(5,4) nullable | 止盈百分比 |
| maxSignalsPerDay | integer nullable | 每日最大信号数 |
| maxPositions | integer nullable | 最大持仓数 |
| createdAt | timestamp | 创建时间 |
| updatedAt | timestamp | 更新时间 |

索引：enabled、directionMode、createdAt
唯一约束：(name)

### Requirement 2: 策略管理 API

系统 SHALL 提供策略管理 REST API：

#### Scenario 2.1: 策略列表
- **WHEN** GET /api/v1/strategies
- **THEN** 返回策略列表，支持分页
- **AND** 支持按 enabled、directionMode 筛选

#### Scenario 2.2: 策略详情
- **WHEN** GET /api/v1/strategies/:id
- **THEN** 返回策略完整信息

#### Scenario 2.3: 创建策略
- **WHEN** POST /api/v1/strategies
- **THEN** 创建新策略
- **AND** name 必须唯一
- **AND** name、minScore、directionMode、holdPeriod 为必填

#### Scenario 2.4: 更新策略
- **WHEN** PUT /api/v1/strategies/:id
- **THEN** 更新策略信息
- **AND** 只更新传入的字段

### Requirement 3: 策略管理前端页面

系统 SHALL 提供策略管理前端页面：

#### Scenario 3.1: 策略列表页
- **WHEN** 用户点击「策略管理」菜单
- **THEN** 进入策略管理页 /strategies
- **AND** 显示策略列表表格，列包括：名称、启用状态（Switch）、方向模式、最低分数、持仓周期、止损/止盈、每日信号上限、最大持仓、操作
- **AND** 支持启用/禁用策略（Switch 直接切换）
- **AND** 支持分页

#### Scenario 3.2: 创建策略
- **WHEN** 用户点击「添加策略」按钮
- **THEN** 弹出创建策略弹窗
- **AND** 表单分为四个区域：基本信息、信号筛选、入场/出场、交易控制
- **AND** 必填字段：名称、最低分数、方向模式、持仓周期
- **AND** 创建成功后刷新列表

#### Scenario 3.3: 编辑策略
- **WHEN** 用户点击某策略的「编辑」按钮
- **THEN** 弹出编辑策略弹窗，预填当前值
- **AND** 编辑成功后刷新列表

#### Scenario 3.4: 策略菜单
- **WHEN** 用户查看左侧菜单
- **THEN** 在「分析中心」分组下可见「策略管理」菜单项
- **AND** 图标使用 FundOutlined

### Requirement 4: 初始策略数据

系统 SHALL 在 seed 文件中写入初始策略（幂等处理）：

| name | enabled | minScore | directionMode | holdPeriod | stopLossPct | takeProfitPct | maxSignalsPerDay | maxPositions | description |
|------|---------|----------|---------------|------------|-------------|---------------|-----------------|-------------|-------------|
| 保守多头 | true | 0.3 | long_only | 5 | 0.03 | 0.05 | 3 | 5 | 低风险多头策略，仅接受高分信号 |
| 激进双向 | true | 0.15 | both | 3 | 0.05 | 0.08 | 5 | 10 | 高频双向交易策略，接受更多信号 |
| 空头对冲 | false | 0.25 | short_only | 4 | 0.04 | 0.06 | 2 | 3 | 空头对冲策略，默认禁用 |

## MODIFIED Requirements

无

## REMOVED Requirements

无
