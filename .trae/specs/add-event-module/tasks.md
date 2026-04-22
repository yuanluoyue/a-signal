# Tasks

## 阶段一：数据库 Schema 与基础模块

- [x] **Task 1**: 数据库 Schema 变更
  - [x] SubTask 1.1: 在 schema.ts 中新增 events 表（所有字段、索引、类型导出）
  - [x] SubTask 1.2: 在 schema.ts 中为 signals 表新增 eventId 字段（nullable，外键关联 events 表）
  - [x] SubTask 1.3: 使用 drizzle-kit generate 生成迁移文件

- [x] **Task 2**: 队列常量扩展
  - [x] SubTask 2.1: 在 queue.constants.ts 中新增 EVENT_ANALYZE 队列名和延时配置

- [x] **Task 3**: VolcengineService 事件生成方法
  - [x] SubTask 3.1: 定义事件生成的 Zod Schema（EventSchema、NewsEventAnalysisSchema）
  - [x] SubTask 3.2: 实现 generateEventsFromNews 方法，包含完整的 Prompt 模板
  - [x] SubTask 3.3: 定义事件子分类枚举常量（EventSubcategoryEnum）

## 阶段二：后端事件模块开发

- [x] **Task 4**: EventModule 核心服务
  - [x] SubTask 4.1: 创建 EventService（CRUD：create、findById、findList、findByNewsId、updateProcessed）
  - [x] SubTask 4.2: 创建 EventModule 并注册到 AppModule

- [x] **Task 5**: 事件分析消费者
  - [x] SubTask 5.1: 创建 EventAnalyzeConsumer，处理新闻生成事件
  - [x] SubTask 5.2: 事件生成后触发下游信号生成（调用 SignalsService）
  - [x] SubTask 5.3: 注册 EventAnalyzeConsumer 到 AppModule providers

- [x] **Task 6**: 信号生成逻辑改造
  - [x] SubTask 6.1: 修改 SignalsService，新增基于事件生成信号的方法（createSignalFromEvent）
  - [x] SubTask 6.2: 修改 SignalsService.createSignal/SignalsService.createSignalsBatch，支持 eventId 字段
  - [x] SubTask 6.3: 修改 SignalAnalyzeConsumer，改为调用事件生成流程（新闻→事件→信号）

- [x] **Task 7**: 事件管理 API
  - [x] SubTask 7.1: 创建事件相关 DTO（EventsListQueryDto、EventDto）
  - [x] SubTask 7.2: 创建 EventController（GET /events、GET /events/:id、GET /events/:id/signals、GET /events/unprocessed）
  - [x] SubTask 7.3: 在 NewsController 中新增 POST /news/:id/generate-events 接口
  - [x] SubTask 7.4: 注册 EventController 到 AppModule

## 阶段三：前端事件模块开发

- [x] **Task 8**: 前端类型定义与 API 封装
  - [x] SubTask 8.1: 在 services/types.ts 中新增事件相关类型定义（Event、EventsListQueryParams 等）
  - [x] SubTask 8.2: 创建 services/events.ts 封装事件 API

- [x] **Task 9**: 事件管理页面
  - [x] SubTask 9.1: 创建事件列表页 /pages/events/index.tsx（表格展示、筛选、分页）
  - [x] SubTask 9.2: 创建事件详情页 /pages/events/[id].tsx（完整信息展示、关联信号列表）

- [x] **Task 10**: 菜单与路由配置
  - [x] SubTask 10.1: 在 .umirc.ts 中新增 /events 和 /events/:id 路由
  - [x] SubTask 10.2: 在 MainLayout.tsx 中新增「事件管理」菜单项（分析中心分组下）
  - [x] SubTask 10.3: 在 MainLayout.tsx 的 pathToParentMap 中新增 /events 映射

- [x] **Task 11**: 新闻详情页增强
  - [x] SubTask 11.1: 修改新闻详情页，新增关联事件展示区域

## 阶段四：Seed 与收尾

- [x] **Task 12**: Seed 文件更新
  - [x] SubTask 12.1: 在 scheduler.service.ts 中新增 event-analyze 默认定时任务

# Task Dependencies

```
Task 1 -> Task 4 -> Task 5 -> Task 6
Task 2 -> Task 5
Task 3 -> Task 5
Task 4 -> Task 7
Task 6 -> Task 5 (信号生成依赖事件生成)
Task 7 -> Task 8
Task 8 -> Task 9
Task 9 -> Task 10
Task 11 depends on Task 7 (需要事件 API)
Task 12 depends on Task 10 (菜单已确认)
```

# 并行执行建议

- Task 1、Task 2、Task 3 可以并行开发
- Task 4 依赖 Task 1，Task 5 依赖 Task 2/3/4
- Task 7 依赖 Task 4
- Task 8-10 前端开发可以并行（依赖 Task 7 API 就绪）
- Task 11、Task 12 可以并行
