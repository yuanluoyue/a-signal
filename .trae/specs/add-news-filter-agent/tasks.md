# Tasks

- [x] Task 1: 数据库 Schema 变更 — 新增 `news_filter_agent_configs` 和 `news_filter_agent_logs` 两张表
  - [x] SubTask 1.1: 在 `apps/backend/src/core/db/schema.ts` 中新增 `newsFilterAgentConfigs` 表定义（id, enabled, prompt, createdAt, updatedAt）
  - [x] SubTask 1.2: 在 `apps/backend/src/core/db/schema.ts` 中新增 `newsFilterAgentLogs` 表定义（id, newsId, newsTitle, decision, reasoning, confidence, createdAt）及索引
  - [x] SubTask 1.3: 运行 `drizzle-kit generate` 生成迁移文件

- [x] Task 2: 后端 News Filter Agent 模块开发
  - [x] SubTask 2.1: 创建 `apps/backend/src/modules/news-filter-agent/news-filter-agent.module.ts` 模块定义
  - [x] SubTask 2.2: 创建 `apps/backend/src/modules/news-filter-agent/news-filter-agent.service.ts`，实现核心方法：filterNews()、getConfig()、updateConfig()、getLogs()、getStats()
  - [x] SubTask 2.3: 在 `news-filter-agent.service.ts` 中实现默认 Prompt 模板和 Zod Schema（NewsFilterResultSchema）
  - [x] SubTask 2.4: 在 `app.module.ts` 中注册 NewsFilterAgentModule

- [x] Task 3: 后端 Controller 和 DTO 开发
  - [x] SubTask 3.1: 创建 `apps/backend/src/interfaces/admin/news-filter-agent/dto/` 目录，新增 NewsFilterAgentConfigUpdateDto 和 NewsFilterAgentLogQueryDto
  - [x] SubTask 3.2: 创建 `apps/backend/src/interfaces/admin/news-filter-agent/news-filter-agent.controller.ts`，实现 4 个端点（GET/PUT config, GET logs, GET stats）
  - [x] SubTask 3.3: 在 NewsFilterAgentModule 中注册 Controller

- [x] Task 4: 事件分析流程集成过滤 Agent
  - [x] SubTask 4.1: 修改 `apps/backend/src/jobs/event-analyze.consumer.ts`，在 extractEventsFromNews() 前插入过滤判断逻辑
  - [x] SubTask 4.2: 修改 `apps/backend/src/modules/news/news.service.ts` 的 updateAnalyzeStatus() 方法，支持 filtered 状态

- [x] Task 5: 前端新闻管理页面新增过滤 Agent 开关
  - [x] SubTask 5.1: 新增 `apps/frontend/src/services/news-filter-agent.ts` API 服务文件
  - [x] SubTask 5.2: 修改 `apps/frontend/src/pages/news/index.tsx`，在向量化进度卡片旁新增过滤 Agent 开关卡片
  - [x] SubTask 5.3: 在新闻管理页面的分析状态筛选中新增 `filtered` 选项，在状态列 Tag 中新增 `filtered` 的颜色映射

- [x] Task 6: 前端新闻过滤 Agent 页面开发
  - [x] SubTask 6.1: 创建 `apps/frontend/src/pages/news-filter-agent/index.tsx`，实现统计卡片行（今日过滤总数、通过数、跳过数、跳过率）
  - [x] SubTask 6.2: 实现 Prompt 编辑区域（TextArea + 保存按钮 + 恢复默认按钮 + {newsTitle} 校验）
  - [x] SubTask 6.3: 实现判断日志列表（Table + 筛选 + 分页 + 新闻标题点击跳转）

- [x] Task 7: 前端路由和菜单配置
  - [x] SubTask 7.1: 修改 `apps/frontend/.umirc.ts`，新增 `/news-filter-agent` 路由
  - [x] SubTask 7.2: 修改 `apps/frontend/src/layouts/MainLayout.tsx`，在 AI 智能体菜单下新增"新闻过滤 Agent"菜单项

- [x] Task 8: Seed 数据更新
  - [x] SubTask 8.1: 修改 `apps/backend/scripts/seed.ts`，新增 `news_filter_agent_configs` 默认配置种子数据

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 2]
- [Task 5] depends on [Task 3]
- [Task 6] depends on [Task 5] (API 服务文件)
- [Task 7] depends on [Task 6]
- [Task 8] depends on [Task 1]
