# Tasks

- [x] Task 1: 数据库 Schema 变更 — 为所有需要用户隔离的表添加 userId/accountId/name 字段
  - [x] SubTask 1.1: strategies 表新增 userId 字段（uuid nullable FK → users.id），新增 (userId, name) 联合唯一索引替代原 name 唯一索引
  - [x] SubTask 1.2: webhooks 表新增 userId 字段（uuid nullable FK → users.id），新增 userId 索引
  - [x] SubTask 1.3: backtest_records 表新增 userId 字段（uuid nullable FK → users.id），新增 userId 索引
  - [x] SubTask 1.4: backtest_trades 表新增 userId 字段（uuid nullable FK → users.id），新增 userId 索引
  - [x] SubTask 1.5: simulation_accounts 表新增 name 字段（varchar(100) nullable），新增 (userId, name) 联合唯一索引
  - [x] SubTask 1.6: strategies_runtime 表新增 accountId 字段（uuid nullable FK → simulation_accounts.id），新增 accountId 索引
  - [x] SubTask 1.7: stock_trackings 表新增 userId 字段（uuid nullable FK → users.id），唯一约束从 (stockCode) 改为 (userId, stockCode)，新增 userId 索引
  - [x] SubTask 1.8: api_keys 表新增 userId 字段（uuid nullable FK → users.id），新增 userId 索引
  - [x] SubTask 1.9: 运行 drizzle-kit generate 生成迁移文件，确保只保留一个最终迁移文件

- [x] Task 2: 后端 Service 层适配用户隔离 — 策略模块
  - [x] SubTask 2.1: StrategyService.create 增加 userId 参数，创建策略时写入 userId
  - [x] SubTask 2.2: StrategyService.findList 增加 userId 过滤，只返回该用户的策略
  - [x] SubTask 2.3: StrategyService.findById 增加权限校验，确认策略属于当前用户
  - [x] SubTask 2.4: StrategyService.update 增加权限校验，确认策略属于当前用户
  - [x] SubTask 2.5: StrategyService.findEnabledWithRuntime 改为按用户查询或返回带 userId 的结果
  - [x] SubTask 2.6: StrategyService.updateRuntime 增加权限校验，accountId 只能选择当前用户的账户
  - [x] SubTask 2.7: StrategyService.create 中 name 唯一性校验改为用户内唯一

- [x] Task 3: 后端 Service 层适配用户隔离 — 模拟交易模块
  - [x] SubTask 3.1: SimulationService.getAccountByUserId 改为 getAccountsByUserId，返回账户列表
  - [x] SubTask 3.2: SimulationService.createAccount 支持 name 参数
  - [x] SubTask 3.3: SimulationService.executeStrategyTrade 改为接收 accountId 参数，使用 runtime 指定的账户
  - [x] SubTask 3.4: SimulationService 各方法增加账户归属校验（确认账户属于当前用户）

- [x] Task 4: 后端 Service 层适配用户隔离 — 其他模块
  - [x] SubTask 4.1: WebhooksService 所有查询方法增加 userId 过滤，create 时写入 userId
  - [x] SubTask 4.2: BacktestService.createBacktest 增加 userId 参数，写入 userId；查询方法增加 userId 过滤
  - [x] SubTask 4.3: StockTrackingService 所有查询方法增加 userId 过滤，create 时写入 userId
  - [x] SubTask 4.4: ApiKeyService 所有查询方法增加 userId 过滤，create 时写入 userId
  - [x] SubTask 4.5: NotificationsService.notifySignalAnalyzed 适配用户隔离，使用策略所属用户的 Webhook 和账户

- [x] Task 5: 后端 Controller 层适配用户隔离
  - [x] SubTask 5.1: StrategyController 移除 @Public() 装饰器，从 req.user 获取 userId 传入 Service
  - [x] SubTask 5.2: SimulationController 适配多账户，新增 GET /simulation/accounts 列表接口，POST /simulation/account 支持 name 参数
  - [x] SubTask 5.3: WebhooksController 移除 @Public() 装饰器，从 req.user 获取 userId 传入 Service
  - [x] SubTask 5.4: BacktestController 移除 @Public() 装饰器，从 req.user 获取 userId 传入 Service
  - [x] SubTask 5.5: SignalRulesController 保持 @Public()（信号规则为系统级）
  - [x] SubTask 5.6: StockTrackingController 增加 userId 传入
  - [x] SubTask 5.7: ApiKeyController 增加 userId 传入

- [x] Task 6: 后端 DTO 更新
  - [x] SubTask 6.1: 策略相关 DTO 适配（CreateStrategyDto 移除 webhookId，StrategyListQueryDto 无需 userId 由 Controller 注入）
  - [x] SubTask 6.2: 模拟交易 DTO 适配（CreateAccountDto 新增 name，UpdateStrategyRuntimeDto 新增 accountId）
  - [x] SubTask 6.3: Webhook 相关 DTO 适配
  - [x] SubTask 6.4: 回测相关 DTO 适配

- [x] Task 7: 前端模拟交易页面多账户适配
  - [x] SubTask 7.1: 页面顶部新增账户选择 Select 组件（多账户时显示，单账户时隐藏）
  - [x] SubTask 7.2: 新增"创建账户"按钮和弹窗（输入名称和初始资金）
  - [x] SubTask 7.3: 所有 API 调用适配 accountId 参数（持仓、交易、资金曲线、刷新等）
  - [x] SubTask 7.4: 账户切换时重新加载对应账户的数据

- [x] Task 8: 前端运行管理页面账户选择适配
  - [x] SubTask 8.1: 策略模拟交易开关旁新增账户选择 Select
  - [x] SubTask 8.2: 更新 runtime 时传入 accountId
  - [x] SubTask 8.3: 获取当前用户的模拟账户列表供选择

- [x] Task 9: 前端其他页面用户隔离适配
  - [x] SubTask 9.1: 策略管理页面 — 确认 API 已带 userId，无需前端改动（后端自动过滤）
  - [x] SubTask 9.2: 通知设置页面 — 确认 API 已带 userId，无需前端改动（后端自动过滤）
  - [x] SubTask 9.3: 回测页面 — 确认 API 已带 userId，策略选择器只展示当前用户策略
  - [x] SubTask 9.4: 股票追踪页面 — 确认 API 已带 userId

- [x] Task 10: Seed 文件更新
  - [x] SubTask 10.1: 策略种子数据增加 userId（关联 admin 用户）
  - [x] SubTask 10.2: strategies_runtime 种子数据增加 accountId
  - [x] SubTask 10.3: Webhook 种子数据增加 userId（如有）
  - [x] SubTask 10.4: 模拟账户种子数据增加 name 字段

# Task Dependencies
- [Task 2] depends on [Task 1] — Service 层需要新字段
- [Task 3] depends on [Task 1] — Service 层需要新字段
- [Task 4] depends on [Task 1] — Service 层需要新字段
- [Task 5] depends on [Task 2, Task 3, Task 4] — Controller 调用 Service
- [Task 6] depends on [Task 1] — DTO 需要适配新字段
- [Task 7] depends on [Task 5] — 前端依赖后端 API
- [Task 8] depends on [Task 5] — 前端依赖后端 API
- [Task 9] depends on [Task 5] — 前端依赖后端 API
- [Task 10] depends on [Task 1] — Seed 需要新字段
- [Task 2, Task 3, Task 4] 可并行
- [Task 7, Task 8, Task 9] 可并行
