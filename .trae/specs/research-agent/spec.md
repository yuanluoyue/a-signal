# 研究员 Agent（Research Agent）规格文档

## 变更标识

* **change-id**: research-agent

* **类型**: 新功能开发

* **优先级**: 高

***

## Why

当前系统缺乏一个智能的投研分析助手，用户需要手动查询新闻、持仓、信号、回测等数据。通过实现一个基于 LangGraph 的研究员 Agent，可以提供：

1. **多轮对话能力**: 支持上下文感知的连续对话
2. **智能工具调用**: 自动识别用户意图并调用相应工具
3. **记忆能力**: 短期记忆（对话历史）+ 长期记忆（向量检索）
4. **专业分析输出**: 标准化的投资分析结论格式

***

## What Changes

### 新增模块

1. **Agent Module** - NestJS 模块封装
2. **Memory 系统** - PostgreSQL + ChromaDB 双存储
3. **LangGraph 工作流** - 7 个核心节点
4. **Tools 集合** - 6 个投研工具
5. **API 接口** - `/agent/chat` 端点
6. **前端聊天页面** - `/agent-chat` 路由

### 数据库变更

* 新增 `chat_messages` 表（存储对话历史）

* 新增 `agent_memory` 表（存储长期记忆元数据）

### 依赖变更

新增依赖：

* `@langchain/core` - LangChain 核心

* `@langchain/langgraph` - LangGraph 工作流

* `langchain` - LangChain 框架

***

## Impact

### 受影响的能力

* 用户交互体验（新增聊天界面）

* 数据查询方式（支持自然语言查询）

* 投研分析效率（自动化分析流程）

### 受影响的代码

* 后端：`apps/backend/src/agent/`（新增）

* 后端：`apps/backend/src/database/schema.ts`（扩展）

* 前端：`apps/frontend/src/pages/agent-chat/`（新增）

***

## ADDED Requirements

### Requirement 1: LangGraph State 设计

```typescript
type AgentState = {
  // 输入
  userInput: string;
  userId: string;
  sessionId: string;

  // Memory 注入
  chatHistory: Message[];
  relevantMemories: string[];

  // 推理过程
  intent?: 'portfolio_analysis' | 'news_analysis' | 'signal_analysis' | 'backtest_analysis' | 'report_analysis' | 'general_chat';
  plan?: string[];
  currentStep: number;

  // Tool 执行
  observations: Observation[];

  // 输出
  finalAnswer?: string;
};
```

#### Scenario: State 流转

* **WHEN** 用户发送消息

* **THEN** State 在节点间流转，每个节点修改特定字段

* **AND** 最终输出包含完整推理过程和答案

***

### Requirement 2: Graph 节点实现

必须实现以下 7 个节点，每个节点为独立函数：

| 节点               | 职责          | 输入                           | 输出                            |
| ---------------- | ----------- | ---------------------------- | ----------------------------- |
| `memoryLoadNode` | 加载短期记忆和长期记忆 | userId, sessionId            | chatHistory, relevantMemories |
| `intentNode`     | 识别用户意图      | userInput, chatHistory       | intent                        |
| `plannerNode`    | 生成工具调用计划    | intent, userInput            | plan                          |
| `toolNode`       | 执行工具        | plan\[currentStep]           | observation                   |
| `aggregatorNode` | 整合观察结果      | observations                 | aggregatedContext             |
| `finalNode`      | 生成最终回答      | aggregatedContext, userInput | finalAnswer                   |
| `memorySaveNode` | 保存对话和记忆     | finalAnswer                  | -                             |

#### Scenario: 节点执行流程

* **WHEN** 流程开始

* **THEN** 按顺序执行: memoryLoadNode → intentNode → plannerNode → toolNode → aggregatorNode → finalNode → memorySaveNode

* **AND** toolNode 支持循环执行直到 plan 完成

***

### Requirement 3: Memory 系统设计

#### 3.1 短期记忆（PostgreSQL）

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  role ENUM('user', 'assistant', 'tool') NOT NULL,
  content TEXT NOT NULL,
  tool_name VARCHAR(100),
  tool_input JSONB,
  tool_output JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_user_session ON chat_messages(user_id, session_id, created_at DESC);
