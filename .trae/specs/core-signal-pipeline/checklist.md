# Checklist

## 数据库设计

- [x] news 表结构正确
  - [x] 包含 id、title、content、source、analyzeStatus、vectorizeStatus、publishTime、originalUrl、uniqueKey 字段
  - [x] 有合适的索引（uniqueKey、publishTime、analyzeStatus）
  - [x] Drizzle 迁移文件生成成功

- [x] signals 表结构正确
  - [x] 包含 id、newsId、stockCode、stockName、direction、confidence、sentiment、reasoning、keyFactors、timeWindow、signalTime 字段
  - [x] 外键关联 news 表
  - [x] 有合适的索引（newsId、stockCode、signalTime、confidence）

- [x] klines 表结构正确
  - [x] 包含 id、stockCode、period、timestamp、open、close、high、low、volume 字段
  - [x] 有合适的索引（stockCode、period、timestamp 联合唯一索引）

- [x] webhooks 表结构正确
  - [x] 包含 id、name、url、type、confidenceThreshold、enabled 字段

- [x] scheduler_tasks 表结构正确
  - [x] 包含 id、name、cronExpression、enabled、lastExecutedAt 字段

## 基础服务

- [x] RabbitMQ 队列模块
  - [x] QueueModule 正确创建
  - [x] 生产者服务支持延时消息
  - [x] 消费者支持串行消费
  - [x] 与 docker-compose 中的 RabbitMQ 连接正常

- [x] 火山引擎 LLM 服务
  - [x] VolcengineModule 正确创建
  - [x] 能正确调用 DeepSeek-V3.2 模型
  - [x] 结构化输出解析正确

## 新闻采集服务

- [x] 东方财富抓取
  - [x] 能正确抓取列表页（3页）
  - [x] 能正确解析详情页内容
  - [x] 新闻去重逻辑正确
  - [x] 队列分片处理正确（300ms延时，串行消费）

## 新闻分析服务

- [x] AI 分析服务
  - [x] Prompt 模板正确（限制0-3个信号）
  - [x] 信号解析与存储正确
  - [x] 分析状态更新正确
  - [x] 批量分析任务队列化正确

## 定时任务调度

- [x] 定时任务配置
  - [x] 晚上7点新闻抓取任务配置正确
  - [x] 晚上8点新闻分析任务配置正确
  - [x] 早上K线更新任务配置正确
  - [x] 任务开关控制逻辑正确

## K线数据服务

- [x] 新浪财经 K线获取
  - [x] 能正确调用新浪财经 API
  - [x] 1d 和 4h K线数据解析正确
  - [x] 数据存储正确
  - [x] 队列处理正确（500ms延时）

## 通知服务

- [x] 企业微信通知
  - [x] Webhook 发送正确
  - [x] 置信度过滤逻辑正确
  - [x] 新闻分析完成后自动触发通知

## 后端 API

- [x] 新闻管理 API
  - [x] GET /api/v1/news 列表接口正确（分页、筛选）
  - [x] GET /api/v1/news/:id 详情接口正确
  - [x] POST /api/v1/news/:id/analyze 手动分析接口正确
  - [x] GET /api/v1/news/:id/signals 关联信号接口正确

- [x] 信号管理 API
  - [x] GET /api/v1/signals 列表接口正确（分页、筛选）
  - [x] GET /api/v1/signals/:id 详情接口正确
  - [x] GET /api/v1/signals/:id/klines K线数据接口正确
  - [x] POST /api/v1/signals/:id/fetch-klines 手动获取K线接口正确

- [x] 通知设置 API
  - [x] GET /api/v1/webhooks 列表接口正确
  - [x] POST /api/v1/webhooks 创建接口正确
  - [x] PUT /api/v1/webhooks/:id 更新接口正确
  - [x] DELETE /api/v1/webhooks/:id 删除接口正确
  - [x] POST /api/v1/webhooks/:id/test 测试接口正确

- [x] 定时任务管理 API
  - [x] GET /api/v1/scheduler-tasks 列表接口正确
  - [x] PUT /api/v1/scheduler-tasks/:id/toggle 开关接口正确
  - [x] POST /api/v1/scheduler-tasks/:id/trigger 手动触发接口正确

- [x] 回测分析 API
  - [x] POST /api/v1/backtest 回测接口正确
  - [x] 回测计算逻辑正确（基于4h线）
  - [x] 回测结果统计正确（收益率、胜率、最大回撤）

- [x] 仪表盘 API
  - [x] GET /api/v1/dashboard/stats 统计数据接口正确
  - [x] GET /api/v1/dashboard/recent-signals 最近信号接口正确

## 前端页面

- [x] 菜单配置
  - [x] 左侧菜单新增"新闻"、"信号"、"回测"、"设置"选项

- [x] 新闻列表页 /news
  - [x] 标题截断显示（最多10字）
  - [x] hover 显示完整标题
  - [x] 列表字段展示正确（来源、分析状态、向量化状态、关联股票、发布时间）
  - [x] 查看和分析操作按钮可用

- [x] 新闻详情页 /news/:id
  - [x] 展示所有新闻属性
  - [x] 原始链接跳转按钮可用
  - [x] 手动分析按钮可用
  - [x] 关联信号展示并支持跳转

- [x] 信号列表页 /signals
  - [x] 列表展示正确
  - [x] 筛选功能正常（时间、置信度、股票）

- [x] 信号详情页 /signals/:id
  - [x] 信号信息展示正确
  - [x] lightweight-charts K线图展示正确
  - [x] 信号位置在K线图中正确标记
  - [x] 手动获取K线按钮可用

- [x] 通知设置页 /settings/notifications
  - [x] Webhook 列表展示正确
  - [x] 添加 Webhook 表单可用
  - [x] 置信度阈值配置可用
  - [x] 测试和删除功能可用

- [x] 定时任务管理页 /settings/scheduler
  - [x] 任务列表展示正确
  - [x] 任务开关控制可用
  - [x] 手动触发按钮可用

- [x] 回测分析页 /backtest
  - [x] 时间范围筛选可用
  - [x] 置信度范围筛选可用
  - [x] 信号类型筛选可用
  - [x] 止盈止损设置可用
  - [x] 一键回测按钮可用
  - [x] 回测结果展示正确（收益率、胜率、最大回撤）

- [x] 仪表盘页 /dashboard
  - [x] 展示真实统计数据
  - [x] 展示最近信号列表
  - [x] 无假数据

## 集成测试

- [x] 端到端流程测试
  - [x] 新闻抓取 -> 存储流程正常
  - [x] 新闻分析 -> 信号生成流程正常
  - [x] 信号生成 -> K线获取流程正常
  - [x] 信号生成 -> 通知发送流程正常
  - [x] 手动分析功能正常
  - [x] 手动获取K线功能正常
  - [x] 定时任务开关和手动触发正常
