# 运行管理页面与模拟交易完善 Spec

## Why
当前策略只有 enabled 总开关和 webhookId 绑定，无法细粒度控制策略的输出行为（webhook 通知、模拟交易触发、实盘触发）。同时，策略触发的模拟交易没有记录来源，无法追溯是哪个策略触发的交易。资金曲线图表当前始终展示直线（因为 recordEquityCurve 在交易时记录，此时 totalEquity 始终等于初始资金），需要修复。webhookId 等运行时配置应从 strategies 表拆分到独立的 strategies_runtime 表，保持策略表职责单一。

## What Changes
- 新建 `strategies_runtime` 表，包含 strategyId（FK）、webhookId、enableWebhook、enableSimulation、enableLiveTrading 字段
- strategies 表移除 webhookId 字段（迁移至 strategies_runtime）
- simulation_positions 和 simulation_trades 表新增 `strategyId`（uuid）字段，记录策略触发的交易来源
- 后端 `NotificationsService.notifySignalAnalyzed` 增加对 `enableWebhook` 的检查，查询策略时 join strategies_runtime
- 后端信号处理流程中新增策略触发模拟交易逻辑（当策略 enableSimulation=true 且信号匹配时自动执行模拟交易）
- 新增前端「运行管理」页面，展示已启用策略列表及开关控制
- 修复资金曲线：refreshPositionPrices 后调用 recordEquityCurve，让价格变动产生有意义的曲线数据点
- seed 文件同步更新

## Impact
- Affected specs: 策略管理、模拟交易、信号通知流程
- Affected code:
  - `apps/backend/src/core/db/schema.ts` - 新建 strategies_runtime 表、strategies 移除 webhookId、simulation 表新增 strategyId
  - `apps/backend/src/modules/strategy/strategy.service.ts` - 查询方法适配 strategies_runtime，新增 runtime CRUD
  - `apps/backend/src/modules/notifications/notifications.service.ts` - 增加 enableWebhook 检查、enableSimulation 触发
  - `apps/backend/src/modules/signal-generator/signal-generator.service.ts` - 无变更（通知逻辑在 notifications 层）
  - `apps/backend/src/modules/simulation/simulation.service.ts` - executeTrade 支持 tradeSource='strategy' + strategyId、修复资金曲线
  - `apps/backend/src/interfaces/admin/strategy/dto/` - DTO 适配
  - `apps/backend/src/interfaces/admin/simulation/dto/` - DTO 增加 strategyId
  - `apps/frontend/src/pages/runtime/index.tsx` - 新建运行管理页面
  - `apps/frontend/.umirc.ts` - 新增路由
  - `apps/frontend/src/layouts/MainLayout.tsx` - 新增菜单项
  - `apps/backend/scripts/seed.ts` - 更新策略种子数据 + strategies_runtime 数据

## ADDED Requirements

### Requirement: strategies_runtime 运行时配置表
新建 `strategies_runtime` 表，将策略的运行时控制信息从 strategies 表拆分出来，保持 strategies 表只包含策略定义相关的字段。

#### Scenario: strategies_runtime 表结构
- **GIVEN** strategies_runtime 表包含以下字段：
  - `id` (uuid, PK)
  - `strategyId` (uuid, FK → strategies.id, unique)
  - `webhookId` (uuid, nullable, FK → webhooks.id) — 原 strategies.webhookId 迁移至此
  - `enableWebhook` (boolean, default true) — 是否发送 webhook 通知
  - `enableSimulation` (boolean, default false) — 是否触发模拟交易
  - `enableLiveTrading` (boolean, default false) — 是否触发实盘交易（暂不实现逻辑）
  - `createdAt` / `updatedAt` (timestamp)
- **THEN** 每个策略最多对应一条 runtime 记录（1:1 关系）

#### Scenario: 创建策略时自动创建 runtime 记录
- **WHEN** 创建新策略
- **THEN** 自动创建对应的 strategies_runtime 记录，enableWebhook 默认 true，enableSimulation 默认 false，enableLiveTrading 默认 false

#### Scenario: 已有策略的 runtime 记录兼容
- **WHEN** 查询策略的 runtime 信息但不存在 runtime 记录
- **THEN** 视为默认值：enableWebhook=true, enableSimulation=false, enableLiveTrading=false, webhookId=null

### Requirement: Webhook 通知受 enableWebhook 控制
`NotificationsService.notifySignalAnalyzed` SHALL 在匹配策略后，查询该策略的 runtime 配置，检查 `enableWebhook` 字段。只有 `enableWebhook=true` 时才发送 webhook 通知。

#### Scenario: 策略 enableWebhook=false 时不发送通知
- **WHEN** 信号匹配策略但该策略 runtime 的 `enableWebhook=false`
- **THEN** 不发送 webhook 通知

#### Scenario: 策略 enableWebhook=true 时正常发送通知
- **WHEN** 信号匹配策略且该策略 runtime 的 `enableWebhook=true`
- **THEN** 正常发送 webhook 通知（与现有逻辑一致）

### Requirement: 策略触发模拟交易
当信号匹配策略且该策略 runtime 的 `enableSimulation=true` 时，系统 SHALL 自动执行模拟交易（买入操作），交易记录中需标记 `tradeSource='strategy'` 并记录 `strategyId`。

