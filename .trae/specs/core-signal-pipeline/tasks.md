# Tasks

## 阶段一：数据库设计与基础模块搭建

- [x] **Task 1**: 数据库 Schema 设计与迁移
  - [x] SubTask 1.1: 创建 news 表（标题、内容、来源、分析状态、向量化状态、关联信号、发布时间、原始链接、唯一标识）
  - [x] SubTask 1.2: 创建 signals 表（新闻ID、股票代码、股票名称、方向、置信度、情绪、理由、关键因子、时间窗口、发生时间）
  - [x] SubTask 1.3: 创建 klines 表（股票代码、周期、时间、开盘、收盘、最高、最低、成交量）
  - [x] SubTask 1.4: 创建 webhooks 表（名称、URL、类型、置信度阈值、启用状态）
  - [x] SubTask 1.5: 创建 scheduler_tasks 表（任务名称、表达式、启用状态、最后执行时间）
  - [x] SubTask 1.6: 生成并执行 Drizzle 迁移

- [x] **Task 2**: RabbitMQ 队列模块搭建
  - [x] SubTask 2.1: 安装 @nestjs/microservices 和 amqp-connection-manager
  - [x] SubTask 2.2: 创建 QueueModule 模块
  - [x] SubTask 2.3: 实现队列生产者服务（支持延时消息）
  - [x] SubTask 2.4: 实现队列消费者基础类（支持串行消费）

- [x] **Task 3**: 火山引擎 LLM 服务封装
  - [x] SubTask 3.1: 创建 VolcengineModule 模块
  - [x] SubTask 3.2: 实现火山引擎 API 调用服务（DeepSeek-V3.2）
  - [x] SubTask 3.3: 实现结构化输出解析（Zod Schema）

## 阶段二：新闻采集与分析服务

- [x] **Task 4**: 新闻采集服务开发
  - [x] SubTask 4.1: 创建 NewsModule 模块
  - [x] SubTask 4.2: 实现东方财富列表页抓取（3页）
  - [x] SubTask 4.3: 实现新闻详情页内容抓取
  - [x] SubTask 4.4: 实现新闻去重逻辑（基于URL）
  - [x] SubTask 4.5: 实现抓取任务队列化（300ms延时，串行消费）

- [x] **Task 5**: 新闻分析服务开发
  - [x] SubTask 5.1: 创建 AI 分析服务（基于 news-analyze skill）
  - [x] SubTask 5.2: 实现 Prompt 模板（限制0-3个信号）
  - [x] SubTask 5.3: 实现信号解析与存储
  - [x] SubTask 5.4: 实现批量分析任务队列化
  - [x] SubTask 5.5: 实现分析状态更新

- [x] **Task 6**: 定时任务调度服务
  - [x] SubTask 6.1: 创建 SchedulerModule 模块
  - [x] SubTask 6.2: 集成 @nestjs/schedule
  - [x] SubTask 6.3: 实现晚上7点新闻抓取定时任务
  - [x] SubTask 6.4: 实现晚上8点新闻分析定时任务
  - [x] SubTask 6.5: 实现早上K线更新定时任务
  - [x] SubTask 6.6: 实现任务开关控制逻辑

## 阶段三：K线数据与通知服务

- [x] **Task 7**: K线数据服务开发
  - [x] SubTask 7.1: 创建 KlinesModule 模块
  - [x] SubTask 7.2: 实现新浪财经 K线 API 调用
  - [x] SubTask 7.3: 实现 1d 和 4h K线数据解析与存储
  - [x] SubTask 7.4: 实现 K线获取任务队列化（500ms延时）
  - [x] SubTask 7.5: 实现已有股票K线定时更新

- [x] **Task 8**: 通知服务开发
  - [x] SubTask 8.1: 创建 NotificationsModule 模块
  - [x] SubTask 8.2: 实现企业微信机器人 Webhook 发送
  - [x] SubTask 8.3: 实现置信度过滤逻辑
  - [x] SubTask 8.4: 实现新闻分析完成后的通知触发

## 阶段四：后端 API 开发

- [x] **Task 9**: 新闻管理 API
  - [x] SubTask 9.1: 实现 GET /api/v1/news 列表接口（分页、筛选）
  - [x] SubTask 9.2: 实现 GET /api/v1/news/:id 详情接口
  - [x] SubTask 9.3: 实现 POST /api/v1/news/:id/analyze 手动分析接口
  - [x] SubTask 9.4: 实现 GET /api/v1/news/:id/signals 获取关联信号接口

- [x] **Task 10**: 信号管理 API
  - [x] SubTask 10.1: 实现 GET /api/v1/signals 列表接口（分页、筛选）
  - [x] SubTask 10.2: 实现 GET /api/v1/signals/:id 详情接口
  - [x] SubTask 10.3: 实现 GET /api/v1/signals/:id/klines K线数据接口
  - [x] SubTask 10.4: 实现 POST /api/v1/signals/:id/fetch-klines 手动获取K线接口

- [x] **Task 11**: 通知设置 API
  - [x] SubTask 11.1: 实现 GET /api/v1/webhooks 列表接口
  - [x] SubTask 11.2: 实现 POST /api/v1/webhooks 创建接口
  - [x] SubTask 11.3: 实现 PUT /api/v1/webhooks/:id 更新接口
  - [x] SubTask 11.4: 实现 DELETE /api/v1/webhooks/:id 删除接口
  - [x] SubTask 11.5: 实现 POST /api/v1/webhooks/:id/test 测试接口

