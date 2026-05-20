# 新闻过滤 Agent Spec

## Why
当前系统对所有爬取的新闻都会进行事件分析，但很多新闻与金融市场无关（娱乐、体育、社会新闻等），浪费了 LLM 调用资源。通过实现一个新闻过滤 Agent，可以在分析前根据标题判断新闻是否值得深度分析，从而节省 LLM 成本并提高信号质量。

## What Changes
- 新增 `news_filter_agent_configs` 表，存储过滤 Agent 的全局配置（启用状态、Prompt 模板）
- 新增 `news_filter_agent_logs` 表，记录每次过滤判断的日志
- 新增 News Filter Agent 后端模块（Service + Controller）
- 修改事件分析消费者，在分析前插入过滤判断步骤
- 修改新闻手动分析接口，在分析前插入过滤判断步骤
- 新闻管理列表页新增过滤 Agent 开关卡片
- 新增新闻过滤 Agent 前端页面（统计卡片 + 判断日志列表 + Prompt 编辑器）
- 前端菜单和路由新增"新闻过滤 Agent"入口
- 新闻 `analyzeStatus` 新增 `filtered` 状态值
- seed 文件新增默认过滤 Agent 配置数据

## Impact
- Affected specs: 事件分析流程、新闻管理页面
- Affected code:
  - `apps/backend/src/core/db/schema.ts` — 新增 2 张表
  - `apps/backend/src/modules/news-filter-agent/` — 新增模块
  - `apps/backend/src/interfaces/admin/news-filter-agent/` — 新增控制器
  - `apps/backend/src/jobs/event-analyze.consumer.ts` — 插入过滤步骤
  - `apps/backend/src/modules/news/news.service.ts` — 手动分析插入过滤步骤
  - `apps/frontend/src/pages/news/index.tsx` — 新增开关卡片
  - `apps/frontend/src/pages/news-filter-agent/` — 新增页面
  - `apps/frontend/src/layouts/MainLayout.tsx` — 新增菜单项
  - `apps/frontend/.umirc.ts` — 新增路由
  - `apps/frontend/src/services/` — 新增 API 服务
  - `apps/backend/scripts/seed.ts` — 新增种子数据

## ADDED Requirements

### Requirement: news_filter_agent_configs 配置表
系统 SHALL 新增 `news_filter_agent_configs` 表，存储新闻过滤 Agent 的全局配置，全局仅一条记录。

#### Scenario: 配置表结构
- **GIVEN** `news_filter_agent_configs` 表包含以下字段：
  - `id` (uuid, PK)
  - `enabled` (boolean, nullable, default false) — 是否启用过滤 Agent
  - `prompt` (text, nullable) — 过滤 Prompt 模板，包含 `{newsTitle}` 占位符
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
- **THEN** 该表全局仅一条记录，通过 seed 初始化

### Requirement: news_filter_agent_logs 过滤日志表
系统 SHALL 新增 `news_filter_agent_logs` 表，记录每次过滤判断的结果。

#### Scenario: 日志表结构
- **GIVEN** `news_filter_agent_logs` 表包含以下字段：
  - `id` (uuid, PK)
  - `newsId` (uuid, nullable, FK → news.id) — 关联新闻
  - `newsTitle` (text, nullable) — 新闻标题快照
  - `decision` (varchar(20), nullable) — 判断结果：`analyze`（通过，继续分析）/ `skip`（跳过，不分析）
  - `reasoning` (text, nullable) — Agent 的推理过程
  - `confidence` (decimal(3,2), nullable) — 置信度 0~1
  - `createdAt` (timestamp)
- **THEN** 按 `(newsId)` 和 `(createdAt DESC)` 建索引

### Requirement: 新闻过滤 Agent Service
系统 SHALL 实现 `NewsFilterAgentService`，提供过滤判断、配置管理、日志查询等核心能力。

#### Scenario: 过滤判断流程
- **WHEN** 调用 `filterNews(newsId, newsTitle)` 方法
- **THEN** 查询 `news_filter_agent_configs` 获取当前配置
- **AND** 如果 `enabled = false`，直接返回 `{ decision: 'analyze' }`（不过滤）
- **AND** 如果 `enabled = true`，将 `prompt` 中的 `{newsTitle}` 替换为实际标题
- **AND** 调用 `LlmService.chatCompletion()` 进行 LLM 推理（module: `news-filter`, task: `filter`）
- **AND** 使用 Zod Schema 验证 LLM 输出结构：`{ decision: 'analyze' | 'skip', reasoning: string, confidence: number }`
- **AND** 将判断结果写入 `news_filter_agent_logs` 表
- **AND** 返回判断结果

#### Scenario: LLM 调用失败兜底
- **WHEN** LLM 调用失败或输出不符合 Schema
- **THEN** 记录错误日志
- **AND** 默认返回 `{ decision: 'analyze', reasoning: 'LLM 调用失败，默认通过', confidence: 0 }`
- **AND** 日志表中记录该兜底结果

