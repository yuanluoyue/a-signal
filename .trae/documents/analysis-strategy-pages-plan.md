# 分析中心 - 策略总览与详情页开发计划

## 一、需求概述

### 1.1 策略总览页（`/analysis/strategies`）
展示每个策略的核心收益指标卡片/表格：
- 总收益（金额 + 收益率）
- 胜率
- 最大回撤
- 夏普比率
- 平均收益率
- 平均持仓时间

数据源：`simulation_trades` 表中 `strategyId` 不为 null 的交易记录，按策略聚合计算。

### 1.2 策略详情页（`/analysis/strategies/:id`）
展示单个策略的完整分析：
- 策略名称、状态、参数
- Runtime 配置（关联账户、Webhook、开关状态）
- 核心收益指标（同总览页的6个指标）
- 资金曲线图（基于该策略的累计盈亏绘制）
- 最近交易列表
- 最近持仓列表

## 二、数据计算逻辑

### 2.1 指标计算方法

所有指标基于 `simulation_trades` 中 `strategyId = 目标策略ID` 且 `type = 'sell'` 的记录（已平仓交易）：

| 指标 | 计算方法 |
|------|----------|
| **总收益** | `SUM(profit)`，总收益率 = 总收益 / 参与交易的总成本 |
| **胜率** | `COUNT(profit > 0) / COUNT(all sell trades)` |
| **最大回撤** | 从累计收益曲线中计算：max(peak - trough) / peak |
| **夏普比率** | `(平均收益率 - 无风险利率) / 收益率标准差`，年化 = × √252，无风险利率取0 |
| **平均收益率** | 每笔交易收益率（profit / totalAmount）的算术平均 |
| **平均持仓时间** | 需要配对 buy/sell 交易计算时间差，取平均值 |

### 2.2 资金曲线

按时间排序所有该策略的交易记录，计算累计盈亏：
- 每笔 buy 交易：累计成本 += totalAmount
- 每笔 sell 交易：累计收益 += profit，记录一个数据点 (tradeTime, cumulativeProfit)

### 2.3 交易配对逻辑

为了计算平均持仓时间，需要配对同一股票的 buy/sell 交易：
- 按 `stockCode` 分组，按 `tradeTime` 排序
- FIFO 配对：先买入的先与卖出配对
- 计算每对的时间差

## 三、后端设计

### 3.1 新增 Service 方法

在 `strategy.service.ts` 中新增分析相关方法：

```typescript
// 获取策略总览分析数据（当前用户所有策略）
async getStrategyAnalytics(userId: string): Promise<StrategyAnalytics[]>

// 获取单个策略详情分析数据
async getStrategyDetailAnalytics(strategyId: string, userId: string): Promise<StrategyDetailAnalytics>
```

### 3.2 新增 Controller 路由

