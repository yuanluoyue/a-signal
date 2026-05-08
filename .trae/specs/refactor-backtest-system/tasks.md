# Tasks

- [x] Task 1: 数据库 schema 变更
  - [x] SubTask 1.1: 重构 backtestRecords 表定义（新增字段、旧字段改为 nullable、保留旧字段不删除）
  - [x] SubTask 1.2: 新增 backtestTrades 表定义
  - [x] SubTask 1.3: 运行 drizzle-kit generate 生成迁移文件

- [x] Task 2: 后端回测模块改造
  - [x] SubTask 2.1: 改造 DTO（新建 StrategyBacktestRequestDto、改造响应类型、新增查询交易明细 DTO）
  - [x] SubTask 2.2: 改造 BacktestModule，新增 StrategyModule 依赖
  - [x] SubTask 2.3: 改造 BacktestService（基于策略执行回测、保存交易明细到 backtest_trades、计算增强统计指标）
  - [x] SubTask 2.4: 改造 BacktestController（新增 GET records/:id/trades 接口、改造 POST 请求体）

- [x] Task 3: 前端回测页面改造
  - [x] SubTask 3.1: 更新 services/types.ts 中的回测相关类型定义
  - [x] SubTask 3.2: 更新 services/backtest.ts API 服务
  - [x] SubTask 3.3: 改造 pages/backtest/index.tsx（新增回测表单、改造列表列、改造详情展示）

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
