# 用户工作区资源隔离 Spec

## Why
当前系统中策略、Webhook 配置、回测记录等核心资源没有用户归属，所有用户共享同一份数据。模拟账户虽然已有 userId，但限制为每用户一个账户，且策略触发模拟交易时随机选择账户。需要将所有用户级资源归集到用户工作区中，实现多用户隔离，同时支持一个用户拥有多个模拟账户，不同策略通过 runtime 控制不同账户。

## What Changes
- `strategies` 表新增 `userId` 字段，策略按用户隔离
- `webhooks` 表新增 `userId` 字段，Webhook 配置按用户隔离
- `backtest_records` 表新增 `userId` 字段，回测记录按用户隔离
- `backtest_trades` 表新增 `userId` 字段，回测交易按用户隔离
- `simulation_accounts` 表新增 `name` 字段，支持多账户区分
- `strategies_runtime` 表新增 `accountId` 字段，指定策略控制的模拟账户
- `stock_trackings` 表新增 `userId` 字段，股票追踪按用户隔离
- `api_keys` 表新增 `userId` 字段，API Key 按用户隔离
- `strategies.name` 唯一约束从全局改为用户内唯一
- 移除 `simulation_accounts` 每用户单账户限制，支持多账户
- 策略触发模拟交易时使用 runtime 指定的 accountId
- 所有 Controller/Service 层查询增加 userId 过滤
- 前端模拟交易页面支持多账户切换
- 前端策略/运行管理/Webhook/回测等页面适配用户隔离
- seed 文件同步更新

## Impact
- Affected specs: 策略管理、运行管理、模拟交易、回测系统、通知设置
- Affected code:
  - `apps/backend/src/core/db/schema.ts` — 多表新增 userId、accountId、name 字段
  - `apps/backend/src/modules/strategy/strategy.service.ts` — 所有查询增加 userId 过滤
  - `apps/backend/src/modules/simulation/simulation.service.ts` — 多账户支持、executeStrategyTrade 使用 runtime.accountId
  - `apps/backend/src/modules/backtest/backtest.service.ts` — 查询增加 userId 过滤
  - `apps/backend/src/modules/notifications/webhooks.service.ts` — 查询增加 userId 过滤
  - `apps/backend/src/modules/notifications/notifications.service.ts` — notifySignalAnalyzed 适配用户隔离
  - `apps/backend/src/modules/stock-tracking/stock-tracking.service.ts` — 查询增加 userId 过滤
  - `apps/backend/src/modules/api-key/api-key.service.ts` — 查询增加 userId 过滤
  - `apps/backend/src/interfaces/admin/` 下所有相关 Controller — 传入 userId
  - `apps/frontend/src/pages/simulation/index.tsx` — 多账户切换
  - `apps/frontend/src/pages/strategy/index.tsx` — 适配用户隔离
  - `apps/frontend/src/pages/runtime/index.tsx` — 适配用户隔离 + 账户选择
  - `apps/frontend/src/pages/settings/notifications.tsx` — 适配用户隔离
  - `apps/frontend/src/pages/backtest/index.tsx` — 适配用户隔离
  - `apps/backend/scripts/seed.ts` — 更新种子数据

## ADDED Requirements

### Requirement: 策略按用户隔离
`strategies` 表 SHALL 新增 `userId`（uuid, nullable, FK → users.id）字段，策略按用户归属。不同用户的策略互不可见。

#### Scenario: 创建策略时绑定用户
- **WHEN** 用户创建策略
- **THEN** 策略的 userId 自动设置为当前登录用户 ID
- **AND** 策略列表只返回当前用户的策略

#### Scenario: 策略名称用户内唯一
- **WHEN** 用户创建名称为 "保守多头" 的策略
- **AND** 该用户已有同名策略
- **THEN** 创建失败，提示策略名称重复
- **AND** 其他用户的同名策略不影响当前用户

#### Scenario: 策略查询按用户过滤
- **WHEN** 查询策略列表
- **THEN** 只返回当前用户创建的策略
- **AND** 不返回其他用户的策略

### Requirement: Webhook 配置按用户隔离
`webhooks` 表 SHALL 新增 `userId`（uuid, nullable, FK → users.id）字段，Webhook 配置按用户归属。

#### Scenario: 创建 Webhook 时绑定用户
- **WHEN** 用户创建 Webhook
- **THEN** Webhook 的 userId 自动设置为当前登录用户 ID
- **AND** Webhook 列表只返回当前用户的 Webhook

#### Scenario: 策略绑定 Webhook 限于同用户
- **WHEN** 用户为策略绑定 Webhook
- **THEN** 只能绑定自己创建的 Webhook
- **AND** 绑定其他用户的 Webhook 时返回错误

### Requirement: 回测记录按用户隔离
`backtest_records` 表和 `backtest_trades` 表 SHALL 新增 `userId`（uuid, nullable, FK → users.id）字段，回测记录按用户归属。

#### Scenario: 创建回测时绑定用户
- **WHEN** 用户创建回测任务
- **THEN** 回测记录的 userId 自动设置为当前用户 ID
- **AND** 回测列表只返回当前用户的记录

