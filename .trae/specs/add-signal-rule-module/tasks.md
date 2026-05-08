# Tasks

## 阶段一：数据库 Schema 变更

- [x] **Task 1**: 新增 signal_rules 表
  - [x] SubTask 1.1: 在 schema.ts 中新增 signal_rules 表（id, name, type, eventType, enabled, multiplier, threshold, enableSurprise, enableConfidence, description, createdAt, updatedAt）
  - [x] SubTask 1.2: 添加唯一约束（name）和索引（type, eventType, enabled）

- [x] **Task 2**: 重构 signals 表（向后兼容）
  - [x] SubTask 2.1: 保留旧字段（stockCode, stockName, direction, confidence, sentiment, reasoning, keyFactors, timeWindow, signalTime, newsId），改为 nullable
  - [x] SubTask 2.2: 新增字段（eventId, symbol, action, score, generatedAt, validFrom, validTo, reason, ruleId, ruleSnapshot, weight），均为 nullable
  - [x] SubTask 2.3: 添加外键约束（eventId 关联 events 表，ruleId 关联 signal_rules 表）
  - [x] SubTask 2.4: 更新索引

- [x] **Task 3**: 生成迁移文件
  - [x] SubTask 3.1: 使用 drizzle-kit generate 生成迁移文件

## 阶段二：后端信号规则模块

- [x] **Task 4**: SignalRuleModule 核心服务
  - [x] SubTask 4.1: 创建 SignalRuleService（CRUD：create, findById, findList, update, findByEventType, getGlobalRule）
  - [x] SubTask 4.2: 创建 SignalRuleModule 并注册到 AppModule

- [x] **Task 5**: 信号生成服务
  - [x] SubTask 5.1: 创建 SignalGeneratorService（generateSignalsFromEvent 方法）
  - [x] SubTask 5.2: 实现规则匹配逻辑（先 subcategory 后 category）
  - [x] SubTask 5.3: 实现分数计算逻辑（global_score, final_score）
  - [x] SubTask 5.4: 实现信号生成逻辑（为每个 stock subject 生成信号）

- [x] **Task 6**: 信号规则管理 API
  - [x] SubTask 6.1: 创建 SignalRulesController（GET /signal-rules, GET /signal-rules/:id, POST /signal-rules, PUT /signal-rules/:id）
  - [x] SubTask 6.2: 创建全局规则 API（GET /signal-rules/global, PUT /signal-rules/global）
  - [x] SubTask 6.3: 注册 SignalRulesController 到 AppModule

- [x] **Task 7**: 修改 SignalsService
  - [x] SubTask 7.1: 适配新的 signals 表结构
  - [x] SubTask 7.2: 新增 createSignalsBatch 方法

- [x] **Task 8**: 修改 EventAnalyzeConsumer
  - [x] SubTask 8.1: 事件保存后调用 SignalGeneratorService 生成信号

## 阶段三：前端信号规则模块

- [x] **Task 9**: 前端类型定义与 API 封装
  - [x] SubTask 9.1: 在 services/types.ts 中新增信号规则相关类型定义
  - [x] SubTask 9.2: 创建 services/signal-rules.ts 封装信号规则 API

- [x] **Task 10**: 信号规则管理页面
  - [x] SubTask 10.1: 创建信号规则管理页 /pages/signal-rules/index.tsx（全局规则区 + 规则表格）
  - [x] SubTask 10.2: 实现全局规则编辑功能
  - [x] SubTask 10.3: 实现规则新增/编辑/启用/禁用功能

- [x] **Task 11**: 菜单与路由配置
  - [x] SubTask 11.1: 在 .umirc.ts 中新增 /signal-rules 路由
  - [x] SubTask 11.2: 在 MainLayout.tsx 中新增「信号规则」菜单项

## 阶段四：Seed 与收尾

- [x] **Task 12**: Seed 文件更新
  - [x] SubTask 12.1: 在 seed.ts 中新增初始规则数据插入逻辑（幂等处理：全局规则 + 特定规则）

# Task Dependencies

```
Task 1 -> Task 3
Task 2 -> Task 3
Task 3 -> Task 4 -> Task 6
Task 4 -> Task 5
Task 5 -> Task 8
Task 7 -> Task 8
Task 6 -> Task 9
Task 9 -> Task 10
Task 10 -> Task 11
Task 12 可以并行
```

# 并行执行建议

- Task 1、Task 2 可以并行开发
- Task 3 依赖 Task 1/2
- Task 4、Task 7 可以并行（依赖 Task 3）
- Task 5 依赖 Task 4
- Task 6 依赖 Task 4
- Task 8 依赖 Task 5、Task 7
- Task 9-11 前端开发可以并行（依赖 Task 6 API 就绪）
- Task 12 可以并行
