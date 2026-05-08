# 事件模块 Spec

## Why

当前系统由 LLM 直接从新闻生成交易信号，不确定性太大，信号质量难以控制。需要引入「事件」作为中间层，将流程改为：新闻 → 标准化事件 → 特征化 → 信号生成 → 回测验证。事件是结构化的、可审查的、可回测的中间产物，LLM 不再直接生成信号，而是生成事件，信号由下游引擎基于事件特征计算得出。

## What Changes

- 新增 `events` 数据库表，存储结构化事件数据
- 新增 EventModule 后端模块（Service + Controller + DTO）
- 新增事件分析消费者，替代现有信号分析消费者中的 LLM 调用逻辑
- 修改 VolcengineService，新增事件生成方法（从新闻提取事件）
- 新增事件相关队列 `EVENT_ANALYZE`
- 修改信号生成流程：信号由事件驱动生成，而非直接由新闻生成
- 新增事件管理前端页面（列表页 + 详情页）
- 新增事件管理菜单项
- 新增事件相关前端 API 封装和类型定义
- 修改新闻详情页，展示关联事件
- 修改信号表，增加 `eventId` 字段关联事件
- 修改 seed 文件，新增事件相关菜单数据

## Impact

- Affected specs: core-signal-pipeline（信号生成流程变更）
- Affected code:
  - `apps/backend/src/core/db/schema.ts` - 新增 events 表，修改 signals 表
  - `apps/backend/src/core/volcengine/volcengine.service.ts` - 新增事件生成方法
  - `apps/backend/src/core/queue/queue.constants.ts` - 新增 EVENT_ANALYZE 队列
  - `apps/backend/src/jobs/signal-analyze.consumer.ts` - 改为事件生成消费者
  - `apps/backend/src/modules/signals/signals.service.ts` - 信号由事件驱动生成
  - `apps/backend/src/modules/news/news.service.ts` - 新闻列表展示关联事件
  - `apps/backend/src/app.module.ts` - 注册 EventModule
  - `apps/backend/scripts/seed.ts` - 新增事件菜单数据
  - `apps/frontend/src/layouts/MainLayout.tsx` - 新增事件菜单
  - `apps/frontend/.umirc.ts` - 新增事件页面路由
  - `apps/frontend/src/services/types.ts` - 新增事件类型定义
  - `apps/frontend/src/pages/news/[id].tsx` - 展示关联事件

## ADDED Requirements

### Requirement 1: 事件数据库表

系统 SHALL 新增 `events` 表，字段如下：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | UUID，用于去重 |
| newsId | uuid nullable | 关联的新闻 ID |
| detectedAt | timestamp | 系统发现该事件的时间 |
| occurredAt | timestamp | 事件实际发生/公告的时间（核心用于回测防未来） |
| category | varchar(20) | macro / policy / company / market / sentiment |
| subcategory | varchar(50) | 子分类，如 earnings_forecast, shareholder_reduction |
| subjects | jsonb | 影响范围，数组对象 [{type, code, weight}] |
| sentimentDirection | integer | -1 利空 / 0 中性 / 1 利好 |
| sentimentConfidence | decimal | 0~1，LLM 判断的可信度 |
| sentimentRationale | varchar(50) | 简短理由，不超过 20 字 |
| importanceScore | decimal | 0~1，绝对重要性 |
| importanceBenchmark | varchar(30) nullable | global_daily / historical_similar |
| surpriseScore | decimal nullable | -1~1，负值不及预期，正值超预期 |
| surpriseBaseline | varchar(100) nullable | 预期基准描述 |
| effectivePeriodStart | timestamp | 生效时间戳 |
| effectivePeriodEnd | timestamp nullable | 预计影响结束时间戳 |
| effectiveDecayType | varchar(20) | step / linear / exponential |
| metrics | jsonb nullable | 量化特征值数组 [{name, value, unit, yoyChange}] |
| sourceUrl | text nullable | 原始链接 |
| sourceTitle | varchar(500) | 原始标题 |
| sourceSummary | text | 原文摘要 |
| sourcePublisher | varchar(100) | 发布者 |
| version | integer | Schema 版本 |
| processed | boolean | 是否已由下游信号引擎处理 |
| createdAt | timestamp | 创建时间 |
| updatedAt | timestamp | 更新时间 |

索引：category、subcategory、occurredAt、processed、newsId

### Requirement 2: 事件生成服务

系统 SHALL 提供 LLM 事件生成服务：

#### Scenario 2.1: 从新闻生成事件
- **GIVEN** 一条新闻内容
- **WHEN** 调用事件生成服务
- **THEN** LLM 分析新闻，输出结构化事件数据
- **AND** 事件数据符合 Event Schema 规范
- **AND** 一条新闻可生成 0-3 个事件

#### Scenario 2.2: 事件字段约束
- **GIVEN** LLM 生成事件
- **THEN** category 必须为预定义枚举值之一：macro / policy / company / market / sentiment
- **AND** subcategory 必须为预定义枚举值之一（如 earnings_forecast, shareholder_reduction, rate_decision 等）
- **AND** subjects 中每个元素的 type 必须为 stock / sector / index / commodity
- **AND** subjects 中每个元素的 weight 范围为 0~1
- **AND** sentimentDirection 必须为 -1 / 0 / 1
- **AND** sentimentConfidence 范围为 0~1
- **AND** sentimentRationale 不超过 20 字
- **AND** importanceScore 范围为 0~1
- **AND** effectiveDecayType 必须为 step / linear / exponential

