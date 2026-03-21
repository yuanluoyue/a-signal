# 增强功能 v2 验收检查清单

## 数据库设计

### 模拟账户相关表
- [ ] simulation_accounts 表结构正确
  - [ ] 包含 id, userId, initialCapital, currentCapital, availableCash 字段
  - [ ] 包含 totalProfit, totalReturn 字段
  - [ ] 包含 createdAt, updatedAt 字段
  - [ ] 有合适的索引

- [ ] simulation_positions 表结构正确
  - [ ] 包含 id, accountId, stockCode, stockName 字段
  - [ ] 包含 quantity, avgCost, currentPrice 字段
  - [ ] 包含 marketValue, profit, return 字段
  - [ ] 外键关联 simulation_accounts 表

- [ ] simulation_trades 表结构正确
  - [ ] 包含 id, accountId, stockCode, stockName 字段
  - [ ] 包含 type, quantity, price, totalAmount 字段
  - [ ] 包含 profit, tradeTime 字段
  - [ ] 外键关联 simulation_accounts 表

### 黑名单表
- [ ] stock_blacklist 表结构正确
  - [ ] 包含 id, stockCode, stockName 字段
  - [ ] 包含 reason 字段
  - [ ] stockCode 有唯一索引

### 股票追踪表
- [ ] stock_trackings 表结构正确
  - [ ] 包含 id, stockCode, stockName 字段
  - [ ] 包含 status, totalNews 字段
  - [ ] 包含 createdAt, updatedAt 字段

### 回测记录表
- [ ] backtest_records 表结构正确
  - [ ] 包含 id, startTime, endTime 字段
  - [ ] 包含 minConfidence, maxConfidence 字段
  - [ ] 包含 directions, stopLoss, takeProfit 字段
  - [ ] 包含 totalTrades, winRate, totalReturn, maxDrawdown 字段
  - [ ] 包含 trades 详情 JSON 字段

### 表结构修改
- [ ] webhooks 表添加 minConfidence 和 maxConfidence 字段
- [ ] news 表 vectorizeStatus 支持 vectorizing 状态

---

## 后端 API 检查

### 新闻向量化 API
- [ ] POST /api/v1/news/:id/vectorize 接口正确
  - [ ] 单条新闻向量化功能正常
  - [ ] 状态更新为 vectorizing
  - [ ] 任务进入 MQ

- [ ] POST /api/v1/news/batch-vectorize 接口正确
  - [ ] 批量向量化所有待处理新闻
  - [ ] 进度统计准确

- [ ] GET /api/v1/news/vectorize-progress 接口正确
  - [ ] 返回 pending/vectorizing/vectorized/failed 数量统计

### 模拟账户 API
- [ ] GET /api/v1/simulation/account 接口正确
- [ ] POST /api/v1/simulation/account 接口正确
- [ ] PUT /api/v1/simulation/account 接口正确
- [ ] GET /api/v1/simulation/positions 接口正确
- [ ] POST /api/v1/simulation/trade 接口正确
  - [ ] 买入时更新持仓和资金
  - [ ] 卖出时计算盈亏
- [ ] GET /api/v1/simulation/trades 接口正确

### 股票查询 API
- [ ] GET /api/v1/stocks 接口正确
  - [ ] 过滤黑名单股票
  - [ ] 返回信号数量和最新信号时间
- [ ] GET /api/v1/stocks/:code 接口正确
- [ ] GET /api/v1/stocks/:code/signals 接口正确
- [ ] GET /api/v1/stocks/:code/klines 接口正确

### 黑名单 API
- [ ] GET /api/v1/blacklist 接口正确
- [ ] POST /api/v1/blacklist 接口正确
- [ ] DELETE /api/v1/blacklist/:id 接口正确

### 股票追踪 API
- [ ] GET /api/v1/stock-trackings 接口正确
- [ ] POST /api/v1/stock-trackings 接口正确
- [ ] GET /api/v1/stock-trackings/:id 接口正确
- [ ] POST /api/v1/stock-trackings/:id/fetch-news 接口正确
  - [ ] 使用 doubao-seed-2-0-lite-260215 模型
  - [ ] 启用联网搜索能力
  - [ ] 使用 LangChain 格式化输出
  - [ ] 新闻去重与存储正确
- [ ] POST /api/v1/stock-trackings/:id/generate-signals 接口正确
  - [ ] 复用现有信号生成逻辑
  - [ ] 非近期信号不发送 webhook
