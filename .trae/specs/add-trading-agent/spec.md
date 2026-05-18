# 交易 Agent Spec

## Why
当前系统只有研究员 Agent（纯查询，不执行交易），缺少一个能根据信号、持仓和交易经验自动做出交易决策的智能体。交易 Agent 可以自动评估信号质量、控制仓位大小、检查风险和持仓冲突，并在每轮交易后沉淀交易经验，形成闭环。

## What Changes
- 新增 `trading_agent_decisions` 表，记录 Agent 的每条决策日志
- 新增 `trading_agent_runtimes` 表，记录交易 Agent 的运行时配置（关联用户和模拟账户）
- 新增 Trading Agent 后端模块（LangGraph 工作流：上下文加载 → 风险分析 → 决策 → 执行 → 经验沉淀 → 日志记录）
- 新增交易 Agent 前端页面（统计卡片 + 决策日志列表 + 决策详情弹窗）
- 运行管理页面新增"交易 Agent"配置区域（开关 + 账户选择）
- 信号通知流程中集成交易 Agent 调用（当 Agent 运行中时，将信号转发给 Agent）
- 研究员 Agent 和交易 Agent 均增加用户隔离（从 JWT 提取 userId，移除客户端传参）
- 交易经验模块新增"设为失效"操作（后端 PATCH 接口 + 前端按钮）
- seed 文件同步更新

## Impact
- Affected specs: 运行管理、模拟交易、信号通知流程、研究员 Agent、交易经验
- Affected code:
  - `apps/backend/src/core/db/schema.ts` — 新增 2 张表
  - `apps/backend/src/modules/trading-agent/` — 新增模块
  - `apps/backend/src/modules/trading-memory/trading-memory.service.ts` — 新增 invalidate 方法
  - `apps/backend/src/modules/notifications/notifications.service.ts` — 集成交易 Agent 调用
  - `apps/backend/src/modules/agent/research-agent.service.ts` — 用户隔离改造
  - `apps/backend/src/interfaces/admin/agent/agent.controller.ts` — 移除 @Public，使用 @CurrentUser
  - `apps/backend/src/interfaces/admin/trading-memory/trading-memory.controller.ts` — 新增 PATCH 端点
  - `apps/backend/src/interfaces/admin/trading-agent/` — 新增控制器
  - `apps/frontend/src/pages/trading-agent/` — 新增页面
  - `apps/frontend/src/pages/runtime/index.tsx` — 新增交易 Agent 配置区域
  - `apps/frontend/src/pages/trading-memory/index.tsx` — 新增"设为失效"按钮
  - `apps/frontend/src/layouts/MainLayout.tsx` — 新增菜单项
  - `apps/frontend/.umirc.ts` — 新增路由
  - `apps/backend/scripts/seed.ts` — 更新种子数据

## ADDED Requirements

### Requirement: trading_agent_decisions 决策日志表
系统 SHALL 新增 `trading_agent_decisions` 表，记录交易 Agent 的每条决策。

#### Scenario: 决策日志表结构
- **GIVEN** `trading_agent_decisions` 表包含以下字段：
  - `id` (uuid, PK)
  - `userId` (uuid, nullable, FK → users.id) — 决策归属用户
  - `accountId` (uuid, nullable, FK → simulation_accounts.id) — 关联模拟账户
  - `signalId` (uuid, nullable, FK → signals.id) — 关联信号
  - `decisionType` (varchar(30), nullable) — 决策类型：`execute`（执行开仓）/ `reject`（拒绝）/ `adjust_position`（调整仓位）/ `close_position`（平仓）/ `modify_holding`（修改其他持仓）
  - `decision` (varchar(20), nullable) — 决策结果：`approved` / `rejected`
  - `rationale` (text, nullable) — Agent 的推理过程
  - `confidence` (decimal(3,2), nullable) — 置信度 0~1
  - `riskLevel` (varchar(20), nullable) — 风险等级：`low` / `medium` / `high` / `critical`
  - `positionAction` (jsonb, nullable) — 交易动作详情 `{ action, stockCode, stockName, quantity, price, takeProfitPrice?, stopLossPrice? }`
  - `contextSnapshot` (jsonb, nullable) — 决策上下文快照 `{ accountInfo, signalInfo, relevantMemories, currentPositions }`
  - `memoryCreated` (boolean, default false) — 是否沉淀了交易经验
  - `createdAt` (timestamp)
