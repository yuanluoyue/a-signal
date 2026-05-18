# Tasks

- [x] Task 1: 数据库 Schema 与迁移
  - [x] SubTask 1.1: 在 `schema.ts` 中新增 `llm_requests`、`llm_usage_daily`、`llm_provider_configs` 三张表定义
  - [x] SubTask 1.2: 运行 `drizzle-kit generate` 生成迁移文件
  - [x] SubTask 1.3: 在 `seed.ts` 中新增 `llm_provider_configs` 种子数据（volcengine 默认配置）

- [x] Task 2: LLM 模块核心骨架
  - [x] SubTask 2.1: 创建 `src/modules/llm/llm.module.ts`，定义模块导入导出
  - [x] SubTask 2.2: 创建 `src/modules/llm/dto/` 目录，定义请求/响应 DTO（class-validator）

- [x] Task 3: Provider 适配层
  - [x] SubTask 3.1: 定义 `ILlmProvider` 接口（chatCompletion 方法签名、能力声明）
  - [x] SubTask 3.2: 实现 `volcengine.provider.ts`，封装现有 `VolcengineService`
  - [x] SubTask 3.3: 实现 `deepseek.provider.ts`，对接 DeepSeek API
  - [x] SubTask 3.4: 实现 `openrouter.provider.ts`，对接 OpenRouter API
  - [x] SubTask 3.5: 实现 `ollama.provider.ts`，对接 Ollama 本地 API

- [x] Task 4: 运行时工具
  - [x] SubTask 4.1: 实现 `runtime/token-counter.ts`，基于 tiktoken 或 Provider usage 数据计数
  - [x] SubTask 4.2: 实现 `runtime/retry-policy.ts`，指数退避重试策略（最多 3 次，仅重试超时/5xx/429）
  - [x] SubTask 4.3: 实现 `runtime/cost-calculator.ts`，根据 model 单价和 token 用量计算成本
  - [x] SubTask 4.4: 实现 `runtime/model-selector.ts`，根据 task 和可用性自动选择模型

- [x] Task 5: 网关核心服务
  - [x] SubTask 5.1: 实现 `gateway/llm-cache.service.ts`，基于 CacheModule 的请求缓存（相同 module+task+messages hash）
  - [x] SubTask 5.2: 实现 `gateway/llm-router.service.ts`，根据 provider/model 路由到对应 Provider
  - [x] SubTask 5.3: 实现 `gateway/llm-fallback.service.ts`，按降级链路切换 Provider
  - [x] SubTask 5.4: 实现 `gateway/llm-usage.service.ts`，用量记录与每日聚合、预算检查、RPM 限流
  - [x] SubTask 5.5: 实现 `gateway/llm.service.ts`，编排完整调用链路：路由→预算检查→限流→缓存→调用→重试→降级→记录→聚合

- [x] Task 6: 后端 API 接口
  - [x] SubTask 6.1: 创建 `interfaces/admin/llm/llm.controller.ts`，定义 AI 运行中心相关接口
  - [x] SubTask 6.2: 实现统计接口：今日花费/请求数/错误数
  - [x] SubTask 6.3: 实现使用分析接口：按 module 维度统计 token 消耗
  - [x] SubTask 6.4: 实现 Provider Usage 接口：按 provider/model 维度统计
  - [x] SubTask 6.5: 实现 Latency Analytics 接口：平均响应时间、retry rate、timeout rate
  - [x] SubTask 6.6: 实现 Provider 配置 CRUD 接口
  - [x] SubTask 6.7: 实现 LLM 日志列表/详情查询接口（分页+筛选）
  - [x] SubTask 6.8: 在 `app.module.ts` 中注册 LlmModule 和 LlmController

- [x] Task 7: 重构现有 LLM 调用方
  - [x] SubTask 7.1: 重构 `modules/agent/nodes/` 下所有节点（intent、planner、final），改为注入 `LlmService`
  - [x] SubTask 7.2: 重构 `modules/agent/trading/nodes/` 下所有节点（risk-analysis、memory-review、decision），改为注入 `LlmService`
  - [x] SubTask 7.3: 重构 `modules/agent/graph/agent-graph.ts`，改为注入 `LlmService`
  - [x] SubTask 7.4: 重构 `modules/agent/trading/graph.ts`，改为注入 `LlmService`
  - [x] SubTask 7.5: 重构 `jobs/event-analyze.consumer.ts`，改为注入 `LlmService`
  - [x] SubTask 7.6: 更新 `modules/agent/agent.module.ts`，移除 VolcengineModule 直接依赖，改为 LlmModule

- [x] Task 8: 前端 AI 运行中心页面
  - [x] SubTask 8.1: 创建 `services/llm.ts`，封装 AI 运行中心相关 API 调用
  - [x] SubTask 8.2: 在 `services/types.ts` 中新增 LLM 相关类型定义
  - [x] SubTask 8.3: 创建 `pages/llm-center/index.tsx`，实现统计概览、使用分析、Provider Usage、Latency Analytics、预算配置
  - [x] SubTask 8.4: 在 `.umirc.ts` 中新增 `/llm-center` 路由
  - [x] SubTask 8.5: 在 `MainLayout.tsx` 的 AI 智能体菜单组下新增"AI 运行中心"菜单项

- [x] Task 9: 前端 LLM 日志页面
  - [x] SubTask 9.1: 创建 `pages/llm-logs/index.tsx`，实现日志列表（分页+筛选）和详情 Drawer
  - [x] SubTask 9.2: 在 `.umirc.ts` 中新增 `/llm-logs` 路由
  - [x] SubTask 9.3: 在 `MainLayout.tsx` 的 AI 智能体菜单组下新增"LLM 日志"菜单项

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 2]
- [Task 5] depends on [Task 3, Task 4]
- [Task 6] depends on [Task 5]
- [Task 7] depends on [Task 5]
- [Task 8] depends on [Task 6]
- [Task 9] depends on [Task 6]
- [Task 8] and [Task 9] can run in parallel