- [ ] POST /api/v1/stock-trackings/:id/backtest 接口正确
- [ ] GET /api/v1/stock-trackings/:id/backtest-result 接口正确
- [ ] POST /api/v1/stock-trackings/:id/generate-report 接口正确
  - [ ] 报告约 200 字
  - [ ] 结合历史新闻和回测结果

### 回测记录 API
- [ ] GET /api/v1/backtest/records 接口正确
- [ ] GET /api/v1/backtest/records/:id 接口正确
- [ ] 交易详情存储完整

### Dashboard API
- [ ] GET /api/v1/dashboard/stats 增加股票数量统计
- [ ] GET /api/v1/dashboard/stats 增加回测最高记录
- [ ] 移除活跃信号和待分析信号统计

---

## 前端页面检查

### 新闻向量化页面
- [ ] 新闻列表页有一键向量化按钮
- [ ] 显示向量化进度统计
- [ ] 单条新闻可向量化
- [ ] 向量化状态显示正确（包含 vectorizing 中间状态）

### 账户模拟页面
- [ ] /simulation 页面可访问
- [ ] 账户资金展示正确
- [ ] 持仓列表展示正确
- [ ] 模拟交易表单可用
- [ ] 交易记录列表展示正确

### 股票查询页面
- [ ] /stocks 列表页面可访问
- [ ] 展示股票代码、名称、信号数量、最新信号时间
- [ ] /stocks/:code 详情页面可访问
- [ ] K 线图展示正确
- [ ] 信号标记显示正确

### 黑名单页面
- [ ] /blacklist 页面可访问
- [ ] 黑名单列表展示正确
- [ ] 添加黑名单功能可用
- [ ] 移除黑名单功能可用

### 股票追踪页面
- [ ] /stock-trackings 列表页面可访问
- [ ] /stock-trackings/:id 详情页面可访问
- [ ] 创建追踪表单可用
- [ ] 历史新闻展示正确
- [ ] 一键生成信号按钮可用
- [ ] 回测功能按钮可用
- [ ] 研投报告展示正确

### 回测页面
- [ ] 回测记录列表展示
- [ ] 点击详情弹出交易详情弹窗
- [ ] 弹窗内展示每笔交易详情

### Dashboard 页面
- [ ] 股票数量统计显示
- [ ] 新闻数量统计显示
- [ ] 回测最高记录展示
- [ ] 活跃信号统计已移除
- [ ] 数据概览卡片已移除

### 菜单更新
- [ ] 左侧菜单添加"股票查询"
- [ ] 左侧菜单添加"账户模拟"
- [ ] 左侧菜单添加"黑名单"
- [ ] 左侧菜单添加"股票追踪"

---

## 功能优化检查

### 新闻功能优化
- [ ] 新闻列表页删除按钮已移除
- [ ] 新闻详情页顶部有操作按钮
- [ ] 新闻列表关联股票显示正确（显示信号关联的股票）

### 分页优化
- [ ] 后端所有分页接口默认 pageSize 为 10
- [ ] 前端所有分页组件默认 pageSize 为 10

### 通知设置优化
- [ ] Webhook 置信度阈值可选择范围
- [ ] 创建/编辑 Webhook 时支持设置范围
- [ ] 通知逻辑使用范围判断

### 表格按钮优化
- [ ] 所有表格操作按钮使用 size="small"

### 信号详情页优化
- [ ] 默认展示 4h K 线
- [ ] 4h K 线绘制买卖点标记

### 页面布局优化
- [ ] Header 固定不随内容滚动
- [ ] 菜单栏固定
- [ ] 内容区域独立滚动
- [ ] Header 颜色与菜单栏有区分

---

## 集成测试

### 新闻向量化流程
- [ ] 单条新闻向量化流程正常
- [ ] 批量向量化流程正常
- [ ] 进度统计准确
- [ ] 向量存储到 ChromaDB 正确

### 模拟交易流程
- [ ] 创建账户流程正常
- [ ] 买入交易流程正常
- [ ] 卖出交易流程正常
- [ ] 盈亏计算正确
- [ ] 交易记录保存正确

### 股票追踪流程
- [ ] 创建追踪流程正常
- [ ] 获取历史新闻流程正常
- [ ] 生成信号流程正常
- [ ] 回测流程正常
- [ ] 生成研投报告流程正常

### 黑名单流程
- [ ] 添加黑名单流程正常
- [ ] Webhook 过滤黑名单股票正常
- [ ] 股票列表过滤黑名单正常

---

## 性能检查

- [ ] 新闻列表加载速度 < 2s
- [ ] 股票列表加载速度 < 2s
- [ ] 回测执行速度可接受
- [ ] 页面切换流畅