#### Scenario: 回测关联策略限于同用户
- **WHEN** 用户基于策略创建回测
- **THEN** 只能使用自己创建的策略
- **AND** 使用其他用户的策略时返回错误

### Requirement: 股票追踪按用户隔离
`stock_trackings` 表 SHALL 新增 `userId`（uuid, nullable, FK → users.id）字段，股票追踪按用户归属。`stock_trackings` 的 `stockCode` 唯一约束改为 `(userId, stockCode)` 联合唯一。

#### Scenario: 添加追踪时绑定用户
- **WHEN** 用户添加股票追踪
- **THEN** 追踪记录的 userId 自动设置为当前用户 ID
- **AND** 追踪列表只返回当前用户的追踪

#### Scenario: 同一股票不同用户可独立追踪
- **WHEN** 用户 A 和用户 B 都追踪股票 "SH600519"
- **THEN** 两人各自有独立的追踪记录，互不影响

### Requirement: API Key 按用户隔离
`api_keys` 表 SHALL 新增 `userId`（uuid, nullable, FK → users.id）字段，API Key 按用户归属。

#### Scenario: 创建 API Key 时绑定用户
- **WHEN** 用户创建 API Key
- **THEN** API Key 的 userId 自动设置为当前用户 ID
- **AND** API Key 列表只返回当前用户的 Key

### Requirement: 多模拟账户支持
`simulation_accounts` 表 SHALL 新增 `name`（varchar(100), nullable）字段，用于区分同一用户的多个账户。移除每用户单账户限制，一个用户可以创建多个模拟账户。

#### Scenario: 创建多个模拟账户
- **WHEN** 用户创建模拟账户
- **THEN** 可以指定账户名称（如"保守账户"、"激进账户"）
- **AND** 同一用户可以创建多个账户
- **AND** 账户名称在同一用户内唯一

#### Scenario: 获取用户所有账户
- **WHEN** 用户查询模拟账户列表
- **THEN** 返回该用户的所有模拟账户
- **AND** 每个账户包含名称、资金、盈亏等信息

#### Scenario: 默认账户
- **WHEN** 用户首次访问模拟交易页面且无账户
- **THEN** 自动创建名为"默认账户"的模拟账户，初始资金 100000

### Requirement: Runtime 绑定模拟账户
`strategies_runtime` 表 SHALL 新增 `accountId`（uuid, nullable, FK → simulation_accounts.id）字段，指定该策略触发模拟交易时使用的账户。

#### Scenario: Runtime 指定账户
- **WHEN** 用户在运行管理页面为策略设置模拟交易账户
- **THEN** 该策略的 runtime 记录中 accountId 更新为指定账户
- **AND** 只能选择当前用户的模拟账户

#### Scenario: 策略触发模拟交易使用指定账户
- **WHEN** 信号匹配策略且 enableSimulation=true
- **AND** runtime 的 accountId 不为空
- **THEN** 在 accountId 指定的账户中执行模拟交易
- **AND** 如果该账户资金不足，跳过交易并记录日志

#### Scenario: Runtime 未指定账户
- **WHEN** 信号匹配策略且 enableSimulation=true
- **AND** runtime 的 accountId 为空
- **THEN** 使用该用户的第一个模拟账户执行交易（兼容旧数据）
- **AND** 记录警告日志建议用户设置指定账户

### Requirement: 通知流程适配用户隔离
`NotificationsService.notifySignalAnalyzed` SHALL 在匹配策略后，使用策略所属用户的 runtime 配置和模拟账户执行操作。

#### Scenario: 信号触发用户隔离的策略
- **WHEN** 信号被分析完成
- **THEN** 系统查询所有用户的已启用策略（带 runtime）
- **AND** 每个策略使用其所属用户的 Webhook 和模拟账户
- **AND** 不同用户的策略互不干扰

#### Scenario: 策略触发模拟交易使用对应用户账户
- **WHEN** 用户 A 的策略匹配信号且 enableSimulation=true
- **THEN** 在用户 A 的 runtime 指定账户中执行模拟交易
- **AND** 不影响用户 B 的账户

### Requirement: 前端模拟交易页面多账户支持
模拟交易页面 SHALL 支持多账户切换，用户可以在不同账户间切换查看持仓、交易记录和资金曲线。

#### Scenario: 账户切换
- **WHEN** 用户在模拟交易页面
- **THEN** 页面顶部显示账户选择下拉框
- **AND** 选择不同账户后，持仓、交易记录、资金曲线、统计数据随之切换

#### Scenario: 创建新账户
- **WHEN** 用户点击"创建账户"按钮
- **THEN** 弹出创建账户弹窗，输入账户名称和初始资金
- **AND** 创建成功后自动切换到新账户

#### Scenario: 单账户时简化展示
- **WHEN** 用户只有一个模拟账户
- **THEN** 不显示账户选择下拉框，直接展示该账户数据（保持当前体验）

### Requirement: 前端运行管理页面账户选择
运行管理页面 SHALL 在策略的模拟交易开关旁增加账户选择下拉框。