- **THEN** 按 `(userId, createdAt DESC)` 和 `(signalId)` 建索引

### Requirement: trading_agent_runtimes Agent 运行时表
系统 SHALL 新增 `trading_agent_runtimes` 表，每个用户最多一条记录，记录交易 Agent 的运行状态和配置。

#### Scenario: Agent 运行时表结构
- **GIVEN** `trading_agent_runtimes` 表包含以下字段：
  - `id` (uuid, PK)
  - `userId` (uuid, nullable, FK → users.id, unique) — 归属用户，一对一
  - `accountId` (uuid, nullable, FK → simulation_accounts.id) — 控制的模拟账户
  - `status` (varchar(20), nullable, default 'stopped') — 运行状态：`running` / `stopped`
  - `lastRunAt` (timestamp, nullable) — 上次运行时间
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
- **THEN** 按 `userId` 建唯一索引

#### Scenario: 每用户最多一个交易 Agent 运行时
- **WHEN** 用户启动交易 Agent
- **THEN** 创建或更新该用户的 `trading_agent_runtimes` 记录
- **AND** 每个用户最多一条运行时记录

### Requirement: 交易 Agent LangGraph 工作流
系统 SHALL 实现基于 LangGraph 的交易 Agent 工作流，在收到信号时自动执行决策流程。

#### Scenario: 工作流节点
- **GIVEN** 交易 Agent 工作流包含以下节点：
  | 节点 | 职责 | 输入 | 输出 |
  |------|------|------|------|
  | `contextLoadNode` | 加载账户信息、当前持仓、信号详情、相关交易经验 | userId, accountId, signalId | accountInfo, positions, signalInfo, relevantMemories |
  | `riskAnalysisNode` | 分析风险等级、检查持仓冲突、检查组合集中度 | accountInfo, positions, signalInfo | riskLevel, conflictInfo, concentrationInfo |
  | `decisionNode` | 综合评估，做出交易决策 | accountInfo, signalInfo, relevantMemories, riskLevel | decision, rationale, confidence, positionAction |
  | `executionNode` | 执行已批准的交易 | decision, positionAction | executionResult |
  | `memoryReviewNode` | 回顾最近交易，决定是否沉淀交易经验 | userId, accountId, recentTrades | memoryCreated, newMemoryData |
  | `logNode` | 保存决策日志 | 全部上下文 | - |
- **THEN** 执行顺序为：contextLoad → riskAnalysis → decision → (execution if approved) → memoryReview → log

#### Scenario: 信号触发 Agent 决策
- **WHEN** 信号分析完成且用户的交易 Agent 状态为 `running`
- **THEN** 系统将信号转发给交易 Agent
- **AND** Agent 加载该用户 runtime 指定的模拟账户信息和交易经验
- **AND** Agent 执行决策流程并记录日志

#### Scenario: Agent 批准执行交易
- **WHEN** Agent 决策为 `approved`，decisionType 为 `execute`
- **THEN** 调用 `SimulationService.executeTrade()` 执行交易
- **AND** `tradeSource` 为 `'agent'`
- **AND** 决策日志记录 `positionAction` 详情

#### Scenario: Agent 拒绝交易
- **WHEN** Agent 决策为 `rejected`
- **THEN** 不执行交易
- **AND** 决策日志记录拒绝原因（rationale）

#### Scenario: Agent 检测到高风险
- **WHEN** Agent 判定风险等级为 `high` 或 `critical`
- **THEN** 自动拒绝交易
- **AND** rationale 中说明风险因素

#### Scenario: Agent 检测到持仓冲突
- **WHEN** 信号方向与当前持仓方向冲突（如已有同股票多头持仓，信号建议做空）
- **THEN** Agent 可以决定拒绝或调整仓位
- **AND** rationale 中说明冲突详情