#### Scenario: 默认 Prompt 模板
- **GIVEN** 系统内置默认 Prompt 模板：
```
你是一个金融新闻过滤器。你的任务是根据新闻标题判断这条新闻是否值得进行深度金融事件分析。

判断标准：
1. 新闻是否与金融市场、股票、经济政策相关
2. 新闻是否可能包含影响交易决策的信息
3. 新闻是否涉及上市公司、行业政策、宏观经济等

应该跳过（skip）的新闻类型：
- 纯娱乐、体育新闻
- 与金融市场无关的社会新闻
- 重复或无实质内容的新闻
- 广告或推广内容

应该通过（analyze）的新闻类型：
- 上市公司相关新闻（业绩、并购、重组等）
- 宏观经济政策新闻（利率、GDP、通胀等）
- 行业政策变化新闻
- 市场行情相关新闻
- 国际贸易、地缘政治对市场有影响的新闻

请根据新闻标题做出判断，返回 JSON 格式结果。

新闻标题：{newsTitle}
```

#### Scenario: 获取配置
- **WHEN** 调用 `getConfig()` 方法
- **THEN** 返回 `news_filter_agent_configs` 表中的唯一记录
- **AND** 如果不存在，返回默认配置（enabled: false, prompt: 默认模板）

#### Scenario: 更新配置
- **WHEN** 调用 `updateConfig(dto)` 方法
- **THEN** 更新 `news_filter_agent_configs` 表中的记录
- **AND** 如果记录不存在，先创建再更新

#### Scenario: 查询日志
- **WHEN** 调用 `getLogs(query)` 方法
- **THEN** 支持按 `decision` 筛选
- **AND** 支持分页（page, pageSize）
- **AND** 按 `createdAt DESC` 排序

#### Scenario: 查询统计
- **WHEN** 调用 `getStats()` 方法
- **THEN** 返回今日统计：
  - 今日过滤总数：当天 `news_filter_agent_logs` 记录总数
  - 通过数：当天 `decision = 'analyze'` 的记录数
  - 跳过数：当天 `decision = 'skip'` 的记录数
  - 跳过率：跳过数 / 总数 * 100%

### Requirement: 新闻过滤 Agent Controller
系统 SHALL 新增 `NewsFilterAgentController`，提供以下 API 端点。