在 `strategy.controller.ts` 中新增：

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/strategies/analytics` | 获取当前用户所有策略的分析数据 |
| GET | `/strategies/:id/analytics` | 获取单个策略的详细分析数据 |

### 3.3 返回数据结构

**StrategyAnalytics（总览项）**：
```typescript
{
  strategyId: string;
  strategyName: string;
  enabled: boolean;
  directionMode: string;
  totalTrades: number;          // 总交易次数（sell trades）
  totalProfit: number;          // 总收益金额
  totalReturn: number;          // 总收益率 (%)
  winRate: number;              // 胜率 (%)
  maxDrawdown: number;          // 最大回撤 (%)
  sharpeRatio: number;          // 夏普比率
  avgReturn: number;            // 平均收益率 (%)
  avgHoldingTime: number | null; // 平均持仓时间（小时）
}
```

**StrategyDetailAnalytics（详情）**：
```typescript
{
  strategy: {
    id, name, description, enabled, directionMode, minScore, holdPeriod,
    stopLossPct, takeProfitPct, maxSignalsPerDay, maxPositions, ...
  };
  runtime: {
    accountId, webhookId, enableWebhook, enableSimulation, enableLiveTrading,
    accountName?, webhookName?
  } | null;
  metrics: StrategyAnalytics;   // 同上的6个指标
  equityCurve: Array<{         // 资金曲线
    time: string;
    cumulativeProfit: number;
    tradeType: string;
    stockCode: string;
  }>;
  recentTrades: SimulationTrade[];  // 最近20条交易
  recentPositions: SimulationPosition[]; // 当前持仓
}
```

### 3.4 数据库查询

核心查询逻辑（在 StrategyService 中实现）：

1. 查询用户所有策略：`SELECT * FROM strategies WHERE userId = ?`
2. 查询关联的 sell trades：`SELECT * FROM simulation_trades WHERE strategyId IN (?) AND type = 'sell'`
3. 查询关联的 buy trades（用于配对计算持仓时间）：`SELECT * FROM simulation_trades WHERE strategyId IN (?) AND type = 'buy'`
4. 查询当前持仓：`SELECT * FROM simulation_positions WHERE strategyId IN (?)`
5. 在内存中计算各项指标（避免复杂SQL，保证可维护性）

## 四、前端设计

### 4.1 路由

在 `.umirc.ts` 中修改/新增：

```typescript
{ path: '/analysis/overview', component: '@/pages/analysis/overview', title: '综合分析' },
{ path: '/analysis/strategies', component: '@/pages/analysis/strategies/index', title: '策略总览' },
{ path: '/analysis/strategies/:id', component: '@/pages/analysis/strategies/[id]', title: '策略详情' },
```

### 4.2 菜单更新

在 MainLayout.tsx 的分析中心下添加子菜单：

```typescript
{
  key: '/analysis',
  icon: <FundOutlined />,
  label: '分析中心',
  children: [
    { key: '/analysis/overview', icon: <BarChartOutlined />, label: '综合分析' },
    { key: '/analysis/strategies', icon: <PieChartOutlined />, label: '策略总览' },
  ],
}
```

### 4.3 策略总览页 (`/analysis/strategies`)

**文件**：`apps/frontend/src/pages/analysis/strategies/index.tsx`

**布局**：
- 顶部标题"策略总览"
- 卡片网格布局（每个策略一张卡片），或 Table 列表布局
- 每个策略卡片/行展示：
  - 策略名称 + 状态标签（启用/禁用）+ 方向模式标签
  - 6个核心指标（总收益、胜率、最大回撤、夏普比率、平均收益率、平均持仓时间）
  - "查看详情"按钮，跳转到 `/analysis/strategies/:id`

**推荐使用 Table 布局**（策略可能较多，Table 更适合对比）：
- 列：策略名称、状态、方向、总收益、胜率、最大回撤、夏普比率、平均收益率、平均持仓时间、操作
- 支持排序（按收益率、胜率等排序）

### 4.4 策略详情页 (`/analysis/strategies/:id`)

**文件**：`apps/frontend/src/pages/analysis/strategies/[id].tsx`

**布局**：
1. **顶部**：策略名称 + 状态标签 + 返回按钮
2. **策略信息区**（Card）：
   - 基本参数：方向模式、最低分数、持仓周期、止损/止盈
   - Runtime：关联账户、Webhook、模拟交易开关
3. **核心指标区**（Row > 6个 Statistic Card）：
   - 总收益、胜率、最大回撤、夏普比率、平均收益率、平均持仓时间
4. **资金曲线区**（Card）：
   - 使用 lightweight-charts（项目已有依赖）绘制累计盈亏曲线
5. **最近交易区**（Card > Table）：
   - 股票代码、类型、数量、价格、盈亏、时间
6. **当前持仓区**（Card > Table）：
   - 股票代码、数量、成本、市值、盈亏

### 4.5 API Service

新增 `apps/frontend/src/services/strategy-analytics.ts`：

```typescript
export async function getStrategiesAnalytics(): Promise<StrategyAnalytics[]>
export async function getStrategyDetailAnalytics(id: string): Promise<StrategyDetailAnalytics>
```

## 五、实现步骤

### 步骤 1：后端 - StrategyService 新增分析方法
1. 在 `strategy.service.ts` 中新增 `getStrategyAnalytics(userId)` 方法
2. 在 `strategy.service.ts` 中新增 `getStrategyDetailAnalytics(strategyId, userId)` 方法
3. 实现指标计算逻辑（总收益、胜率、最大回撤、夏普比率、平均收益率、平均持仓时间）
4. 在 `strategy.service.ts` 中新增 `calculateMetrics(sellTrades, buyTrades)` 私有方法

### 步骤 2：后端 - Controller 新增路由
1. 在 `strategy.controller.ts` 中新增 `GET /strategies/analytics` 路由
2. 在 `strategy.controller.ts` 中新增 `GET /strategies/:id/analytics` 路由
3. 注意：`/strategies/analytics` 路由必须放在 `/:id` 之前，避免 `analytics` 被当作 id

### 步骤 3：前端 - API Service
1. 创建 `services/strategy-analytics.ts`，封装两个 API 调用
2. 在 `services/types.ts` 中新增类型定义

### 步骤 4：前端 - 策略总览页
1. 创建 `pages/analysis/strategies/index.tsx`
2. Table 布局展示所有策略的分析指标
3. 支持排序和跳转详情

### 步骤 5：前端 - 策略详情页
1. 创建 `pages/analysis/strategies/[id].tsx`
2. 策略信息 + Runtime 配置展示
3. 6个核心指标 Statistic 卡片
4. 资金曲线图（lightweight-charts）
5. 最近交易 Table
6. 当前持仓 Table

### 步骤 6：前端 - 路由和菜单
1. 在 `.umirc.ts` 中添加路由
2. 在 `MainLayout.tsx` 中更新分析中心子菜单

### 步骤 7：验证
1. 后端 tsc 类型检查
2. 前端 tsc 类型检查
3. 确保页面可正常访问和渲染
