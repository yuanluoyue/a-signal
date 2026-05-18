# Tasks

- [x] Task 1: 数据库 Schema 变更 — 新增 trading_agent_decisions 和 trading_agent_runtimes 表
  - [x] 1.1: 在 schema.ts 中定义 trading_agent_decisions 表（含索引）
  - [x] 1.2: 在 schema.ts 中定义 trading_agent_runtimes 表（含唯一索引）
  - [x] 1.3: 运行 drizzle-kit generate 生成迁移文件
  - [x] 1.4: 更新 seed.ts 新增 trading_agent_runtimes 种子数据

- [x] Task 2: 交易经验模块 — 新增"设为失效"功能
  - [x] 2.1: TradingMemoryService 新增 invalidate(id) 方法
  - [x] 2.2: TradingMemoryController 新增 PATCH /trading-memory/:id/invalidate 端点
  - [x] 2.3: 前端交易经验列表操作列新增"设为失效"按钮 + 确认弹窗

- [x] Task 3: 研究员 Agent 用户隔离改造
  - [x] 3.1: Agent Controller 移除 @Public()，使用 @CurrentUser() 获取 userId
  - [x] 3.2: ChatRequestDto 移除 userId 字段
  - [x] 3.3: ResearchAgentService 所有方法改为从参数接收 userId（由 Controller 传入）
  - [x] 3.4: 前端 agent-chat 页面 API 调用移除 userId 参数

- [x] Task 4: 交易 Agent 后端模块 — 核心服务与 LangGraph 工作流
  - [x] 4.1: 创建 trading-agent 模块目录结构（module/service/graph/nodes/tools/types）
  - [x] 4.2: 定义 TradingAgentState 类型
  - [x] 4.3: 实现 6 个 LangGraph 节点（contextLoad/riskAnalysis/decision/execution/memoryReview/log）
  - [x] 4.4: 实现 Agent Graph（节点串联 + 条件边）
  - [x] 4.5: 实现 TradingAgentService（processSignal 方法 + getDecisions + getStats + getRuntime + updateRuntime）
  - [x] 4.6: 注册 TradingAgentModule

- [x] Task 5: 交易 Agent 后端 API 接口
  - [x] 5.1: 创建 trading-agent Controller + DTO
  - [x] 5.2: GET /trading-agent/stats — 获取今日统计
  - [x] 5.3: GET /trading-agent/decisions — 分页查询决策日志
  - [x] 5.4: GET /trading-agent/decisions/:id — 决策详情
  - [x] 5.5: GET /trading-agent/runtime — 获取运行时配置
  - [x] 5.6: PUT /trading-agent/runtime — 更新运行时配置（开关 + 账户选择）
  - [x] 5.7: 注册 Controller 到 AppModule

- [x] Task 6: 信号通知流程集成交易 Agent
  - [x] 6.1: NotificationsService 注入 TradingAgentService
  - [x] 6.2: notifySignalAnalyzed 中增加交易 Agent 调用逻辑（查询 running 状态的 runtime，异步调用 processSignal）
  - [x] 6.3: 异常处理：Agent 执行异常不影响原有通知流程

- [x] Task 7: 交易 Agent 前端页面
  - [x] 7.1: 新增 services/trading-agent.ts API 封装 + types 定义
  - [x] 7.2: 新增 pages/trading-agent/index.tsx 页面（统计卡片 + 决策日志表格 + 详情弹窗）
  - [x] 7.3: 新增 pages/trading-agent/index.module.scss 样式
  - [x] 7.4: .umirc.ts 新增 /trading-agent 路由
  - [x] 7.5: MainLayout.tsx AI 智能体下新增"交易 Agent"菜单项

- [x] Task 8: 运行管理页面新增交易 Agent 配置
  - [x] 8.1: 运行管理页面顶部新增"交易 Agent"卡片（状态 Switch + 账户选择 + 上次运行时间）
  - [x] 8.2: 调用 GET /trading-agent/runtime 获取配置
  - [x] 8.3: 调用 PUT /trading-agent/runtime 更新配置

# Task Dependencies
- [Task 2] 独立，可并行
- [Task 3] 独立，可并行
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 4]
- [Task 6] depends on [Task 4]
- [Task 7] depends on [Task 5]
- [Task 8] depends on [Task 5]
