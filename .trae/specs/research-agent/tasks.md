# 研究员 Agent 开发任务列表

---

## 任务依赖关系图

```
Task 1 (数据库) → Task 2 (Memory Service)
     ↓
Task 3 (Tools) → Task 6 (LangGraph Nodes)
     ↓
Task 4 (Agent Service) → Task 7 (API Controller)
     ↓
Task 5 (Agent Module) → Task 8 (前端页面)
```

---

## Task 1: 数据库 Schema 扩展
**优先级**: P0 (阻塞后续任务)
**描述**: 添加 chat_messages 表用于存储对话历史

- [ ] SubTask 1.1: 在 schema.ts 中定义 chatMessages 表
- [ ] SubTask 1.2: 生成数据库迁移文件
- [ ] SubTask 1.3: 执行数据库迁移

**验收标准**:
- chat_messages 表成功创建
- 包含所有必要字段和索引

---

## Task 2: Memory Service 实现
**优先级**: P0
**依赖**: Task 1
**描述**: 实现短期记忆和长期记忆的读写服务

- [ ] SubTask 2.1: 创建 `memory/memory.service.ts`
  - 实现 getRecentMessages(userId, sessionId, limit)
  - 实现 saveMessage(message)
  - 实现 getRelevantMemories(query, userId)
  - 实现 saveToVectorMemory(content, metadata)

- [ ] SubTask 2.2: 创建 `memory/pg-memory.repository.ts`
  - 封装 PostgreSQL 对话历史查询
  - 封装对话历史保存

- [ ] SubTask 2.3: 创建 `memory/vector-memory.service.ts`
  - 封装 ChromaDB 向量存储
  - 封装相似度搜索

**验收标准**:
- MemoryService 所有方法可正常调用
- 数据正确存储到 PostgreSQL 和 ChromaDB

---

## Task 3: Tools 实现
**优先级**: P0
**描述**: 实现 6 个投研工具

- [ ] SubTask 3.1: 创建 `tools/base.tool.ts`
  - 定义 Tool 基类和接口
  - 定义 ToolInputSchema 类型

- [ ] SubTask 3.2: 创建 `tools/news.tool.ts`
  - 实现 get_news_by_date_range
  - 实现 search_news_by_keyword

- [ ] SubTask 3.3: 创建 `tools/portfolio.tool.ts`
  - 实现 get_user_portfolio

- [ ] SubTask 3.4: 创建 `tools/signals.tool.ts`
  - 实现 get_signals_by_date_range

- [ ] SubTask 3.5: 创建 `tools/reports.tool.ts`
  - 实现 get_reports_by_stock

- [ ] SubTask 3.6: 创建 `tools/backtest.tool.ts`
  - 实现 get_backtest_by_stock

- [ ] SubTask 3.7: 创建 `tools/index.ts`
  - 导出所有工具
  - 提供工具注册表

**验收标准**:
- 所有工具可独立执行
- 工具返回格式统一
- 工具描述清晰，供 LLM 理解

---

## Task 4: LangGraph Nodes 实现
**优先级**: P0
**依赖**: Task 2, Task 3
**描述**: 实现 7 个 Graph 节点

- [ ] SubTask 4.1: 创建 `types/agent-state.ts`
  - 定义 AgentState 类型
  - 定义 Message 类型
  - 定义 Observation 类型

- [ ] SubTask 4.2: 创建 `nodes/memory-load.node.ts`
  - 实现 memoryLoadNode 函数
  - 加载 chatHistory 和 relevantMemories

- [ ] SubTask 4.3: 创建 `nodes/intent.node.ts`
  - 实现 intentNode 函数
  - 调用 LLM 识别用户意图

- [ ] SubTask 4.4: 创建 `nodes/planner.node.ts`
  - 实现 plannerNode 函数
  - 生成工具调用计划

- [ ] SubTask 4.5: 创建 `nodes/tool.node.ts`
  - 实现 toolNode 函数
  - 动态执行工具
  - 支持循环执行

- [ ] SubTask 4.6: 创建 `nodes/aggregator.node.ts`
  - 实现 aggregatorNode 函数
  - 整合 observations

- [ ] SubTask 4.7: 创建 `nodes/final.node.ts`
  - 实现 finalNode 函数
  - 生成最终回答
  - 遵循输出格式规范

- [ ] SubTask 4.8: 创建 `nodes/memory-save.node.ts`
  - 实现 memorySaveNode 函数
  - 保存对话和记忆

- [ ] SubTask 4.9: 创建 `nodes/index.ts`
  - 导出所有节点

**验收标准**:
- 每个节点都是纯函数
- 节点间 State 传递正确
- 节点可独立测试

---