#### Scenario: API 端点列表
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/news-filter-agent/config` | 获取过滤 Agent 配置 |
| PUT | `/news-filter-agent/config` | 更新过滤 Agent 配置 |
| GET | `/news-filter-agent/logs` | 获取过滤日志（分页+筛选） |
| GET | `/news-filter-agent/stats` | 获取今日统计 |

#### Scenario: 更新配置 DTO
- **GIVEN** `NewsFilterAgentConfigUpdateDto` 包含：
  - `enabled` (boolean, optional) — 启用状态
  - `prompt` (string, optional) — Prompt 模板，必须包含 `{newsTitle}` 占位符

#### Scenario: 日志查询 DTO
- **GIVEN** `NewsFilterAgentLogQueryDto` 包含：
  - `decision` (string, optional) — 按判断结果筛选
  - `page` (number, default 1) — 页码
  - `pageSize` (number, default 20) — 每页条数

### Requirement: 事件分析流程集成过滤 Agent
`EventAnalyzeConsumer.processMessage()` SHALL 在执行事件提取前，先调用过滤 Agent 判断。

#### Scenario: 过滤 Agent 启用时
- **WHEN** 事件分析消费者处理一条新闻
- **AND** `news_filter_agent_configs.enabled = true`
- **THEN** 在调用 `extractEventsFromNews()` 之前，先调用 `NewsFilterAgentService.filterNews()`
- **AND** 如果 `decision = 'skip'`，将新闻 `analyzeStatus` 更新为 `'filtered'`，跳过后续分析
- **AND** 如果 `decision = 'analyze'`，继续正常的事件提取流程

#### Scenario: 过滤 Agent 未启用时
- **WHEN** 事件分析消费者处理一条新闻
- **AND** `news_filter_agent_configs.enabled = false`
- **THEN** 跳过过滤步骤，直接执行事件提取流程

#### Scenario: 已分析或已过滤的新闻不重复过滤
- **WHEN** 新闻的 `analyzeStatus` 为 `'analyzed'` 或 `'filtered'`
- **THEN** 跳过该新闻，不执行过滤判断

### Requirement: 手动分析集成过滤 Agent
`NewsService.handleAnalyze()` SHALL 在手动触发分析时，同样先调用过滤 Agent 判断。

#### Scenario: 手动分析时过滤判断
- **WHEN** 用户通过 `POST /news/:id/analyze` 手动触发分析
- **AND** 过滤 Agent 已启用
- **THEN** 先调用 `NewsFilterAgentService.filterNews()`
- **AND** 如果 `decision = 'skip'`，返回提示"该新闻被过滤 Agent 判定为无需分析"
- **AND** 如果 `decision = 'analyze'`，继续正常分析流程

### Requirement: 新闻管理页面新增过滤 Agent 开关
新闻管理列表页 SHALL 新增一个过滤 Agent 状态卡片，包含启用/禁用开关。

#### Scenario: 开关卡片布局
- **WHEN** 用户访问新闻管理页面
- **THEN** 在向量化进度卡片旁边，新增一个"新闻过滤 Agent"卡片
- **AND** 卡片包含：标题"新闻过滤 Agent"、Switch 开关、当前状态描述

#### Scenario: 启用过滤 Agent
- **WHEN** 用户打开 Switch 开关
- **THEN** 调用 `PUT /news-filter-agent/config` 接口，设置 `enabled = true`
- **AND** 开关状态更新为开启
- **AND** 状态描述更新为"已启用，新闻将先经过 Agent 过滤"

#### Scenario: 禁用过滤 Agent
- **WHEN** 用户关闭 Switch 开关
- **THEN** 调用 `PUT /news-filter-agent/config` 接口，设置 `enabled = false`
- **AND** 开关状态更新为关闭
- **AND** 状态描述更新为"已禁用"

#### Scenario: 页面加载时获取开关状态
- **WHEN** 新闻管理页面加载
- **THEN** 调用 `GET /news-filter-agent/config` 获取当前配置
- **AND** Switch 开关状态与配置中的 `enabled` 字段同步

### Requirement: 新闻过滤 Agent 前端页面
系统 SHALL 新增新闻过滤 Agent 页面，路径 `/news-filter-agent`。

#### Scenario: 页面布局
- **WHEN** 用户访问 `/news-filter-agent`
- **THEN** 页面从上到下依次展示：统计卡片行、Prompt 编辑区域、判断日志列表

#### Scenario: 统计卡片
- **WHEN** 页面加载
- **THEN** 展示以下统计信息（基于今日数据）：
  - 今日过滤总数（蓝色，FilterOutlined）
  - 通过数（绿色，CheckCircleOutlined）
  - 跳过数（橙色，CloseCircleOutlined）
  - 跳过率（紫色，PercentageOutlined）

#### Scenario: Prompt 编辑区域
- **WHEN** 用户查看 Prompt 编辑区域
- **THEN** 展示一个 Card，标题为"过滤 Prompt"
- **AND** Card 内包含一个 TextArea（至少 6 行），显示当前 Prompt 内容
- **AND** Card 底部包含"保存"按钮和"恢复默认"按钮
- **AND** Prompt 中必须包含 `{newsTitle}` 占位符，保存时校验

#### Scenario: 保存 Prompt
- **WHEN** 用户编辑 Prompt 后点击"保存"
- **THEN** 校验 Prompt 中是否包含 `{newsTitle}` 占位符
- **AND** 如果不包含，提示"Prompt 必须包含 {newsTitle} 占位符"
- **AND** 如果包含，调用 `PUT /news-filter-agent/config` 保存
- **AND** 保存成功后显示成功提示

#### Scenario: 恢复默认 Prompt
- **WHEN** 用户点击"恢复默认"
- **THEN** 弹出确认弹窗"确定要恢复默认 Prompt 吗？"
- **AND** 确认后，TextArea 内容恢复为默认 Prompt
- **AND** 自动调用保存接口

#### Scenario: 判断日志列表
- **WHEN** 用户查看判断日志
- **THEN** 表格展示以下列：时间、新闻标题、判断结果、置信度、推理理由
- **AND** 判断结果列使用 Tag 组件：`analyze` 显示绿色"通过"，`skip` 显示橙色"跳过"
- **AND** 置信度列显示百分比
- **AND** 支持按判断结果筛选
- **AND** 支持分页

#### Scenario: 点击新闻标题跳转
- **WHEN** 用户点击日志中的新闻标题
- **THEN** 跳转到该新闻的详情页 `/news/:id`

### Requirement: analyzeStatus 新增 filtered 状态
新闻的 `analyzeStatus` 字段 SHALL 新增 `filtered` 状态值，表示被过滤 Agent 跳过。

#### Scenario: 新闻管理页面显示 filtered 状态
- **WHEN** 新闻的 `analyzeStatus = 'filtered'`
- **THEN** 在新闻管理列表的状态列显示橙色 Tag，文字为"已过滤"

#### Scenario: 分析状态筛选新增 filtered 选项
- **WHEN** 用户查看分析状态筛选下拉框
- **THEN** 下拉选项中新增"已过滤"选项（值为 `filtered`）

## MODIFIED Requirements

### Requirement: MainLayout 新增新闻过滤 Agent 菜单
AI 智能体菜单下 SHALL 新增"新闻过滤 Agent"子菜单项，路径 `/news-filter-agent`，图标使用 `FilterOutlined`。

### Requirement: seed 文件新增默认配置
seed 文件 SHALL 新增 `news_filter_agent_configs` 种子数据（默认 enabled: false, prompt: 默认模板）。

## REMOVED Requirements
无
