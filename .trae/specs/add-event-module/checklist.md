# Checklist

## 数据库设计

- [x] events 表结构正确
  - [x] 包含所有字段：id, newsId, detectedAt, occurredAt, category, subcategory, subjects, sentimentDirection, sentimentConfidence, sentimentRationale, importanceScore, importanceBenchmark, surpriseScore, surpriseBaseline, effectivePeriodStart, effectivePeriodEnd, effectiveDecayType, metrics, sourceUrl, sourceTitle, sourceSummary, sourcePublisher, version, processed, createdAt, updatedAt
  - [x] 有合适的索引（category, subcategory, occurredAt, processed, newsId）
  - [x] Drizzle 迁移文件生成成功

- [x] signals 表变更正确
  - [x] 新增 eventId 字段（nullable，外键关联 events 表）
  - [x] 旧数据不受影响（eventId 为 null）

## 后端事件模块

- [x] EventService 正确实现
  - [x] create 方法正确保存事件
  - [x] findById 方法正确返回事件详情
  - [x] findList 方法支持分页和筛选（category, subcategory, sentimentDirection, processed, 时间范围）
  - [x] findByNewsId 方法正确返回新闻关联事件
  - [x] updateProcessed 方法正确更新处理状态

- [x] VolcengineService 事件生成方法
  - [x] generateEventsFromNews 方法正确调用 LLM
  - [x] Zod Schema 验证事件输出格式
  - [x] Prompt 模板包含完整的事件提取指令
  - [x] 事件子分类枚举定义完整

- [x] EventAnalyzeConsumer 正确实现
  - [x] 从队列消费新闻分析任务
  - [x] 调用 LLM 生成事件
  - [x] 事件保存到数据库
  - [x] 触发下游信号生成

- [x] 信号生成逻辑改造
  - [x] SignalsService 新增基于事件生成信号的方法
  - [x] SignalAnalyzeConsumer 改为事件驱动流程
  - [x] 新生成的信号关联 eventId

## 后端 API

- [x] 事件管理 API
  - [x] GET /api/v1/events 列表接口正确（分页、筛选）
  - [x] GET /api/v1/events/:id 详情接口正确
  - [x] GET /api/v1/events/:id/signals 关联信号接口正确
  - [x] GET /api/v1/events/unprocessed 未处理事件接口正确
  - [x] POST /api/v1/news/:id/generate-events 手动生成事件接口正确

## 前端页面

- [x] 事件列表页 /events
  - [x] 表格展示正确（分类、子分类、情绪方向、重要性、关联标的、发生时间、处理状态）
  - [x] 筛选功能正常（分类、情绪方向、处理状态）
  - [x] 分页功能正常

- [x] 事件详情页 /events/:id
  - [x] 事件完整信息展示正确
  - [x] 关联信号列表展示正确
  - [x] 信号可跳转到信号详情

- [x] 菜单配置
  - [x] 「事件管理」菜单项在分析中心分组下
  - [x] 菜单图标使用 ThunderboltOutlined
  - [x] 路由跳转正常

- [x] 新闻详情页增强
  - [x] 关联事件展示区域正确
  - [x] 事件可跳转到事件详情

## 集成验证

- [x] 端到端流程测试
  - [x] 新闻 → 事件生成流程正常
  - [x] 事件 → 信号生成流程正常
  - [x] 手动生成事件功能正常
  - [x] 事件列表和详情页数据展示正确
  - [x] 新闻详情页关联事件展示正确