#### Scenario: 交易后沉淀经验
- **WHEN** Agent 执行完交易后，回顾该账户最近 10 条交易记录
- **THEN** Agent 判断是否存在可沉淀的交易模式
- **AND** 如果存在，调用 `TradingMemoryService` 创建新的交易经验
- **AND** 决策日志的 `memoryCreated` 标记为 true

### Requirement: 交易 Agent Tools
交易 Agent SHALL 具备以下工具能力（通过 LLM function calling 实现）：

| Tool | 功能 | 说明 |
|------|------|------|
| `get_account_info` | 获取账户信息 | 余额、持仓市值、可用资金、总盈亏 |
| `get_current_positions` | 获取当前持仓 | 持仓列表、各持仓盈亏、集中度 |
| `get_signal_details` | 获取信号详情 | 信号分数、方向、关联事件、规则 |
| `get_trading_memories` | 获取相关交易经验 | 按信号类型/股票/市场环境匹配经验 |
| `execute_trade` | 执行模拟交易 | 开仓/平仓/调整仓位 |
| `create_trading_memory` | 沉淀交易经验 | 创建新的交易经验记录 |

### Requirement: 交易 Agent 前端页面
系统 SHALL 新增交易 Agent 页面，路径 `/trading-agent`。

#### Scenario: 页面布局
- **WHEN** 用户访问 `/trading-agent`
- **THEN** 页面上方展示统计卡片，下方展示决策日志表格

#### Scenario: 统计卡片
- **WHEN** 页面加载
- **THEN** 展示以下统计信息（基于今日数据）：
  - 今日决策数：当天 `trading_agent_decisions` 记录总数
  - 执行数：当天 `decision=approved` 的记录数
  - 拒绝数：当天 `decision=rejected` 的记录数
  - 高风险拒绝：当天 `riskLevel=high/critical AND decision=rejected` 的记录数

#### Scenario: 决策日志列表
- **WHEN** 用户查看决策日志
- **THEN** 表格展示以下列：时间、信号标题、决策类型、决策结果、风险等级、置信度、是否沉淀经验
- **AND** 支持按决策结果、风险等级筛选
- **AND** 支持分页

#### Scenario: 决策详情弹窗
- **WHEN** 用户点击某条决策的"详情"按钮
- **THEN** 弹窗展示完整决策信息：
  - 基本信息：决策类型、结果、置信度、风险等级
  - 推理过程（rationale）
  - 交易动作详情（positionAction）
  - 上下文快照（contextSnapshot）：账户信息、信号信息、相关经验、当前持仓
  - 是否沉淀了交易经验

### Requirement: 运行管理页面新增交易 Agent 配置
运行管理页面 SHALL 新增"交易 Agent"配置区域。

#### Scenario: 交易 Agent 配置区域
- **WHEN** 用户访问运行管理页面
- **THEN** 页面顶部展示"交易 Agent"卡片，包含：
  - 运行状态 Switch（开/关）
  - 模拟账户选择 Select（列出当前用户的模拟账户）
  - 上次运行时间

#### Scenario: 启动交易 Agent
- **WHEN** 用户开启交易 Agent 开关并选择了模拟账户
- **THEN** 创建或更新 `trading_agent_runtimes` 记录，status 设为 `running`
- **AND** 后续信号将转发给交易 Agent 处理

#### Scenario: 停止交易 Agent
- **WHEN** 用户关闭交易 Agent 开关
- **THEN** 更新 `trading_agent_runtimes` 记录，status 设为 `stopped`
- **AND** 后续信号不再转发给交易 Agent

#### Scenario: 未选择账户时提示
- **WHEN** 用户开启交易 Agent 但未选择模拟账户
- **THEN** 显示警告提示"请选择模拟账户"
- **AND** Agent 运行时将使用用户的默认账户

### Requirement: 信号通知流程集成交易 Agent
`NotificationsService.notifySignalAnalyzed` SHALL 在信号分析完成后，检查是否有运行中的交易 Agent，如果有则将信号转发给 Agent。