#### Scenario: 策略触发模拟交易
- **WHEN** 信号匹配策略且 `enableSimulation=true`，信号方向为 long
- **THEN** 在管理员的模拟账户中自动执行买入交易，`tradeSource='strategy'`，`strategyId` 为该策略 ID，使用策略的 `stopLossPct`/`takeProfitPct` 计算止盈止损价

#### Scenario: 策略方向为 short 时不触发模拟买入
- **WHEN** 信号匹配策略且 `enableSimulation=true`，信号方向为 short
- **THEN** 不执行模拟交易（当前模拟交易仅支持买入开仓，暂不实现做空）

#### Scenario: 策略方向为 hold 时不触发模拟交易
- **WHEN** 信号匹配策略且 `enableSimulation=true`，信号方向为 hold
- **THEN** 不执行模拟交易

#### Scenario: 策略 enableSimulation=false 时不触发
- **WHEN** 信号匹配策略但 `enableSimulation=false`
- **THEN** 不执行模拟交易

### Requirement: 模拟交易记录来源策略
simulation_positions 和 simulation_trades 表 SHALL 新增 `strategyId`（uuid, nullable）字段，用于记录策略触发的交易来源。

#### Scenario: 手动交易
- **WHEN** 用户手动执行交易
- **THEN** `strategyId` 为 null，`tradeSource` 为 'manual'

#### Scenario: 策略触发交易
- **WHEN** 策略触发模拟交易
- **THEN** `strategyId` 为该策略的 ID，`tradeSource` 为 'strategy'

### Requirement: 运行管理页面
新增「运行管理」页面，路径 `/runtime`，展示所有 `enabled=true` 的策略列表，每个策略显示运行时配置（webhook 绑定、三个开关），支持实时切换。

#### Scenario: 查看运行管理页面
- **WHEN** 用户访问 /runtime
- **THEN** 展示所有已启用策略的列表，包含策略名称、方向模式、绑定 Webhook、三个开关控制

#### Scenario: 切换策略开关
- **WHEN** 用户切换某个策略的 webhook/模拟交易/实盘交易开关
- **THEN** 调用策略 runtime 更新 API，即时生效，并显示操作成功提示

#### Scenario: 实盘交易开关仅展示
- **WHEN** 用户查看实盘交易开关
- **THEN** 开关显示为禁用状态，带 Tooltip 提示"暂未开放"

#### Scenario: 修改 Webhook 绑定
- **WHEN** 用户在运行管理页面修改策略的 Webhook 绑定
- **THEN** 更新 strategies_runtime 的 webhookId

### Requirement: 修复资金曲线展示
资金曲线图表 SHALL 正确展示总权益随时间变化的折线图。当前问题是 recordEquityCurve 在 executeTrade 时调用，此时 currentPrice=avgCost，市值=成本，totalEquity 始终等于初始资金，导致曲线为直线。

#### Scenario: 刷新行情时记录资金曲线数据点
- **WHEN** 用户点击「更新行情」或后端自动刷新持仓价格
- **THEN** 在 refreshPositionPrices 完成后调用 recordEquityCurve，此时 currentPrice 已更新为实际市场价格，totalEquity 会随市值变动而变动

#### Scenario: 交易执行后也记录资金曲线
- **WHEN** 交易执行完成
- **THEN** 仍调用 recordEquityCurve（保持现有逻辑），此时数据点反映交易后的即时状态

#### Scenario: 有数据时正确展示资金曲线
- **WHEN** 用户切换到资金曲线 Tab，且存在多条记录（包含行情刷新后的数据点）
- **THEN** 正确展示总权益随时间变化的折线图，非直线

## MODIFIED Requirements

### Requirement: 通知流程适配 strategies_runtime
原 `findEnabledWithWebhook` 方法改为查询所有 enabled=true 的策略并 left join strategies_runtime，通知流程在匹配策略后额外检查 runtime 的 enableWebhook。webhook URL 从 runtime.webhookId → webhooks 获取。

### Requirement: 策略 CRUD 适配 runtime 拆分
创建策略时同时创建 strategies_runtime 记录。更新策略时，runtime 相关字段（webhookId、enableWebhook、enableSimulation、enableLiveTrading）通过单独的 runtime API 或合并到策略更新 API 中处理。策略列表查询需 left join runtime 信息。

### Requirement: 模拟交易执行适配策略来源
`SimulationService.executeTrade` 的 `TradeDto` 新增 `strategyId` 可选字段，当 `tradeSource='strategy'` 时需同时保存 `strategyId`。

### Requirement: seed 文件更新
策略种子数据需包含 strategies_runtime 对应记录，含 webhookId、enableWebhook、enableSimulation、enableLiveTrading 字段。

## REMOVED Requirements

### Requirement: strategies.webhookId 字段
**Reason**: webhookId 属于运行时配置，迁移到 strategies_runtime 表
**Migration**: 数据迁移时将 strategies.webhookId 的值写入 strategies_runtime.webhookId，然后 strategies 表的 webhookId 列保留（不删除，遵循规则），但不再使用