- [x] **Task 12**: 定时任务管理 API
  - [x] SubTask 12.1: 实现 GET /api/v1/scheduler-tasks 列表接口
  - [x] SubTask 12.2: 实现 PUT /api/v1/scheduler-tasks/:id/toggle 开关接口
  - [x] SubTask 12.3: 实现 POST /api/v1/scheduler-tasks/:id/trigger 手动触发接口

- [x] **Task 13**: 回测分析 API
  - [x] SubTask 13.1: 实现 POST /api/v1/backtest 回测接口
  - [x] SubTask 13.2: 实现回测计算逻辑（基于4h线）
  - [x] SubTask 13.3: 实现回测结果统计（收益率、胜率、最大回撤）

- [x] **Task 14**: 仪表盘 API
  - [x] SubTask 14.1: 实现 GET /api/v1/dashboard/stats 统计数据接口
  - [x] SubTask 14.2: 实现 GET /api/v1/dashboard/recent-signals 最近信号接口

## 阶段五：前端页面开发

- [x] **Task 15**: 前端依赖安装与配置
  - [x] SubTask 15.1: 安装 lightweight-charts
  - [x] SubTask 15.2: 更新菜单配置

- [x] **Task 16**: 新闻管理页面
  - [x] SubTask 16.1: 创建新闻列表页 /news
  - [x] SubTask 16.2: 实现标题截断和 hover 提示
  - [x] SubTask 16.3: 实现列表字段展示（来源、状态、关联股票等）
  - [x] SubTask 16.4: 实现查看和分析操作按钮
  - [x] SubTask 16.5: 创建新闻详情页 /news/:id
  - [x] SubTask 16.6: 实现详情页内容展示
  - [x] SubTask 16.7: 实现原始链接跳转按钮
  - [x] SubTask 16.8: 实现手动分析按钮
  - [x] SubTask 16.9: 实现关联信号展示和跳转

- [x] **Task 17**: 信号管理页面
  - [x] SubTask 17.1: 创建信号列表页 /signals
  - [x] SubTask 17.2: 实现列表筛选功能（时间、置信度、股票）
  - [x] SubTask 17.3: 创建信号详情页 /signals/:id
  - [x] SubTask 17.4: 使用 lightweight-charts 展示K线图
  - [x] SubTask 17.5: 在K线图中标记信号位置
  - [x] SubTask 17.6: 实现手动获取K线按钮

- [x] **Task 18**: 通知设置页面
  - [x] SubTask 18.1: 创建通知设置页 /settings/notifications
  - [x] SubTask 18.2: 实现 Webhook 列表展示
  - [x] SubTask 18.3: 实现添加 Webhook 表单
  - [x] SubTask 18.4: 实现置信度阈值配置
  - [x] SubTask 18.5: 实现测试和删除功能

- [x] **Task 19**: 定时任务管理页面
  - [x] SubTask 19.1: 创建定时任务管理页 /settings/scheduler
  - [x] SubTask 19.2: 实现任务列表展示
  - [x] SubTask 19.3: 实现任务开关控制
  - [x] SubTask 19.4: 实现手动触发按钮

- [x] **Task 20**: 回测分析页面
  - [x] SubTask 20.1: 创建回测分析页 /backtest
  - [x] SubTask 20.2: 实现时间范围筛选
  - [x] SubTask 20.3: 实现置信度范围筛选
  - [x] SubTask 20.4: 实现信号类型筛选
  - [x] SubTask 20.5: 实现止盈止损设置
  - [x] SubTask 20.6: 实现一键回测按钮
  - [x] SubTask 20.7: 展示回测结果（收益率、胜率、最大回撤）

- [x] **Task 21**: 仪表盘页面改造
  - [x] SubTask 21.1: 对接真实统计数据 API
  - [x] SubTask 21.2: 对接最近信号列表 API
  - [x] SubTask 21.3: 移除假数据

## 阶段六：API 封装与集成

- [x] **Task 22**: 前端 API 封装
  - [x] SubTask 22.1: 封装新闻相关 API
  - [x] SubTask 22.2: 封装信号相关 API
  - [x] SubTask 22.3: 封装设置相关 API
  - [x] SubTask 22.4: 封装回测相关 API
  - [x] SubTask 22.5: 封装仪表盘相关 API

# Task Dependencies

```
Task 1 -> Task 2 -> Task 3 -> Task 4 -> Task 5 -> Task 6
Task 2 -> Task 7
Task 3 -> Task 5
Task 5 -> Task 8
Task 5 -> Task 7

Task 1 -> Task 9 -> Task 10 -> Task 11 -> Task 12 -> Task 13 -> Task 14

Task 9 -> Task 16
Task 10 -> Task 17
Task 11 -> Task 18
Task 12 -> Task 19
Task 13 -> Task 20
Task 14 -> Task 21

Task 9-14 -> Task 22
```

# 并行执行建议

- Task 1、Task 2、Task 3 可以并行开发
- Task 4、Task 5 可以并行开发（依赖 Task 1-3）
- Task 6、Task 7、Task 8 可以并行开发（依赖前置任务）
- Task 9-14 API 开发可以并行（依赖数据库和基础服务）
- Task 15-21 前端页面可以并行开发（依赖对应 API）