#### Scenario: 信号转发给交易 Agent
- **WHEN** 信号分析完成
- **AND** 存在 status='running' 的交易 Agent 运行时
- **THEN** 对每个运行中的 Agent，异步调用交易 Agent 工作流
- **AND** 传入 userId、accountId、signalId

#### Scenario: Agent 运行异常不影响通知流程
- **WHEN** 交易 Agent 执行过程中发生异常
- **THEN** 记录错误日志，但不影响原有的策略通知流程
- **AND** 决策日志中记录异常信息

### Requirement: 研究员 Agent 用户隔离
研究员 Agent SHALL 实现用户隔离，从 JWT Token 提取 userId，不再由客户端传参。

#### Scenario: 从 JWT 提取 userId
- **WHEN** 用户调用 Agent 聊天接口
- **THEN** 从 JWT Token 中提取 userId（使用 @CurrentUser 装饰器）
- **AND** 不再使用请求体中的 userId 字段

#### Scenario: 会话按用户隔离
- **WHEN** 用户查询会话列表
- **THEN** 只返回该用户的会话
- **AND** 不返回其他用户的会话

#### Scenario: 聊天历史按用户隔离
- **WHEN** 用户查询聊天历史
- **THEN** 只返回该用户指定会话的历史
- **AND** 不返回其他用户的历史

### Requirement: 交易 Agent 用户隔离
交易 Agent SHALL 实现用户隔离，所有操作基于当前登录用户。

#### Scenario: 决策日志按用户隔离
- **WHEN** 用户查询决策日志
- **THEN** 只返回该用户的决策记录

#### Scenario: 运行时配置按用户隔离
- **WHEN** 用户查询或修改交易 Agent 运行时
- **THEN** 只能操作自己的运行时配置

#### Scenario: 统计数据按用户隔离
- **WHEN** 用户查询交易 Agent 统计
- **THEN** 只统计该用户的数据

### Requirement: 交易经验手动设为失效
交易经验模块 SHALL 支持手动将经验状态设为 `invalidated`。

#### Scenario: 手动设为失效
- **WHEN** 用户在交易经验列表中点击某条经验的"设为失效"按钮
- **THEN** 弹出确认弹窗
- **AND** 确认后调用 `PATCH /trading-memory/:id/invalidate` 接口
- **AND** 该经验的 status 更新为 `invalidated`，`invalidatedAt` 更新为当前时间
- **AND** 列表中该经验的状态 Badge 更新为"已失效"

#### Scenario: 已失效经验不可再次设为失效
- **WHEN** 经验的 status 已经是 `invalidated`
- **THEN** "设为失效"按钮不显示或禁用

## MODIFIED Requirements

### Requirement: Agent Controller 移除 @Public
Agent Controller 的所有端点 SHALL 移除 `@Public()` 装饰器，改为通过 JWT 认证，使用 `@CurrentUser()` 装饰器获取 userId。

### Requirement: ChatRequestDto 移除 userId
`ChatRequestDto` SHALL 移除 `userId` 字段，userId 从 JWT Token 中自动提取。

### Requirement: Trading Memory Controller 新增 PATCH 端点
`TradingMemoryController` SHALL 新增 `PATCH /trading-memory/:id/invalidate` 端点，将指定经验的状态设为 `invalidated`。

### Requirement: Trading Memory Service 新增 invalidate 方法
`TradingMemoryService` SHALL 新增 `invalidate(id)` 方法，更新经验的 status 为 `invalidated` 并设置 `invalidatedAt` 为当前时间。

### Requirement: 交易经验前端新增"设为失效"按钮
交易经验列表页的操作列 SHALL 新增"设为失效"按钮，点击后弹出确认弹窗，确认后调用接口。

### Requirement: MainLayout 新增交易 Agent 菜单
AI 智能体菜单下 SHALL 新增"交易 Agent"子菜单项，路径 `/trading-agent`，图标使用 `ThunderboltOutlined`。

### Requirement: seed 文件更新
seed 文件 SHALL 新增 `trading_agent_runtimes` 种子数据（admin 用户的 Agent 运行时，默认 stopped 状态）。

## REMOVED Requirements
无
