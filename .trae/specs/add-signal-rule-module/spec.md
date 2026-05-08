# 信号生成规则模块 Spec

## Why

当前系统事件生成后没有基于规则生成信号的逻辑。需要引入信号生成规则，让不同类型的事件有不同的信号生成参数（系数、阈值），实现可配置的信号生成策略。同时重构信号表结构，使其更符合量化交易的需求。

## What Changes

- 新增 `signal_rules` 数据库表，存储信号生成规则（全局规则 + 特定规则）
- **BREAKING** 重构 `signals` 表结构，改为新的 schema
- 新增 SignalRuleModule 后端模块（Service + Controller）
- 新增信号生成服务，基于规则从事件生成信号
- 新增信号规则管理前端页面
- 新增信号规则管理菜单项
- 修改 seed 文件，写入初始规则（幂等处理）

## Impact

- Affected specs: add-event-module（信号生成流程变更）
- Affected code:
  - `apps/backend/src/core/db/schema.ts` - 新增 signal_rules 表，重构 signals 表
  - `apps/backend/src/modules/signal-rule/signal-rule.service.ts` - 信号规则服务
  - `apps/backend/src/modules/signal-rule/signal-rule.module.ts` - 信号规则模块
  - `apps/backend/src/modules/signal-generator/signal-generator.service.ts` - 信号生成服务
  - `apps/backend/src/interfaces/admin/signal-rules/signal-rules.controller.ts` - 信号规则 API
  - `apps/backend/src/jobs/event-analyze.consumer.ts` - 事件生成后触发信号生成
  - `apps/backend/scripts/seed.ts` - 初始规则数据
  - `apps/frontend/src/pages/signal-rules/index.tsx` - 信号规则页面
  - `apps/frontend/src/layouts/MainLayout.tsx` - 新增菜单
  - `apps/frontend/.umirc.ts` - 新增路由

## ADDED Requirements

### Requirement 1: 信号规则表

系统 SHALL 新增 `signal_rules` 表，字段如下：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | UUID |
| name | varchar(100) | 规则名称，如 m_a_v1、global_default |
| type | varchar(20) | 规则类型：global / specific |
| eventType | varchar(50) nullable | 事件类型（type=specific 时必填，type=global 时为 null） |
| enabled | boolean | 是否启用，默认 true |
| multiplier | decimal(5,4) | 系数，默认 1.0 |
| threshold | decimal(5,4) | 阈值，默认 0.2 |
| enableSurprise | boolean | 是否启用 surprise，默认 true（仅 global 类型使用） |
| enableConfidence | boolean | 是否启用 confidence，默认 true（仅 global 类型使用） |
| description | text nullable | 规则描述 |
| createdAt | timestamp | 创建时间 |
| updatedAt | timestamp | 更新时间 |

索引：type、eventType、enabled
唯一约束：(name)

规则类型说明：
- **global**: 全局规则，type='global'，eventType=null，只有一条记录
- **specific**: 特定规则，type='specific'，eventType=事件类型（category 或 subcategory）

全局公式（只读）：`score = importance × (direction × confidence) × (1 + surprise)`
最终分数计算：`final_score = global_score × multiplier`

### Requirement 2: 重构信号表

系统 SHALL 重构 `signals` 表，新字段如下：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | UUID |
| eventId | uuid | 来源事件（必须有），外键关联 events |
| symbol | varchar(20) | 标的（从 subjects 拆出来） |
| action | varchar(10) | long / short / hold，来自事件的 direction |
| score | decimal(5,4) | -1 ~ 1，统一连续值，核心字段 |
| generatedAt | timestamp | 信号生成时间（必须 >= detected_at） |
| validFrom | timestamp | 开始生效时间（用于回测） |
| validTo | timestamp nullable | 可选（一般不用） |
| reason | text nullable | 简短说明 |
| ruleId | uuid | 关联规则 ID |
| ruleSnapshot | jsonb | 规则快照（记录生成时的规则参数） |
| weight | decimal(5,4) nullable | 权重 |
| createdAt | timestamp | 创建时间 |
| updatedAt | timestamp | 更新时间 |

索引：eventId、symbol、action、score、generatedAt、validFrom、ruleId

### Requirement 3: 信号规则管理 API

系统 SHALL 提供信号规则管理 REST API：

#### Scenario 3.1: 规则列表
- **WHEN** GET /api/v1/signal-rules
- **THEN** 返回规则列表，支持分页
- **AND** 支持按 type、eventType、enabled 筛选

