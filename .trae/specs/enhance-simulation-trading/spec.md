# 完善模拟交易系统 Spec

## Why
当前模拟交易系统交互体验较差（手动输入股票代码和名称），价格不实时（用户手动输入价格），缺少实时盈亏展示、资金曲线和止盈止损功能。需要完善这些核心能力，使模拟交易系统更加实用，同时为后续交易 Agent 预留扩展字段。

## What Changes
- 添加持仓弹窗和模拟交易弹窗的股票选择交互改为搜索选择模式（参考新增追踪弹窗）
- 买入和卖出使用实时 4h K 线价格，复用现有 K 线检查更新逻辑
- 每次进入页面批量刷新持仓实时价格并展示实时盈亏
- 新增资金曲线图表展示
- 开仓支持设置止盈止损价格，交易记录体现平仓理由
- 数据库新增止盈止损、平仓理由、交易来源等字段
- 新增资金曲线记录表

## Impact
- Affected code:
  - 前端: `apps/frontend/src/pages/simulation/index.tsx`
  - 后端 Controller: `apps/backend/src/interfaces/admin/simulation/simulation.controller.ts`
  - 后端 DTO: `apps/backend/src/interfaces/admin/simulation/dto/simulation.dto.ts`
  - 后端 Service: `apps/backend/src/modules/simulation/simulation.service.ts`
  - 后端 Module: `apps/backend/src/modules/simulation/simulation.module.ts`
  - 数据库 Schema: `apps/backend/src/core/db/schema.ts`
- Affected dependencies: KlinesService（复用 K 线检查更新逻辑）

## ADDED Requirements

### Requirement: 股票搜索选择交互
系统 SHALL 在添加持仓弹窗和模拟交易弹窗中提供股票搜索选择功能，替代手动输入股票代码和名称。

#### Scenario: 搜索并选择股票
- **WHEN** 用户在弹窗的股票代码输入框中输入关键词
- **THEN** 系统调用 `/stock/search?keyword=xxx` 接口搜索股票（300ms 防抖），展示搜索结果列表
- **AND** 用户选择某只股票后，自动填充 stockCode 和 stockName 字段，stockName 字段不可编辑

### Requirement: 实时价格交易
系统 SHALL 在执行买入和卖出交易时使用最新的 4h K 线收盘价作为实时价格。

#### Scenario: 买入使用实时价格
- **WHEN** 用户提交买入交易
- **THEN** 系统先调用 KlinesService.checkAndUpdateKlines(stockCode, '4h') 更新 K 线数据
- **AND** 取最新一条 4h K 线的 close 价格作为成交价格
- **AND** 前端弹窗中价格字段为只读，自动显示实时价格

#### Scenario: 卖出使用实时价格
- **WHEN** 用户提交卖出交易
- **THEN** 系统先调用 KlinesService.checkAndUpdateKlines(stockCode, '4h') 更新 K 线数据
- **AND** 取最新一条 4h K 线的 close 价格作为成交价格
- **AND** 前端弹窗中价格字段为只读，自动显示实时价格

#### Scenario: 选择股票后自动获取实时价格
- **WHEN** 用户在交易弹窗中选择一只股票
- **THEN** 前端调用 K 线检查更新接口并获取最新 4h 价格，自动填入价格字段

### Requirement: 实时盈亏展示
系统 SHALL 在用户进入模拟交易页面时批量刷新所有持仓的实时价格并计算盈亏。

#### Scenario: 页面加载时刷新实时盈亏
- **WHEN** 用户进入模拟交易页面
- **THEN** 系统批量调用 K 线检查更新接口更新所有持仓股票的 4h K 线数据
- **AND** 取每只持仓股票最新 4h K 线的 close 价格更新 currentPrice、marketValue、profit、return
- **AND** 重新计算账户的 currentCapital（availableCash + 所有持仓市值）、totalProfit、totalReturn
- **AND** 页面展示更新后的实时盈亏数据

### Requirement: 资金曲线展示
系统 SHALL 提供资金曲线图表，展示账户总权益随时间的变化趋势。