## Task 5: Agent Graph 构建
**优先级**: P0
**依赖**: Task 4
**描述**: 使用 LangGraph 构建工作流

- [ ] SubTask 5.1: 创建 `graph/agent-graph.ts`
  - 使用 StateGraph 定义图结构
  - 添加所有节点
  - 定义边和条件边
  - 实现 toolNode 循环逻辑

- [ ] SubTask 5.2: 创建 `graph/graph-builder.ts`
  - 提供 Graph 构建工厂函数
  - 支持依赖注入

**验收标准**:
- Graph 可成功编译
- 流程执行符合设计
- toolNode 支持循环

---

## Task 6: Research Agent Service
**优先级**: P0
**依赖**: Task 5
**描述**: 封装 Agent 核心服务

- [ ] SubTask 6.1: 创建 `research-agent.service.ts`
  - 注入所有依赖服务
  - 实现 chat(userId, sessionId, message) 方法
  - 实现流式输出

- [ ] SubTask 6.2: 创建 `prompts/` 目录
  - 创建 system-prompt.ts
  - 创建 intent-prompt.ts
  - 创建 planner-prompt.ts
  - 创建 final-prompt.ts

**验收标准**:
- Service 可被 NestJS 注入
- chat 方法返回 AsyncIterable
- 支持完整对话流程

---

## Task 7: API Controller 实现
**优先级**: P0
**依赖**: Task 6
**描述**: 实现 REST API 端点

- [ ] SubTask 7.1: 创建 `agent.controller.ts`
  - 实现 POST /agent/chat 端点
  - 支持 SSE 流式响应
  - 实现会话管理 API

- [ ] SubTask 7.2: 创建 DTO 文件
  - 创建 chat-request.dto.ts
  - 创建 chat-response.dto.ts

**验收标准**:
- API 可正常访问
- SSE 流式输出正常
- 请求验证正确

---

## Task 8: Agent Module 封装
**优先级**: P0
**依赖**: Task 7
**描述**: NestJS 模块定义

- [ ] SubTask 8.1: 创建 `agent.module.ts`
  - 导入依赖模块
  - 注册 Providers
  - 导出服务

**验收标准**:
- Module 可被 AppModule 导入
- 无循环依赖

---

## Task 9: 前端聊天页面
**优先级**: P1
**依赖**: Task 8
**描述**: 实现 React 聊天界面

- [ ] SubTask 9.1: 安装 @ant-design/x
  - 添加依赖到 frontend/package.json

- [ ] SubTask 9.2: 创建 `pages/agent-chat/index.tsx`
  - 使用 XChat 组件
  - 实现消息列表显示
  - 实现输入框和发送

- [ ] SubTask 9.3: 创建 `pages/agent-chat/hooks/useAgentChat.ts`
  - 封装 SSE 连接逻辑
  - 处理流式消息
  - 管理会话状态

- [ ] SubTask 9.4: 创建 `pages/agent-chat/components/`
  - 创建 ToolCallPanel.tsx（工具调用显示）
  - 创建 SessionSidebar.tsx（会话列表）

- [ ] SubTask 9.5: 添加路由配置
  - 在 Umi 配置中添加 /agent-chat 路由

**验收标准**:
- 页面可正常访问
- 支持多轮对话
- 流式输出显示正常
- 工具调用可展开查看

---

## Task 10: 依赖安装和配置
**优先级**: P0
**描述**: 安装 LangChain 相关依赖

- [ ] SubTask 10.1: 安装后端依赖
  ```bash
  npm install @langchain/core @langchain/langgraph langchain zod
  ```

- [ ] SubTask 10.2: 添加环境变量配置
  - LANGCHAIN_API_KEY (可选)
  - AGENT_MODEL_NAME

**验收标准**:
- 依赖安装成功
- 应用可正常启动

---

## Task 11: 集成测试
**优先级**: P1
**依赖**: Task 8, Task 9
**描述**: 端到端测试

- [ ] SubTask 11.1: 测试对话流程
  - 测试单轮对话
  - 测试多轮对话
  - 测试记忆功能

- [ ] SubTask 11.2: 测试工具调用
  - 测试每个工具的调用
  - 验证数据准确性

- [ ] SubTask 11.3: 测试边界情况
  - 空输入处理
  - 错误处理
  - 超时处理

**验收标准**:
- 所有测试用例通过
- 无明显 Bug

---

# Task Dependencies

- Task 2 depends on Task 1
- Task 4 depends on Task 2, Task 3
- Task 5 depends on Task 4
- Task 6 depends on Task 5
- Task 7 depends on Task 6
- Task 8 depends on Task 7
- Task 9 depends on Task 8
- Task 11 depends on Task 8, Task 9
