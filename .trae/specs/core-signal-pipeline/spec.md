# 核心链路：抓取新闻 -> 信号生成 -> 发送通知 迭代规范

## Why

A Signal 项目需要建立完整的新闻到信号的自动化链路，实现从新闻采集、AI分析生成交易信号、K线数据获取到通知推送的闭环。本期迭代重点开发核心链路功能，为后续量化回测和智能决策提供数据基础。

## What Changes

### 新增功能模块
1. **新闻管理模块** - 新闻列表页、新闻详情页
2. **新闻采集服务** - 东方财富财经导读定时抓取
3. **AI信号分析服务** - 基于火山引擎 DeepSeek-V3.2 的新闻分析
4. **通知设置模块** - Webhook配置页面
5. **信号管理模块** - 信号列表页、信号详情页（含K线图）
6. **K线数据服务** - 新浪财经数据获取
7. **定时任务管理** - 任务开关和手动触发
8. **回测分析页面** - 信号回测功能
9. **仪表盘数据对接** - 真实数据展示

### 数据库表变更
- 新增 `news` 表 - 存储新闻数据
- 新增 `signals` 表 - 存储交易信号
- 新增 `klines` 表 - 存储K线数据
- 新增 `webhooks` 表 - 存储通知配置
- 新增 `scheduler_tasks` 表 - 存储定时任务配置

### API变更
- 新增新闻相关 REST API
- 新增信号相关 REST API
- 新增K线相关 REST API
- 新增通知设置 REST API
- 新增定时任务管理 REST API

## Impact

### 受影响模块
- `apps/backend/src/news/` - 新闻采集、存储、查询
- `apps/backend/src/signals/` - 信号生成、存储、查询
- `apps/backend/src/klines/` - K线数据获取、存储
- `apps/backend/src/scheduler/` - 定时任务调度
- `apps/backend/src/queue/` - RabbitMQ 队列扩展
- `apps/backend/src/notifications/` - 通知服务
- `apps/frontend/src/pages/news/` - 新闻页面
- `apps/frontend/src/pages/signals/` - 信号页面
- `apps/frontend/src/pages/settings/` - 设置页面
- `apps/frontend/src/pages/backtest/` - 回测页面
- `apps/frontend/src/pages/dashboard.tsx` - 仪表盘改造

## ADDED Requirements

### Requirement 1: 新闻管理功能

#### Scenario 1.1: 新闻列表展示
- **WHEN** 用户点击左侧"新闻"菜单
- **THEN** 进入新闻列表页，展示新闻数据
- **AND** 列表字段包括：标题（最多10字，hover显示完整）、来源、分析状态、向量化状态、关联股票、新闻发布时间、操作
- **AND** 操作按钮包括：查看、分析

#### Scenario 1.2: 新闻详情查看
- **WHEN** 用户点击"查看"按钮
- **THEN** 进入新闻详情页
- **AND** 展示新闻所有属性：标题、内容、来源、分析状态、向量化状态、关联信号、新闻发布时间、原始链接
- **AND** 提供"查看原始链接"按钮，点击可跳转
- **AND** 提供"手动分析"按钮，点击触发信号分析

#### Scenario 1.3: 新闻关联信号展示
- **WHEN** 用户查看新闻详情
- **THEN** 展示该新闻关联的所有交易信号
- **AND** 点击信号可跳转到信号详情页

### Requirement 2: 新闻采集定时任务

#### Scenario 2.1: 定时抓取配置
- **GIVEN** 系统配置了定时任务
- **WHEN** 每天晚上 7 点
- **THEN** 自动抓取东方财富财经导读前3页新闻
- **AND** 列表页URL: `https://finance.eastmoney.com/a/ccjdd_{page}.html`

#### Scenario 2.2: 新闻抓取流程
- **GIVEN** 抓取任务启动
- **THEN** 先获取列表页，解析新闻链接
- **AND** 进入每个详情页获取完整新闻内容
- **AND** 新闻去重：基于URL或标题+时间进行唯一性判断
- **AND** 已保存的新闻不重复保存

#### Scenario 2.3: 队列分片处理
- **GIVEN** 新闻抓取任务
- **THEN** 每个新闻请求任务分片进入 MQ
- **AND** 每个请求任务延时 300ms
- **AND** 每次只能消费一个任务（串行处理）

### Requirement 3: AI信号分析服务

#### Scenario 3.1: 批量分析定时任务
- **GIVEN** 系统配置了定时任务
- **WHEN** 每天晚上 8 点
- **THEN** 批量分析最近两天未分析的新闻
- **AND** 每个新闻分析任务进入 MQ

