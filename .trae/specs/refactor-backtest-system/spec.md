# 回测系统改造 Spec

## Why

当前回测系统基于信号置信度和方向手动配置参数，无法与策略管理模块联动。需要改造回测系统，使其基于策略执行回测，新增回测交易记录表存储详细交易数据，重构回测记录表以适配策略驱动的回测逻辑，并改造前端页面支持策略选择和交易记录查看。

## What Changes

- **BREAKING** 重构 `backtest_records` 表，新增策略关联、策略快照、收益统计增强（sharpeRatio、profitFactor、avgHoldingPeriod）、资金曲线、状态管理等字段，移除旧的置信度/方向/止损止盈配置字段
- 新增 `backtest_trades` 表，存储回测产生的每笔交易记录
- 改造后端 BacktestService，基于策略参数执行回测
- 改造后端 BacktestController，新增按回测记录查询交易明细接口
- 改造 DTO 以适配新的请求/响应结构
- 改造前端回测页面，新增回测表单（选择策略+时间范围），改造列表和详情展示

## Impact

- Affected specs: add-strategy-module（策略表已创建，回测依赖策略）
- Affected code:
  - `apps/backend/src/core/db/schema.ts` - 重构 backtestRecords，新增 backtestTrades
  - `apps/backend/src/modules/backtest/backtest.service.ts` - 改造回测逻辑
  - `apps/backend/src/modules/backtest/backtest.module.ts` - 新增 StrategyModule 依赖
  - `apps/backend/src/interfaces/admin/backtest/backtest.controller.ts` - 改造 API
  - `apps/backend/src/interfaces/admin/backtest/dto/backtest.dto.ts` - 改造 DTO
  - `apps/frontend/src/pages/backtest/index.tsx` - 改造页面
  - `apps/frontend/src/services/backtest.ts` - 改造 API 服务
  - `apps/frontend/src/services/types.ts` - 改造类型定义

## ADDED Requirements

### Requirement 1: backtest_trades 表

系统 SHALL 新增 `backtest_trades` 表，字段如下：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | UUID |
| backtestId | uuid | 关联回测记录 ID |
| strategyId | uuid | 关联策略 ID |
| signalId | uuid nullable | 关联信号 ID |
| eventId | uuid nullable | 关联事件 ID |
| symbol | varchar(20) | 标的代码 |
| stockName | varchar(100) nullable | 标的名称 |
| direction | varchar(10) | 方向：long / short |
| entryTime | timestamp | 入场时间 |
| entryPrice | decimal(18,4) | 入场价格 |
| exitTime | timestamp nullable | 出场时间 |
| exitPrice | decimal(18,4) nullable | 出场价格 |
| pnlPct | decimal(18,6) nullable | 收益率 |
| pnlAmount | decimal(18,2) nullable | 收益金额 |
| signalScore | decimal(10,4) nullable | 信号分数快照 |
| signalRuleId | varchar(100) nullable | 信号规则 ID 快照 |
| signalReason | text nullable | 信号原因快照 |
| exitReason | varchar(30) nullable | 出场原因：hold_period / stop_loss / take_profit |
| stopLossPrice | decimal(18,4) nullable | 止损命中价格 |
| takeProfitPrice | decimal(18,4) nullable | 止盈命中价格 |
| createdAt | timestamp | 创建时间 |

索引：backtestId、strategyId、direction、exitReason

### Requirement 2: 回测交易明细 API

系统 SHALL 提供按回测记录查询交易明细的 API：

#### Scenario 2.1: 查询交易明细
- **WHEN** GET /api/v1/backtest/records/:id/trades
- **THEN** 返回该回测记录下的所有交易明细列表

### Requirement 3: 基于策略的回测执行

系统 SHALL 支持基于策略的回测执行：

#### Scenario 3.1: 选择策略执行回测
- **WHEN** POST /api/v1/backtest 且传入 strategyId + startTime + endTime
- **THEN** 获取策略配置（包括信号筛选条件、入场/出场规则、交易控制参数）
- **AND** 保存策略快照到 strategySnapshot
- **AND** 基于策略的 directionMode 过滤信号方向
- **AND** 基于策略的 minScore/maxScore 过滤信号分数
- **AND** 基于策略的 allowedRuleIds/allowedCategories 过滤信号来源
- **AND** 基于策略的 holdPeriod 判断持仓到期出场
- **AND** 基于策略的 stopLossPct/takeProfitPct 判断止损/止盈出场
- **AND** 将每笔交易存入 backtest_trades 表
- **AND** 计算统计指标并保存到 backtest_records

#### Scenario 3.2: 出场原因逻辑
- **GIVEN** 一个持仓中的交易
- **WHEN** 判断出场条件
- **THEN** 优先检查止损（价格触发 stopLossPct）
- **AND** 其次检查止盈（价格触发 takeProfitPct）
- **AND** 最后检查持仓周期（holdPeriod 根 K 线到期）
- **AND** 记录 exitReason 为 hold_period / stop_loss / take_profit

### Requirement 4: 前端回测页面改造

系统 SHALL 改造回测页面：

#### Scenario 4.1: 回测表单
- **WHEN** 用户点击「新建回测」按钮
- **THEN** 弹出回测表单弹窗
- **AND** 表单包含：策略选择（下拉选择已有策略）、时间范围（DatePicker 范围选择）
- **AND** 点击确定后调用回测 API 执行回测

#### Scenario 4.2: 回测记录列表
- **WHEN** 用户查看回测记录列表
- **THEN** 显示列包括：策略名称、回测区间、信号总数/过滤后、交易次数、胜率、总收益率、最大回撤、夏普比率、状态、创建时间、操作

#### Scenario 4.3: 回测详情
- **WHEN** 用户点击「查看详情」
- **THEN** 显示回测概要（策略信息、回测参数、收益统计）
- **AND** 显示交易明细表格（从 backtest_trades 查询）

## MODIFIED Requirements

### Requirement M1: backtest_records 表重构

**修改内容**: 将 backtest_records 表重构为策略驱动的回测记录表。

新增字段：
- name (varchar 200, nullable) - 回测名称
- description (text, nullable) - 描述
- strategyId (uuid, not null) - 策略关联
- strategySnapshot (jsonb, not null) - 策略快照
- period (varchar 20, not null, default '1d') - K线周期
- totalSignals (integer, not null) - 信号总数
- filteredSignals (integer, not null) - 过滤后信号数
- totalReturnPct (decimal 18,6, not null) - 总收益率（替代 totalReturn）
- avgReturnPct (decimal 18,6, not null) - 平均收益率（替代 avgReturn）
- maxDrawdownPct (decimal 18,6, not null) - 最大回撤率（替代 maxDrawdown）
- winRate (decimal 18,6, not null) - 胜率（精度从 18,4 改为 18,6）
- sharpeRatio (decimal 18,6, nullable) - 夏普比率
- profitFactor (decimal 18,6, nullable) - 盈亏比
- avgHoldingPeriod (decimal 18,2, nullable) - 平均持仓周期
- equityCurve (jsonb, not null) - 资金曲线
- status (varchar 20, not null, default 'completed') - 状态
- errorMessage (text, nullable) - 错误信息

新增索引：strategyId、startTime、endTime

移除字段：minConfidence、maxConfidence、directions、stopLoss、takeProfit、trades（交易明细移至 backtest_trades 表）

### Requirement M2: 回测 API 改造

**修改内容**:
- POST /backtest 请求体从手动配置参数改为 strategyId + startTime + endTime
- 回测响应从内嵌 trades 改为引用 backtest_trades 表
- GET /backtest/records/:id 新增关联交易明细查询

## REMOVED Requirements

无