### Requirement 3: 事件分析消费者

系统 SHALL 新增事件分析消费者，替代现有信号分析消费者中的 LLM 调用逻辑：

#### Scenario 3.1: 新闻分析生成事件
- **GIVEN** 新闻分析任务进入队列
- **WHEN** 消费者处理消息
- **THEN** 调用 LLM 从新闻提取事件
- **AND** 将事件保存到 events 表
- **AND** 更新新闻分析状态为 analyzed
- **AND** 触发下游信号生成流程

#### Scenario 3.2: 批量分析
- **GIVEN** 定时任务触发
- **WHEN** 批量分析最近两天未分析的新闻
- **THEN** 每个新闻分析任务进入 MQ
- **AND** 生成事件后自动触发信号生成

### Requirement 4: 事件驱动信号生成

系统 SHALL 基于事件生成信号，而非直接从新闻生成：

#### Scenario 4.1: 事件触发信号生成
- **GIVEN** 一个事件已创建且 processed = false
- **WHEN** 信号引擎处理该事件
- **THEN** 基于事件的特征（sentiment、importance、surprise、subjects）计算信号
- **AND** 生成的信号关联 eventId
- **AND** 更新事件 processed = true

#### Scenario 4.2: 信号表关联事件
- **GIVEN** 信号由事件生成
- **THEN** signals 表新增 eventId 字段
- **AND** eventId 为 nullable（兼容旧数据）

### Requirement 5: 事件管理 API

系统 SHALL 提供事件管理 REST API：

#### Scenario 5.1: 事件列表
- **WHEN** GET /api/v1/events
- **THEN** 返回事件列表，支持分页
- **AND** 支持按 category、subcategory、sentimentDirection、processed、时间范围筛选

#### Scenario 5.2: 事件详情
- **WHEN** GET /api/v1/events/:id
- **THEN** 返回事件完整信息
- **AND** 包含关联的信号列表

#### Scenario 5.3: 手动生成事件
- **WHEN** POST /api/v1/news/:id/generate-events
- **THEN** 手动触发该新闻的事件生成

#### Scenario 5.4: 事件关联信号
- **WHEN** GET /api/v1/events/:id/signals
- **THEN** 返回该事件关联的信号列表

#### Scenario 5.5: 未处理事件列表
- **WHEN** GET /api/v1/events/unprocessed
- **THEN** 返回所有 processed = false 的事件

### Requirement 6: 事件管理前端页面

系统 SHALL 提供事件管理前端页面：

#### Scenario 6.1: 事件列表页
- **WHEN** 用户点击「事件管理」菜单
- **THEN** 进入事件列表页 /events
- **AND** 展示字段：分类、子分类、情绪方向、重要性、关联标的、发生时间、处理状态
- **AND** 支持按分类、情绪方向、处理状态筛选
- **AND** 支持分页

#### Scenario 6.2: 事件详情页
- **WHEN** 用户点击事件查看详情
- **THEN** 进入事件详情页 /events/:id
- **AND** 展示事件完整信息（分类、情绪、重要性、意外度、影响范围、生效时间窗、量化特征、原始信息）
- **AND** 展示关联信号列表，可跳转信号详情

#### Scenario 6.3: 事件菜单
- **WHEN** 用户查看左侧菜单
- **THEN** 在「分析中心」分组下可见「事件管理」菜单项
- **AND** 图标使用 ThunderboltOutlined

#### Scenario 6.4: 新闻详情展示关联事件
- **WHEN** 用户查看新闻详情页
- **THEN** 展示该新闻关联的事件列表
- **AND** 点击事件可跳转到事件详情页

### Requirement 7: 事件子分类枚举

系统 SHALL 定义事件子分类枚举列表，LLM 生成事件时必须从中选择：

- **macro**: gdp, cpi, pmi, rate_decision, employment, trade_balance, fiscal_policy
- **policy**: industry_policy, regulatory_change, tax_policy, subsidy, environmental
- **company**: earnings_forecast, earnings_actual, shareholder_reduction, shareholder_increase, dividend, m_a, management_change, product_launch, litigation
- **market**: index_change, sector_rotation, volume_anomaly, margin_trading, institutional_activity
- **sentiment**: analyst_rating, media_sentiment, social_media_trend, fear_greed_index

## MODIFIED Requirements

### Requirement M1: 信号分析消费者改造

**修改内容**: SignalAnalyzeConsumer 改为先生成事件，再由事件驱动信号生成。原有直接从新闻生成信号的逻辑改为：新闻 → 事件 → 信号。

### Requirement M2: 信号表结构变更

**修改内容**: signals 表新增 eventId 字段（nullable），关联 events 表。旧数据 eventId 为 null，新数据由事件生成。

### Requirement M3: 新闻详情页增强

**修改内容**: 新闻详情页新增关联事件展示区域，与关联信号并列展示。

## REMOVED Requirements

无
