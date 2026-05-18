# LLM 网关 Spec

## Why
当前系统中所有 AI/LLM 调用（新闻分析、研究 Agent、交易 Agent 等）直接依赖 `VolcengineService`，缺乏统一的路由、监控、限流和成本管控能力。需要构建 LLM 网关层，收敛所有 LLM 调用，实现多 Provider 支持、用量追踪、预算管控和可观测性。

## What Changes
- 新增 `src/modules/llm` 模块，作为所有 LLM 调用的统一入口
- 新增 LLM 网关核心服务：路由、缓存、降级、用量统计
- 新增多 Provider 适配层：DeepSeek、OpenRouter、Ollama、Volcengine
- 新增运行时工具：Token 计数、重试策略、成本计算、模型选择
- 新增 3 张数据库表：`llm_requests`、`llm_usage_daily`、`llm_provider_configs`
- 新增后端 API 接口：AI 运行中心统计、Provider 配置管理、LLM 日志查询
- 新增前端页面：AI 运行中心（统计+分析+配置）、LLM 日志页面
- 重构现有 `VolcengineService` 调用方，统一走 LLM 网关
- 新增每日 Token 预算限制与超额限流机制

## Impact
- Affected specs: 无直接影响已有 spec
- Affected code:
  - `core/volcengine/volcengine.service.ts` — 保留但不再被业务直接调用，改为由 LLM 网关的 Volcengine Provider 封装
  - `modules/agent/` — 所有 Agent 节点（intent、planner、final、risk-analysis、memory-review、decision）改为调用 LLM 网关
  - `jobs/event-analyze.consumer.ts` — 改为调用 LLM 网关
  - `app.module.ts` — 注册 LlmModule 和新 Controller
  - `core/db/schema.ts` — 新增 3 张表
  - `scripts/seed.ts` — 新增 Provider 配置种子数据
  - 前端 `MainLayout.tsx` — 新增 AI 运行中心菜单
  - 前端 `.umirc.ts` — 新增路由
  - 前端新增 `pages/llm-center/` 和 `pages/llm-logs/` 页面

## ADDED Requirements

### Requirement: LLM 网关统一入口
系统 SHALL 提供 `LlmService` 作为所有 LLM 调用的唯一入口，所有业务模块（Agent、事件分析等）必须通过该服务发起 LLM 请求，禁止直接调用底层 Provider。

#### Scenario: 业务模块发起 LLM 请求
- **WHEN** 业务模块调用 `LlmService.chatCompletion(module, task, messages, options)`
- **THEN** 网关自动执行：模型选择 → 预算检查 → 限流检查 → 缓存查询 → Provider 调用 → 重试（如失败）→ 降级（如重试耗尽）→ 记录请求日志 → 更新用量统计

#### Scenario: 缓存命中
- **WHEN** 相同 module + task + messages hash 的请求在缓存有效期内再次发起
- **THEN** 直接返回缓存结果，标记 `cacheHit: true`，不调用 Provider

### Requirement: 多 Provider 支持
系统 SHALL 支持多个 LLM Provider，包括 Volcengine（已有）、DeepSeek、OpenRouter、Ollama，每个 Provider 实现统一的 `ILlmProvider` 接口。

#### Scenario: Provider 路由
- **WHEN** 请求指定了 provider 和 model
- **THEN** 网关路由到对应 Provider 执行调用
- **WHEN** 请求未指定 provider
- **THEN** 网关根据 `LlmRouterService` 的路由策略自动选择（基于模型配置、可用性、成本）

#### Scenario: Provider 降级
- **WHEN** 主 Provider 调用失败且重试耗尽
- **THEN** `LlmFallbackService` 按配置的降级链路切换到备选 Provider

### Requirement: Provider 配置管理
系统 SHALL 通过 `llm_provider_configs` 表管理各 Provider 的运行时配置，支持动态启用/禁用、API Key 配置、RPM 限制、每日预算设置。

#### Scenario: 更新 Provider 配置
- **WHEN** 管理员通过 API 更新 Provider 的 apiKey、rpmLimit、dailyBudget 等配置
- **THEN** 配置立即生效，无需重启服务

#### Scenario: 禁用 Provider
- **WHEN** 管理员将某 Provider 设为 `enabled: false`
- **THEN** 该 Provider 不再接收新请求，路由自动跳过

### Requirement: 请求日志记录
系统 SHALL 将每次 LLM 请求的完整信息记录到 `llm_requests` 表，包括 module、task、provider、model、token 用量、成本、延迟、成功状态、错误信息、重试次数、缓存命中等。