#### Scenario: 设置策略关联账户
- **WHEN** 用户在运行管理页面开启策略的模拟交易开关
- **THEN** 显示账户选择下拉框，列出当前用户的所有模拟账户
- **AND** 选择账户后，该策略触发的模拟交易将使用此账户

#### Scenario: 未选择账户时提示
- **WHEN** 用户开启模拟交易但未选择账户
- **THEN** 显示警告提示"请选择模拟账户"
- **AND** 策略触发交易时将使用默认账户

## MODIFIED Requirements

### Requirement: 策略管理 API 适配用户隔离
策略管理所有接口 SHALL 增加用户隔离。创建策略时自动绑定当前用户，查询时只返回当前用户的策略。策略名称唯一约束从全局改为用户内唯一。

### Requirement: 策略管理前端适配用户隔离
策略管理页面 SHALL 只展示当前用户的策略，创建/编辑操作自动关联当前用户。

### Requirement: Webhook 管理 API 适配用户隔离
Webhook 管理所有接口 SHALL 增加用户隔离。创建 Webhook 时自动绑定当前用户，查询时只返回当前用户的 Webhook。

### Requirement: Webhook 管理前端适配用户隔离
通知设置页面 SHALL 只展示当前用户的 Webhook。

### Requirement: 回测管理 API 适配用户隔离
回测管理所有接口 SHALL 增加用户隔离。创建回测时自动绑定当前用户，查询时只返回当前用户的记录。创建回测时只能选择自己的策略。

### Requirement: 回测管理前端适配用户隔离
回测页面 SHALL 只展示当前用户的回测记录，策略选择器只展示当前用户的策略。

### Requirement: 模拟交易 API 适配多账户
模拟交易 API SHALL 支持多账户操作。获取账户接口返回用户所有账户列表，交易和持仓操作需指定 accountId。

### Requirement: 运行管理 API 适配用户隔离
运行管理 API SHALL 只返回当前用户的策略和 runtime 配置。更新 runtime 时只能选择当前用户的 Webhook 和模拟账户。

### Requirement: seed 文件更新
seed 文件 SHALL 更新策略、Webhook、回测等种子数据，包含 userId 字段，关联到 admin 用户。

## REMOVED Requirements

### Requirement: 每用户单模拟账户限制
**Reason**: 支持多账户后，用户可以创建多个模拟账户
**Migration**: 现有单账户数据保持不变，userId 已有，新增 name 字段默认为"默认账户"

## Database Schema Changes

### strategies 表新增字段
| 字段 | 类型 | 说明 |
|------|------|------|
| userId | uuid nullable FK → users.id | 策略归属用户 |

索引变更：新增 `strategies_user_id_idx`，唯一约束从 `(name)` 改为 `(userId, name)`

### webhooks 表新增字段
| 字段 | 类型 | 说明 |
|------|------|------|
| userId | uuid nullable FK → users.id | Webhook 归属用户 |

索引变更：新增 `webhooks_user_id_idx`

### backtest_records 表新增字段
| 字段 | 类型 | 说明 |
|------|------|------|
| userId | uuid nullable FK → users.id | 回测归属用户 |

索引变更：新增 `backtest_records_user_id_idx`

### backtest_trades 表新增字段
| 字段 | 类型 | 说明 |
|------|------|------|
| userId | uuid nullable FK → users.id | 回测交易归属用户 |

索引变更：新增 `backtest_trades_user_id_idx`

### simulation_accounts 表新增字段
| 字段 | 类型 | 说明 |
|------|------|------|
| name | varchar(100) nullable | 账户名称 |

索引变更：新增 `(userId, name)` 联合唯一索引

### strategies_runtime 表新增字段
| 字段 | 类型 | 说明 |
|------|------|------|
| accountId | uuid nullable FK → simulation_accounts.id | 策略控制的模拟账户 |

索引变更：新增 `strategies_runtime_account_id_idx`

### stock_trackings 表新增字段
| 字段 | 类型 | 说明 |
|------|------|------|
| userId | uuid nullable FK → users.id | 追踪归属用户 |

索引变更：新增 `stock_trackings_user_id_idx`，唯一约束从 `(stockCode)` 改为 `(userId, stockCode)`

### api_keys 表新增字段
| 字段 | 类型 | 说明 |
|------|------|------|
| userId | uuid nullable FK → users.id | API Key 归属用户 |

索引变更：新增 `api_keys_user_id_idx`

## 不需要用户隔离的资源（保持全局共享）

以下资源为系统级数据，所有用户共享，不需要按用户隔离：

| 资源 | 原因 |
|------|------|
| news | 新闻数据为公共信息源，系统统一抓取 |
| events | 事件为新闻分析结果，系统统一生成 |
| signals | 信号为事件分析结果，系统统一生成 |
| signal_rules | 信号规则为系统级配置，影响信号生成流程，保持全局 |
| klines | K 线数据为公共行情数据 |
| stocks | 股票基础信息为公共数据 |
| stock_blacklist | 黑名单为系统级安全机制，全局生效 |
| scheduler_tasks | 定时任务为系统级配置 |
| chat_messages | 已有 userId，已按用户隔离 |
| mcp_logs | MCP 日志通过 apiKey 关联，保持现状 |