#### Scenario 3.2: 规则详情
- **WHEN** GET /api/v1/signal-rules/:id
- **THEN** 返回规则完整信息

#### Scenario 3.3: 创建规则
- **WHEN** POST /api/v1/signal-rules
- **THEN** 创建新规则
- **AND** name 必须唯一

#### Scenario 3.4: 更新规则
- **WHEN** PUT /api/v1/signal-rules/:id
- **THEN** 更新规则信息

#### Scenario 3.5: 全局规则
- **WHEN** GET /api/v1/signal-rules/global
- **THEN** 返回全局规则（type='global' 的唯一记录）

#### Scenario 3.6: 更新全局规则
- **WHEN** PUT /api/v1/signal-rules/global
- **THEN** 更新全局规则

### Requirement 4: 信号生成逻辑

系统 SHALL 基于规则从事件生成信号：

#### Scenario 4.1: 事件触发信号生成
- **GIVEN** 一个事件已创建且 processed = false
- **WHEN** 信号引擎处理该事件
- **THEN** 获取全局规则（type='global'）
- **AND** 计算全局分数：`global_score = importance × (direction × confidence) × (1 + surprise)`
  - 如果 enableSurprise=false，则 `(1 + surprise)` 部分恒为 1
  - 如果 enableConfidence=false，则 confidence 恒为 1
- **AND** 查找匹配的特定规则（先按 subcategory 匹配，再按 category 匹配）
- **AND** 计算最终分数：`final_score = global_score × multiplier`
- **AND** 如果 final_score >= threshold，生成信号
- **AND** 为每个 stock 类型的 subject 生成一个信号

#### Scenario 4.2: 规则匹配优先级
- **GIVEN** 事件有 category 和 subcategory
- **WHEN** 查找匹配规则
- **THEN** 优先匹配 eventType = subcategory 的规则
- **AND** 如果没有匹配，再匹配 eventType = category 的规则
- **AND** 如果都没有匹配，使用全局规则的 multiplier=1.0, threshold=全局阈值

#### Scenario 4.3: 规则快照
- **GIVEN** 信号由规则生成
- **THEN** ruleSnapshot 记录生成时的规则参数（multiplier、threshold、enableSurprise、enableConfidence）
- **AND** 即使后续规则修改，历史信号不受影响

### Requirement 5: 信号规则管理前端页面

系统 SHALL 提供信号规则管理前端页面：

#### Scenario 5.1: 规则管理页面
- **WHEN** 用户点击「信号规则」菜单
- **THEN** 进入规则管理页 /signal-rules
- **AND** 顶部显示全局规则区（全局公式只读、阈值、系数、启用 surprise/confidence 开关）
- **AND** 下方显示特定规则表格（事件类型、规则名称、启用状态、系数、阈值、操作）
- **AND** 支持新增、编辑、启用/禁用规则

#### Scenario 5.2: 全局规则编辑
- **WHEN** 用户修改全局规则
- **THEN** 保存后立即生效
- **AND** 不影响已生成的信号

#### Scenario 5.3: 规则菜单
- **WHEN** 用户查看左侧菜单
- **THEN** 在「分析中心」分组下可见「信号规则」菜单项
- **AND** 图标使用 SettingOutlined

### Requirement 6: 初始规则数据

系统 SHALL 在 seed 文件中写入初始规则（幂等处理）：

**全局规则**（type='global'）：
| name | type | multiplier | threshold | enableSurprise | enableConfidence |
|------|------|------------|-----------|----------------|------------------|
| global_default | global | 1.0 | 0.2 | true | true |

**特定规则**（type='specific'）：
| name | eventType | enabled | multiplier | threshold |
|------|-----------|---------|------------|-----------|
| m_a_v1 | m_a | true | 0.8 | 0.2 |
| earnings_forecast_v1 | earnings_forecast | true | 1.2 | 0.4 |
| earnings_actual_v1 | earnings_actual | true | 1.2 | 0.4 |
| policy_v1 | policy | false | 1.0 | 0.3 |
| macro_v1 | macro | true | 1.5 | 0.15 |

## MODIFIED Requirements

### Requirement M1: 事件分析消费者改造

**修改内容**: EventAnalyzeConsumer 在保存事件后，调用 SignalGeneratorService 基于规则生成信号。

### Requirement M2: 信号服务改造

**修改内容**: SignalsService 适配新的 signals 表结构，移除旧的字段（stockCode、stockName、direction、confidence、sentiment、reasoning、keyFactors、timeWindow、signalTime、newsId）。

## REMOVED Requirements

无