#### Scenario: 成功请求记录
- **WHEN** LLM 请求成功完成
- **THEN** 记录包含 provider、model、promptTokens、completionTokens、totalTokens、estimatedCost、latencyMs、success: true、retryCount、cacheHit

#### Scenario: 失败请求记录
- **WHEN** LLM 请求最终失败（含重试耗尽）
- **THEN** 记录包含 success: false、errorMessage、retryCount

### Requirement: 每日用量聚合
系统 SHALL 每日聚合 LLM 用量数据到 `llm_usage_daily` 表，按 date + module + provider 维度统计 totalRequests、totalTokens、totalCost。

#### Scenario: 用量聚合
- **WHEN** 每日定时任务执行（或请求时实时 upsert）
- **THEN** 聚合当日各 module + provider 维度的请求数、Token 数、总成本

### Requirement: 每日预算与限流
系统 SHALL 支持按 Provider 设置每日 Token 预算（`dailyBudget`），超额时触发限流。

#### Scenario: 预算检查
- **WHEN** LLM 请求到达网关
- **THEN** 检查该 Provider 当日已使用 Token 是否超过 `dailyBudget`
- **IF** 超过预算
- **THEN** 拒绝请求，记录日志 `LLM daily budget exceeded for provider {name}`，返回错误

#### Scenario: RPM 限流
- **WHEN** 某 Provider 的请求频率超过 `rpmLimit`
- **THEN** 拒绝请求，记录日志 `LLM RPM limit exceeded for provider {name}`

### Requirement: AI 运行中心页面
前端 SHALL 提供 AI 运行中心页面，包含以下功能区域：

#### Scenario: 统计概览
- **WHEN** 用户访问 AI 运行中心
- **THEN** 显示今日花费 Token、今日请求数、今日错误数

#### Scenario: 使用分析
- **WHEN** 用户查看使用分析
- **THEN** 按模块（交易 Agent、新闻分析、对话 Agent 等）展示 Token 消耗分布

#### Scenario: Provider Usage
- **WHEN** 用户查看 Provider Usage
- **THEN** 按不同模型展示 Token 消耗分布

#### Scenario: Latency Analytics
- **WHEN** 用户查看延迟分析
- **THEN** 显示平均响应时间、retry rate、timeout rate

#### Scenario: 预算配置
- **WHEN** 用户查看预算配置
- **THEN** 显示各 Provider 的每日 Token 限制，支持修改 dailyBudget

### Requirement: LLM 日志页面
前端 SHALL 提供 LLM 日志页面，展示请求列表和详情。

#### Scenario: 日志列表
- **WHEN** 用户访问 LLM 日志页面
- **THEN** 显示日志列表，包含模型、调用 prompt 摘要、请求/响应摘要、耗时等基本信息，支持分页和筛选

#### Scenario: 日志详情
- **WHEN** 用户点击某条日志
- **THEN** 弹出 Drawer 显示完整详情，包含完整 prompt、完整响应、token 用量、成本、延迟、重试信息等

### Requirement: 运行时工具
系统 SHALL 提供以下运行时工具：

#### Scenario: Token 计数
- **WHEN** LLM 请求完成
- **THEN** `TokenCounter` 基于 Provider 返回的 usage 数据记录 promptTokens 和 completionTokens

#### Scenario: 重试策略
- **WHEN** LLM 请求失败
- **THEN** `RetryPolicy` 按指数退避策略重试，最多 3 次，仅对可重试错误（超时、5xx、429）重试

#### Scenario: 成本计算
- **WHEN** LLM 请求完成
- **THEN** `CostCalculator` 根据 model 的单价和 token 用量计算 estimatedCost

#### Scenario: 模型选择
- **WHEN** 请求未指定 model
- **THEN** `ModelSelector` 根据 task 类型、Provider 可用性、成本优先级自动选择最优 model

## MODIFIED Requirements

### Requirement: VolcengineService 调用方式
原有 `VolcengineService` 不再被业务模块直接注入调用。业务模块改为注入 `LlmService`，通过网关统一调用。`VolcengineService` 保留在 `core/volcengine/` 中，仅被 `providers/volcengine.provider.ts` 内部使用。

### Requirement: Agent 模块 LLM 调用
Agent 模块中的所有节点（intent、planner、final、risk-analysis、memory-review、decision）和 `event-analyze.consumer.ts` 改为注入 `LlmService`，通过网关调用 LLM，传入 module 和 task 标识用于追踪。