#### Scenario 3.2: 新闻分析调用
- **GIVEN** 新闻分析任务
- **THEN** 调用火山引擎 DeepSeek-V3.2 模型
- **AND** API Key 从环境变量 `VOLCENGINE_API_KEY` 获取
- **AND** 分析输出结构化交易信号

#### Scenario 3.3: 信号输出规范
- **GIVEN** 新闻分析完成
- **THEN** 生成 0-3 个信号（需在Prompt中限制）
- **AND** 信号发生时间取新闻播报时间，精确到小时
- **AND** 信号包含字段：
  - direction: buy/sell/hold/neutral
  - stockCode: 股票代码
  - stockName: 股票名称
  - confidence: 置信度(0-100)
  - sentiment: positive/negative/neutral
  - reasoning: 分析理由
  - keyFactors: 关键因子数组
  - timeWindow: 信号有效期

#### Scenario 3.4: 手动分析
- **WHEN** 用户在新闻详情页点击"手动分析"
- **THEN** 立即对该新闻进行信号分析
- **AND** 分析结果实时展示

### Requirement 4: 通知设置功能

#### Scenario 4.1: Webhook配置
- **WHEN** 用户进入通知设置页面
- **THEN** 可配置多个 Webhook
- **AND** 当前支持企业微信机器人
- **AND** 每个 Webhook 可配置置信度过滤阈值

#### Scenario 4.2: 通知触发
- **GIVEN** 新闻分析完成
- **WHEN** 新闻是最近两天发布的
- **THEN** 发送 Webhook 通知
- **AND** 只发送置信度超过阈值的通知

### Requirement 5: K线数据服务

#### Scenario 5.1: 信号触发K线获取
- **GIVEN** 信号分析完成
- **THEN** 从新浪财经获取对应股票K线数据
- **AND** API: `https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData`
- **AND** 保存 1d 和 4h 两种周期的K线数据

#### Scenario 5.2: K线任务队列
- **GIVEN** K线获取任务
- **THEN** 任务加入 MQ
- **AND** 每次请求延时 500ms

#### Scenario 5.3: 手动获取K线
- **WHEN** 用户在信号详情页点击"获取K线"
- **THEN** 手动触发该信号对应股票的K线获取

#### Scenario 5.4: 定时更新K线
- **GIVEN** 系统配置了定时任务
- **WHEN** 每天早上
- **THEN** 更新已有股票的K线数据

### Requirement 6: 信号管理功能

#### Scenario 6.1: 信号列表展示
- **WHEN** 用户进入信号列表页
- **THEN** 展示所有交易信号
- **AND** 支持按时间、置信度、股票筛选

#### Scenario 6.2: 信号详情展示
- **WHEN** 用户进入信号详情页
- **THEN** 展示信号完整信息
- **AND** 使用 lightweight-charts 展示K线图
- **AND** 在K线图中标记信号发生位置

### Requirement 7: 定时任务管理

#### Scenario 7.1: 任务开关控制
- **WHEN** 用户进入定时任务管理页面
- **THEN** 展示所有定时任务列表
- **AND** 可控制每个任务的启用/禁用状态

#### Scenario 7.2: 手动触发任务
- **WHEN** 用户点击"手动执行"按钮
- **THEN** 立即触发对应定时任务

### Requirement 8: 回测分析功能

#### Scenario 8.1: 回测条件设置
- **WHEN** 用户进入回测分析页面
- **THEN** 可设置筛选条件：
  - 时间范围
  - 置信度范围
  - 信号类型
  - 止盈止损比例

#### Scenario 8.2: 一键回测
- **WHEN** 用户点击"开始回测"
- **THEN** 使用 4小时线进行回测计算
- **AND** 展示回测结果：收益率、胜率、最大回撤等

### Requirement 9: 仪表盘数据对接

#### Scenario 9.1: 真实数据展示
- **WHEN** 用户进入仪表盘
- **THEN** 展示真实统计数据：
  - 新闻总数、今日新增
  - 信号总数、今日新增
  - 持仓数量
  - 最近信号列表

## MODIFIED Requirements

### Requirement M1: 左侧菜单扩展
**修改内容**: 在现有菜单基础上新增"新闻"、"信号"、"回测"、"设置"菜单项

### Requirement M2: 数据库Schema扩展
**修改内容**: 在现有 users 表基础上，新增 news、signals、klines、webhooks、scheduler_tasks 表

## REMOVED Requirements

无
