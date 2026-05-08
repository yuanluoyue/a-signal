# Tasks

- [x] Task 1: 数据库 schema 变更
  - [x] SubTask 1.1: strategies 表新增 webhookId 字段（uuid, nullable, 外键关联 webhooks.id）
  - [x] SubTask 1.2: webhooks 表 minScore/maxScore/minConfidence/maxConfidence 改为 nullable
  - [x] SubTask 1.3: 运行 drizzle-kit generate 生成迁移文件

- [x] Task 2: 后端通知逻辑改造
  - [x] SubTask 2.1: 改造 StrategyService，新增 findEnabledWithWebhook 方法
  - [x] SubTask 2.2: 改造 StrategyService，新增 filterSignalByStrategy 方法
  - [x] SubTask 2.3: 改造 NotificationsService，实现策略驱动的通知流程
  - [x] SubTask 2.4: 改造 WebhooksService，通知消息包含策略信息
  - [x] SubTask 2.5: 改造 SignalGeneratorService，调整通知调用方式（无需改动，通知逻辑内聚在 NotificationsService）

- [x] Task 3: 后端 DTO/Controller 改造
  - [x] SubTask 3.1: 改造 Strategy DTO（CreateStrategyDto/UpdateStrategyDto 新增 webhookId）
  - [x] SubTask 3.2: 改造 Webhook DTO（移除分数过滤字段）
  - [x] SubTask 3.3: 改造 Webhook Controller（webhook 详情返回绑定的策略列表）

- [x] Task 4: 前端页面改造
  - [x] SubTask 4.1: 更新 services/types.ts 中的 Webhook 和 Strategy 类型定义
  - [x] SubTask 4.2: 改造通知管理页面（webhook 表单移除分数过滤，显示绑定策略）
  - [x] SubTask 4.3: 改造策略管理页面（新增 webhook 绑定选择）

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 2] and [Task 3]