```

#### 3.2 长期记忆（ChromaDB）

Collection: `agent_memories`

Metadata 结构：

```typescript
{
  userId: string;
  sessionId: string;
  type: 'analysis' | 'qa' | 'summary';
  topic: string;
  createdAt: string;
}
```

#### Scenario: Memory 加载

* **WHEN** 用户发送消息

* **THEN** 查询最近 15 条 chatHistory

* **AND** 使用 userInput 进行向量相似度搜索，获取 top 5 relevantMemories

#### Scenario: Memory 保存

* **WHEN** 生成最终回答后

* **THEN** 保存 user 和 assistant 消息到 PostgreSQL

* **AND** 如果回答质量高（长度>100），存入 ChromaDB

***

### Requirement 4: Tools 实现

每个 Tool 必须包含：name, description, inputSchema(zod), execute()

| Tool                        | 数据源        | 功能        |
| --------------------------- | ---------- | --------- |
| `get_news_by_date_range`    | PostgreSQL | 按日期范围查询新闻 |
| `search_news_by_keyword`    | ChromaDB   | 向量搜索相关新闻  |
| `get_user_portfolio`        | PostgreSQL | 获取用户模拟持仓  |
| `get_signals_by_date_range` | PostgreSQL | 按日期范围查询信号 |
| `get_reports_by_stock`      | PostgreSQL | 获取股票研投报告  |
| `get_backtest_by_stock`     | PostgreSQL | 获取股票回测记录  |

#### Scenario: Tool 调用

* **WHEN** plannerNode 生成计划

* **THEN** toolNode 根据 plan 动态调用对应 tool

* **AND** 将结果存入 observations

***

### Requirement 5: Agent 行为规则

1. **数据真实性**: 必须优先使用 tools 获取数据，禁止编造
2. **分析规范**: 涉及投资分析必须调用 tool
3. **风险提示**: 不允许直接给出确定性买卖建议
4. **输出格式**: 必须遵循标准格式

#### Scenario: 投资分析请求

* **WHEN** 用户询问 "分析我的持仓"

* **THEN** 调用 get\_user\_portfolio 工具

* **AND** 基于真实数据生成分析

* **AND** 输出包含【结论】【理由】【风险】【数据来源】

***

### Requirement 6: 输出格式规范

所有投资相关回答必须包含以下四部分：

```
【结论】
简要总结分析结论

【理由】
详细说明分析依据

【风险】
提示潜在风险因素

【数据来源】
列出使用的数据来源
```

***

### Requirement 7: API 设计

#### POST /agent/chat

Request:

```json
{
  "userId": "string",
  "sessionId": "string (optional)",
  "message": "string"
}
```

Response (SSE 流式):

```
event: thinking
data: {"node": "intentNode", "intent": "portfolio_analysis"}

event: tool
data: {"tool": "get_user_portfolio", "input": {...}}

event: answer
data: {"chunk": "【结论】..."}

event: done
data: {}
```

***

### Requirement 8: 前端页面

路径: `/agent-chat`

功能：

* 聊天界面（使用 @ant-design/x 的 XChat 组件）

* 支持流式输出显示

* 显示工具调用过程（可折叠）

* 会话管理（新建会话、历史会话列表）

***

## MODIFIED Requirements

### Requirement: 数据库 Schema 扩展

在 `apps/backend/src/database/schema.ts` 中新增：

```typescript
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    sessionId: varchar('session_id', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull(), // user, assistant, tool
    content: text('content').notNull(),
    toolName: varchar('tool_name', { length: 100 }),
    toolInput: jsonb('tool_input'),
    toolOutput: jsonb('tool_output'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('chat_messages_user_session_idx').on(table.userId, table.sessionId),
    index('chat_messages_created_at_idx').on(table.createdAt),
  ],
);
```

***

## Implementation Constraints

1. **Node 独立性**: 每个 node 必须是纯函数，无副作用
2. **Tool 动态执行**: toolNode 必须支持根据 plan 动态调用
3. **Service 隔离**: Node 内禁止直接操作数据库，必须通过 service
4. **Async/Await**: 所有异步操作必须使用 async/await
5. **可运行代码**: 禁止伪代码，必须是可执行的 TypeScript

***

## Future Enhancements (预留)

1. **Memory 压缩**: 超过 20 条消息自动总结
2. **Tool 调用日志**: 记录工具调用历史
3. **多 Agent 扩展**: 支持研究 Agent、交易 Agent 等分工

