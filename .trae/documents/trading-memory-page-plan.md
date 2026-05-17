# 交易经验（Trading Memory）页面实现计划

## 概述

在 AI 智能体菜单下新增"交易经验"子菜单，创建交易经验管理页面，包含经验统计卡片和经验列表，支持查看经验详情弹窗。为后续开发交易 Agent 做准备。

---

## 实现步骤

### 第一阶段：数据库层

#### 1. 在 schema.ts 中定义 trading_memories 表

在 [schema.ts](file:///c:/Users/yeung/Desktop/Project/a-signal/apps/backend/src/core/db/schema.ts) 中新增 `tradingMemories` 表，字段映射如下：

| 数据库列 | 类型 | 说明 |
|---|---|---|
| id | uuid (primaryKey, defaultRandom) | 主键 |
| type | varchar(50) | 经验类型：event_pattern / signal_pattern / strategy_pattern / market_regime_pattern / risk_pattern |
| title | varchar(500) | 标题 |
| summary | text | 摘要 |
| rationale | text (nullable) | 依据说明 |
| tags | jsonb (nullable) | 标签数组 `string[]` |
| pattern | jsonb (nullable) | 模式匹配条件对象 |
| stats | jsonb (nullable) | 统计数据对象 |
| confidence | decimal(5,4) (nullable) | 置信度 0~1 |
| status | varchar(20) (nullable) | 状态：testing / active / dormant / invalidated |
| firstObservedAt | timestamp with timezone (nullable) | 首次观察时间 |
| lastValidatedAt | timestamp with timezone (nullable) | 最近验证时间 |
| invalidatedAt | timestamp with timezone (nullable) | 失效时间 |
| lastComputedAt | timestamp with timezone (nullable) | 最近计算时间 |
| createdAt | timestamp with timezone (notNull, defaultNow) | 创建时间 |
| updatedAt | timestamp with timezone (notNull, defaultNow, onUpdate) | 更新时间 |

- `pattern` 列使用 `jsonb().$type<TradingMemoryPattern>()` 标注类型
- `stats` 列使用 `jsonb().$type<TradingMemoryStats>()` 标注类型
- `tags` 列使用 `jsonb().$type<string[]>()` 标注类型
- 所有字段默认 nullable（遵循数据库规则第 4 条）
- 导出 `TradingMemory` 和 `NewTradingMemory` 类型

#### 2. 生成数据库迁移

运行 `drizzle-kit generate` 生成迁移文件（遵循规则第 2 条，禁止 push）。

#### 3. 更新 seed.ts

在 [seed.ts](file:///c:/Users/yeung/Desktop/Project/a-signal/apps/backend/scripts/seed.ts) 中添加交易经验的种子数据（遵循规则第 10 条），插入几条示例经验数据用于开发和演示，采用"先查后插"模式。

---

### 第二阶段：后端 API 层

#### 4. 创建 TradingMemory Service

创建 `apps/backend/src/modules/trading-memory/trading-memory.service.ts`：

- `findList(query)` - 分页查询经验列表，支持按 type、status、关键词筛选
- `findById(id)` - 根据 ID 获取经验详情
- `getStats()` - 获取经验统计数据（总经验数、高置信经验、有用经验、已失效经验）
- 使用 DbService 注入，通过 Drizzle 查询构建器操作数据库

#### 5. 创建 TradingMemory Module

创建 `apps/backend/src/modules/trading-memory/trading-memory.module.ts`：

- imports: DbModule
- providers: TradingMemoryService
- exports: TradingMemoryService

#### 6. 创建 TradingMemory Controller + DTO

创建 `apps/backend/src/interfaces/admin/trading-memory/trading-memory.controller.ts`：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/trading-memory` | 分页查询经验列表 |
| GET | `/trading-memory/stats` | 获取经验统计 |
| GET | `/trading-memory/:id` | 获取经验详情 |

创建 DTO 目录 `apps/backend/src/interfaces/admin/trading-memory/dto/`：

- `trading-memory-list-query.dto.ts` - 列表查询参数（page, pageSize, type?, status?, keyword?）
- `index.ts` - 导出

#### 7. 注册到 AppModule

在 [app.module.ts](file:///c:/Users/yeung/Desktop/Project/a-signal/apps/backend/src/app.module.ts) 中：
- `imports` 添加 `TradingMemoryModule`
- `controllers` 添加 `TradingMemoryController`

---

### 第三阶段：前端页面层

#### 8. 添加前端类型定义

在 [types.ts](file:///c:/Users/yeung/Desktop/Project/a-signal/apps/frontend/src/services/types.ts) 中添加 `TradingMemory` 接口及相关类型（与用户提供的 interface 一致）。

#### 9. 创建前端 API 服务

创建 `apps/frontend/src/services/trading-memory.ts`：

```ts
export const tradingMemoryApi = {
  getList: (params?) => client.get('/trading-memory', { params }),
  getStats: () => client.get('/trading-memory/stats'),
  getById: (id) => client.get(`/trading-memory/${id}`),
};
```

#### 10. 创建交易经验页面

创建 `apps/frontend/src/pages/trading-memory/index.tsx`，页面结构：

**统计卡片区域**（4 张卡片，参考 dashboard.tsx 的 Statistic 组件模式）：
- 总经验数（蓝色，FileSearchOutlined 图标）
- 高置信经验（绿色，SafetyCertificateOutlined 图标，confidence >= 0.8）
- 有用经验（紫色，CheckCircleOutlined 图标，status = active）
- 已失效经验（红色，CloseCircleOutlined 图标，status = invalidated）

**筛选区域**：
- 类型筛选（Select：全部 / 事件模式 / 信号模式 / 策略模式 / 市场环境模式 / 风险模式）
- 状态筛选（Select：全部 / 测试中 / 活跃 / 休眠 / 已失效）
- 关键词搜索（Input.Search）

**经验列表**（Table 组件）：
| 列 | 说明 |
|---|---|
| 标题 | title 字段 |
| 类型 | type 字段，Tag 颜色区分 |
| 置信度 | confidence 字段，Progress 组件 |
| 胜率 | stats.winRate，百分比显示 |
| 平均收益 | stats.avgReturn，百分比显示，正绿负红 |
| 样本量 | stats.sampleSize |
| 状态 | status 字段，Badge 组件 |
| 最近验证 | lastValidatedAt |
| 操作 | "查看详情"按钮 |

**经验详情弹窗**（Modal 组件）：
- 基本信息区：标题、类型、状态、置信度、标签
- 模式匹配区：pattern 对象的各字段（事件类型、市场环境、策略ID、信号方向、分数范围）
- 统计数据区：stats 对象的各字段（样本量、平均收益、期望值、胜率、夏普比率、最大回撤、平均持有天数、盈亏因子、PnL标准差）
- 时间信息区：首次观察时间、最近验证时间、失效时间、最近计算时间
- 依据说明：rationale 字段

#### 11. 创建页面样式

创建 `apps/frontend/src/pages/trading-memory/index.module.scss`，参考现有页面的样式模式。

#### 12. 添加路由配置

在 [.umirc.ts](file:///c:/Users/yeung/Desktop/Project/a-signal/apps/frontend/.umirc.ts) 的 routes 中添加：

```ts
{ path: '/trading-memory', component: '@/pages/trading-memory/index', title: '交易经验' },
```

#### 13. 添加菜单项

在 [MainLayout.tsx](file:///c:/Users/yeung/Desktop/Project/a-signal/apps/frontend/src/layouts/MainLayout.tsx) 的 `MENU_ITEMS` 中，在 AI 智能体的 children 数组中添加：

```ts
{ key: '/trading-memory', icon: <BrainOutlined />, label: '交易经验' },
```

同时在 `pathToParentMap` 中添加 `/trading-memory` -> `/agent` 的映射。

---

## 文件变更清单

| 操作 | 文件路径 |
|---|---|
| 修改 | `apps/backend/src/core/db/schema.ts` - 新增 tradingMemories 表定义 |
| 新增 | `apps/backend/migrations/xxxx_add_trading_memories.sql` - 迁移文件（自动生成） |
| 修改 | `apps/backend/scripts/seed.ts` - 新增交易经验种子数据 |
| 新增 | `apps/backend/src/modules/trading-memory/trading-memory.service.ts` |
| 新增 | `apps/backend/src/modules/trading-memory/trading-memory.module.ts` |
| 新增 | `apps/backend/src/interfaces/admin/trading-memory/trading-memory.controller.ts` |
| 新增 | `apps/backend/src/interfaces/admin/trading-memory/dto/trading-memory-list-query.dto.ts` |
| 新增 | `apps/backend/src/interfaces/admin/trading-memory/dto/index.ts` |
| 修改 | `apps/backend/src/app.module.ts` - 注册 TradingMemoryModule 和 Controller |
| 修改 | `apps/frontend/src/services/types.ts` - 新增 TradingMemory 类型 |
| 新增 | `apps/frontend/src/services/trading-memory.ts` - API 服务 |
| 新增 | `apps/frontend/src/pages/trading-memory/index.tsx` - 页面组件 |
| 新增 | `apps/frontend/src/pages/trading-memory/index.module.scss` - 页面样式 |
| 修改 | `apps/frontend/.umirc.ts` - 新增路由 |
| 修改 | `apps/frontend/src/layouts/MainLayout.tsx` - 新增菜单项 |

---

## 注意事项

1. **数据库规则**：所有字段默认 nullable，禁止 NOT NULL 约束；通过 drizzle-kit generate 生成迁移，禁止 push
2. **向前兼容**：新增表和字段不影响现有功能
3. **API 认证**：参考现有 Agent 模块，Controller 方法添加 `@Public()` 装饰器
4. **经验统计接口**：`/trading-memory/stats` 返回 `{ total, highConfidence, active, invalidated }` 四个统计值，由后端聚合计算
5. **详情弹窗**：使用 Ant Design Modal 组件，宽度 720px，展示完整的经验信息