#### Scenario: 查看资金曲线
- **WHEN** 用户在模拟交易页面查看资金曲线 Tab
- **THEN** 系统展示折线图，X 轴为时间，Y 轴为总权益（可用现金 + 持仓市值）
- **AND** 图表数据来源于 simulation_equity_curve 表

#### Scenario: 交易后记录资金曲线数据点
- **WHEN** 用户执行一笔交易（买入或卖出）
- **THEN** 系统在交易完成后自动记录一条资金曲线数据点，包含总权益、可用现金、持仓市值、盈亏等信息

### Requirement: 止盈止损
系统 SHALL 支持在开仓（买入）时设置止盈价格和止损价格。

#### Scenario: 开仓设置止盈止损
- **WHEN** 用户在交易弹窗中选择买入
- **THEN** 弹窗中显示可选的止盈价格和止损价格输入框
- **AND** 止盈止损为非必填字段
- **AND** 设置的止盈止损价格保存到持仓记录中

#### Scenario: 触发止盈止损自动平仓
- **WHEN** 系统刷新持仓实时价格时发现某持仓的当前价格 >= 止盈价格 或 当前价格 <= 止损价格
- **THEN** 系统自动以当前价格执行卖出平仓
- **AND** 交易记录中 closeReason 记录为 'take_profit' 或 'stop_loss'

### Requirement: 平仓理由记录
系统 SHALL 在交易记录中体现平仓理由。

#### Scenario: 手动卖出记录平仓理由
- **WHEN** 用户手动执行卖出交易
- **THEN** 交易记录的 closeReason 记录为 'manual'

#### Scenario: 交易记录展示平仓理由
- **WHEN** 用户查看交易记录列表
- **THEN** 卖出类型的交易记录显示平仓理由列（手动平仓/止盈平仓/止损平仓/Agent 平仓）

### Requirement: 交易来源预留字段
系统 SHALL 在交易记录和持仓中预留交易来源字段，为后续交易 Agent 和系统自动交易做准备。

#### Scenario: 交易记录包含交易来源
- **WHEN** 创建交易记录时
- **THEN** 交易记录包含 tradeSource 字段，当前默认值为 'manual'
- **AND** 预留可选值: 'manual'（手动）、'agent'（Agent 自动）、'system'（系统自动）

#### Scenario: 持仓包含交易来源
- **WHEN** 创建持仓记录时
- **THEN** 持仓记录包含 tradeSource 字段，当前默认值为 'manual'

## MODIFIED Requirements

### Requirement: 模拟交易弹窗交互
原有弹窗中股票代码和名称为手动输入，现改为搜索选择模式；价格字段从手动输入改为自动获取实时价格（只读）；买入时增加止盈止损可选字段。

### Requirement: 添加持仓弹窗交互
原有弹窗中股票代码和名称为手动输入，现改为搜索选择模式。

### Requirement: 持仓盈亏计算
原有持仓盈亏数据为静态值，现改为每次进入页面时基于最新 4h K 线价格动态计算。

## Database Schema Changes

### simulation_positions 表新增字段
| 字段 | 类型 | 说明 |
|------|------|------|
| takeProfitPrice | decimal(18,2) nullable | 止盈价格 |
| stopLossPrice | decimal(18,2) nullable | 止损价格 |
| tradeSource | varchar(20) nullable default 'manual' | 交易来源 |

### simulation_trades 表新增字段
| 字段 | 类型 | 说明 |
|------|------|------|
| closeReason | varchar(20) nullable | 平仓理由 (manual/take_profit/stop_loss/agent) |
| tradeSource | varchar(20) nullable default 'manual' | 交易来源 (manual/agent/system) |

### 新增表: simulation_equity_curve
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| accountId | uuid FK -> simulation_accounts.id | 账户 ID |
| totalEquity | decimal(18,2) | 总权益 |
| availableCash | decimal(18,2) | 可用现金 |
| positionValue | decimal(18,2) | 持仓总市值 |
| totalProfit | decimal(18,2) | 总盈亏 |
| totalReturn | decimal(18,4) | 总收益率 |
| recordedAt | timestamp | 记录时间 |
| createdAt | timestamp | 创建时间 |
