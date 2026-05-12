# Tasks

- [x] Task 1: 数据库 Schema 变更 - 新建 strategies_runtime 表和新增字段
  - [x] SubTask 1.1: 新建 strategies_runtime 表，包含 id、strategyId(unique FK)、webhookId(nullable FK)、enableWebhook(default true)、enableSimulation(default false)、enableLiveTrading(default false)、createdAt、updatedAt
  - [x] SubTask 1.2: simulation_positions 表新增 strategyId（uuid, nullable）字段
  - [x] SubTask 1.3: simulation_trades 表新增 strategyId（uuid, nullable）字段
  - [x] SubTask 1.4: 运行 drizzle-kit generate 生成迁移文件
  - [x] SubTask 1.5: 迁移文件中添加数据迁移逻辑（遵循规则不在迁移中执行数据更新，由应用层 getOrCreateRuntime 处理兼容）

- [x] Task 2: 后端 - StrategyService 适配 strategies_runtime
  - [x] SubTask 2.1: StrategyService 新增 findEnabledWithRuntime() 方法，查询所有 enabled=true 的策略，left join strategies_runtime 和 webhooks，返回策略 + runtime + webhook 信息
  - [x] SubTask 2.2: StrategyService 新增 findEnabledWithRuntime() 方法（替代原 findEnabledWithWebhook），返回策略列表带 runtime 配置
  - [x] SubTask 2.3: StrategyService.create 适配：创建策略后同时创建 strategies_runtime 记录
  - [x] SubTask 2.4: StrategyService 新增 updateRuntime() 方法，更新 strategies_runtime 表的 enableWebhook/enableSimulation/enableLiveTrading/webhookId
  - [x] SubTask 2.5: StrategyService.findList 返回数据包含 runtime 信息（left join strategies_runtime）
  - [x] SubTask 2.6: 策略管理 DTO 适配：CreateStrategyDto 中 webhookId 保留（用于创建时自动设置 runtime），新增 runtime 相关 DTO（UpdateStrategyRuntimeDto）

- [x] Task 3: 后端 - 策略 Controller 适配
  - [x] SubTask 3.1: StrategyController 新增 PUT /strategies/:id/runtime 接口，更新策略运行时配置
  - [x] SubTask 3.2: StrategyController 的 GET /strategies 接口返回数据包含 runtime 字段
  - [x] SubTask 3.3: StrategyController 的 POST /strategies 接口创建策略时同时创建 runtime 记录

- [x] Task 4: 后端 - 通知流程适配 strategies_runtime
  - [x] SubTask 4.1: NotificationsService.notifySignalAnalyzed 改用 findEnabledWithRuntime() 获取策略列表
  - [x] SubTask 4.2: 匹配策略后检查 runtime.enableWebhook，只有为 true 且 runtime.webhookId 非空时才发送 webhook 通知
  - [x] SubTask 4.3: 匹配策略后检查 runtime.enableSimulation，当信号方向为 long 时调用 SimulationService 执行模拟交易
  - [x] SubTask 4.4: NotificationsModule 导入 SimulationModule，注入 SimulationService

- [x] Task 5: 后端 - 策略触发模拟交易逻辑
  - [x] SubTask 5.1: SimulationService.TradeDto 新增 strategyId（可选）和 tradeSource 字段
  - [x] SubTask 5.2: executeTrade 买入时保存 strategyId 到 position 和 trade
  - [x] SubTask 5.3: 新增 executeStrategyTrade() 方法：获取管理员模拟账户、用策略的 stopLossPct/takeProfitPct 计算止盈止损价、调用 executeTrade（tradeSource='strategy', strategyId=策略ID）
  - [x] SubTask 5.4: ExecuteTradeDto 新增 strategyId 字段

- [x] Task 6: 后端 - 修复资金曲线
  - [x] SubTask 6.1: refreshPositionPrices 完成后调用 recordEquityCurve 记录资金曲线数据点（此时 currentPrice 已更新为实际市场价格）
  - [x] SubTask 6.2: 增加日志确认 recordEquityCurve 数据是否正确
  - [x] SubTask 6.3: 验证前端 equity-curve 接口返回数据格式是否与前端解析一致

- [x] Task 7: 前端 - 运行管理页面
  - [x] SubTask 7.1: 新增 /runtime 路由到 .umirc.ts
  - [x] SubTask 7.2: MainLayout.tsx 分析中心菜单组新增「运行管理」菜单项（图标 ThunderboltOutlined）
  - [x] SubTask 7.3: 创建 runtime/index.tsx 页面，调用 GET /strategies?enabled=true 获取已启用策略列表（含 runtime 字段）
  - [x] SubTask 7.4: 策略列表每行显示：策略名称、方向模式、绑定 Webhook（Select）、三个 Switch 开关
  - [x] SubTask 7.5: Webhook 通知 Switch 控制 enableWebhook
  - [x] SubTask 7.6: 模拟交易 Switch 控制 enableSimulation
  - [x] SubTask 7.7: 实盘交易 Switch 禁用，Tooltip 提示"暂未开放"
  - [x] SubTask 7.8: Switch/Webhook Select 切换时调用 PUT /strategies/:id/runtime 更新
  - [x] SubTask 7.9: Webhook 列表通过 GET /webhooks 获取

- [x] Task 8: 前端 - 模拟交易页面增加来源信息
  - [x] SubTask 8.1: 持仓列表新增「来源」列，tradeSource='strategy' 时显示"策略"标签，'manual' 时显示"手动"标签
  - [x] SubTask 8.2: 交易记录新增「来源」列，同上，增加 'system' 显示"系统"标签

- [x] Task 9: seed 文件更新
  - [x] SubTask 9.1: 更新 seed.ts，策略创建后同步创建 strategies_runtime 记录
  - [x] SubTask 9.2: 策略种子数据包含 runtime 配置（enableWebhook=true, enableSimulation=false, enableLiveTrading=false）

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 2, Task 5]
- [Task 5] depends on [Task 1]
- [Task 6] 独立，可与其他 Task 并行
- [Task 7] depends on [Task 3]（后端策略 runtime 接口需先就绪）
- [Task 8] depends on [Task 5]
- [Task 9] depends on [Task 1]
