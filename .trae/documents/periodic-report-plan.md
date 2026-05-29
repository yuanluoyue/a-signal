# 定期报告功能实施计划

## 需求概述

基于现有项目改造，新增定期报告功能：
- **定时任务**：每天晚上 6 点生成日报，每周六上午 10 点生成周报
- **定期报告页面**：查看所有报告
- **Webhook 推送**：报告可通过 Webhook 配置发送
- **报告内容**：活跃策略胜率、交易 Agent 胜率、交易笔数、盈利情况、交易信号数量

---

## 一、数据库变更

### 1.1 新增 `periodic_reports` 表

在 [schema.ts](file:///c:/Users/yeung/Desktop/Project/a-signal/apps/backend/src/core/db/schema.ts) 中新增：

```typescript
export const periodicReports = pgTable('periodic_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 20 }).notNull(),           // 'daily' | 'weekly'
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  content: jsonb('content').$type<PeriodicReportContent>().notNull(),
  summary: text('summary'),                                   // markdown 格式摘要，用于 webhook 推送
  status: varchar('status', { length: 20 }).notNull().default('completed'), // generating | completed | failed
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
```

`PeriodicReportContent` 类型定义：

```typescript
export interface PeriodicReportContent {
  period: { start: string; end: string; type: 'daily' | 'weekly' };
  strategies: {
    id: string;
    name: string;
    tradeCount: number;
    winRate: number;
    totalProfit: number;
    totalReturn: number;
  }[];
  tradingAgent: {
    decisionCount: number;
    approvedCount: number;
    rejectedCount: number;
    winRate: number;
    totalProfit: number;
  };
  signals: {
    totalCount: number;
    longCount: number;
    shortCount: number;
    holdCount: number;
  };
  overall: {
    totalTrades: number;
    totalProfit: number;
    totalWinRate: number;
  };
}
```

### 1.2 扩展 `webhooks` 表 — 新增 `events` 字段

在 webhooks 表中新增 `events` 字段，用于指定 webhook 接收哪些事件类型：

```typescript
events: jsonb('events').$type<string[]>().default(['signal']),
// 默认 ['signal']，可选值: 'signal' | 'daily_report' | 'weekly_report'
// 向前兼容：已有 webhook 默认只接收 signal 事件
```

### 1.3 迁移文件

使用 `drizzle-kit generate` 生成迁移文件，遵循项目规则：
- 字段默认 nullable 或有默认值
- 不生成 DROP/DELETE/TRUNCATE/RENAME 语句
- 一个需求只保留一个迁移文件

---

## 二、后端模块

### 2.1 新增 PeriodicReportModule

路径：`apps/backend/src/modules/periodic-report/`

#### periodic-report.service.ts

核心方法：

| 方法 | 说明 |
|------|------|
| `generateDailyReport()` | 生成日报（计算昨日 18:00 到今日 18:00 的数据） |
| `generateWeeklyReport()` | 生成周报（计算上周六 10:00 到本周六 10:00 的数据） |
| `findAll(params)` | 分页查询报告列表，支持 type/dateRange 筛选 |
| `findById(id)` | 获取单个报告详情 |
| `buildReportContent(periodStart, periodEnd)` | 构建报告内容（核心计算逻辑） |
| `buildReportSummary(content)` | 生成 markdown 格式摘要（用于 webhook 推送） |
| `sendReportToWebhooks(report)` | 将报告推送到配置了对应事件的 webhook |

#### 报告内容计算逻辑

**策略数据**（基于 `simulation_trades` 表）：
- 查询 `tradeTime` 在周期内的交易记录
- 按 `strategyId` 分组
- 计算每个策略的：交易笔数、胜率（profit > 0 的比例）、总盈利、总收益率
- 只包含有交易的策略（即"活跃策略"）

**交易 Agent 数据**（基于 `trading_agent_decisions` 表）：
- 查询 `createdAt` 在周期内的决策记录
- 统计：总决策数、批准数、拒绝数
- 对 approved 的决策，关联 `simulation_trades` 计算胜率和盈利

**信号数据**（基于 `signals` 表）：
- 查询 `generatedAt` 在周期内的信号
- 统计：总数、做多数、做空数、观望数

**汇总数据**：
- 总交易笔数（所有策略交易之和）
- 总盈利（所有策略盈利之和）
- 综合胜率（所有策略的加权平均胜率）

#### periodic-report.controller.ts

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/periodic-reports` | 分页查询报告列表 |
| GET | `/periodic-reports/:id` | 获取报告详情 |
| POST | `/periodic-reports/generate/daily` | 手动触发生成日报 |
| POST | `/periodic-reports/generate/weekly` | 手动触发生成周报 |

#### periodic-report.module.ts

注册 Service、Controller，导入 DatabaseModule、NotificationsModule。

### 2.2 修改定时任务

修改 [scheduler-tasks.service.ts](file:///c:/Users/yeung/Desktop/Project/a-signal/apps/backend/src/jobs/scheduler-tasks.service.ts)，新增两个定时任务：

```typescript
@Cron('0 0 18 * * *', { name: 'daily-report', timeZone: 'Asia/Shanghai' })
async handleDailyReport() { ... }

@Cron('0 0 10 * * 6', { name: 'weekly-report', timeZone: 'Asia/Shanghai' })
async handleWeeklyReport() { ... }
```

同时在 [seed.ts](file:///c:/Users/yeung/Desktop/Project/a-signal/apps/backend/scripts/seed.ts) 的 schedulerTasks 初始化数据中新增这两条记录。

### 2.3 修改 Webhook 系统

#### 修改 webhooks.service.ts

- `CreateWebhookInput` 和 `UpdateWebhookInput` 新增 `events?: string[]` 字段
- 创建/更新 webhook 时保存 events 字段

#### 修改 notifications.service.ts

- 新增 `sendReportNotification()` 方法，构建报告推送消息
- 消息格式：企业微信 markdown 格式，包含报告摘要
- 查询 `events` 包含对应报告类型的 webhook 进行推送

#### 修改 DTO

- `CreateWebhookDto` 新增 `events` 字段（可选，默认 `['signal']`）
- `UpdateWebhookDto` 新增 `events` 字段（可选）

### 2.4 注册模块

在 [app.module.ts](file:///c:/Users/yeung/Desktop/Project/a-signal/apps/backend/src/app.module.ts) 中注册 `PeriodicReportModule`。

---

## 三、前端页面

### 3.1 新增定期报告页面

路径：`apps/frontend/src/pages/periodic-reports/index.tsx`

页面功能：
- 顶部筛选区：报告类型（全部/日报/周报）、日期范围选择
- 报告列表：卡片式展示，每张卡片显示报告类型、周期、关键指标摘要
- 点击卡片展开/跳转详情，展示完整报告内容
- 手动生成按钮（触发日报/周报生成）

### 3.2 新增前端 API 服务

在 `apps/frontend/src/services/` 中新增或扩展：
- `periodicReportApi.getReports(params)` — 获取报告列表
- `periodicReportApi.getReportById(id)` — 获取报告详情
- `periodicReportApi.generateDailyReport()` — 手动生成日报
- `periodicReportApi.generateWeeklyReport()` — 手动生成周报

### 3.3 修改通知设置页面

在 [notifications.tsx](file:///c:/Users/yeung/apps/frontend/src/pages/settings/notifications.tsx) 的 Webhook 创建/编辑表单中：
- 新增"事件类型"多选框：信号通知、日报推送、周报推送
- 默认选中"信号通知"（向后兼容）

### 3.4 注册路由

在 [.umirc.ts](file:///c:/Users/yeung/Desktop/Project/a-signal/apps/frontend/.umirc.ts) 的 routes 中新增：

```typescript
{ path: '/periodic-reports', component: '@/pages/periodic-reports/index', title: '定期报告' },
```

### 3.5 更新菜单 Seed 数据

在 [seed.ts](file:///c:/Users/yeung/Desktop/Project/a-signal/apps/backend/scripts/seed.ts) 的 menuData 中，在"分析中心"目录下新增子菜单：

```typescript
{ name: '定期报告', path: '/periodic-reports', icon: 'FileTextOutlined', sort: 2, visibleRoles: allRoles }
```

同时在 MainLayout.tsx 的 iconMap 中添加 `FileTextOutlined` 图标映射。

---

## 四、Webhook 推送消息格式

### 日报推送格式（企业微信 markdown）

```markdown
**📊 日报 - 2026-05-29**

>周期: 2026-05-28 18:00 ~ 2026-05-29 18:00

**📈 策略表现**
>活跃策略: 3 个 | 总交易: 15 笔 | 胜率: 60.0% | 盈利: +1,234.56

**🤖 交易 Agent**
>决策: 20 次 | 批准: 12 次 | 胜率: 66.7% | 盈利: +890.00

**📡 信号统计**
>总信号: 25 | 做多: 15 | 做空: 8 | 观望: 2
```

### 周报推送格式

```markdown
**📊 周报 - 2026-05-24 ~ 2026-05-30**

>周期: 2026-05-23 10:00 ~ 2026-05-30 10:00

**📈 策略表现**
>活跃策略: 5 个 | 总交易: 68 笔 | 胜率: 58.8% | 盈利: +5,678.90

**🤖 交易 Agent**
>决策: 95 次 | 批准: 52 次 | 胜率: 63.5% | 盈利: +3,456.00

**📡 信号统计**
>总信号: 120 | 做多: 72 | 做空: 38 | 观望: 10
```

---

## 五、实施步骤

### 步骤 1：数据库 Schema 变更
1. 在 schema.ts 中新增 `periodic_reports` 表定义
2. 在 schema.ts 中为 `webhooks` 表新增 `events` 字段
3. 定义 `PeriodicReportContent` 类型
4. 运行 `drizzle-kit generate` 生成迁移文件

### 步骤 2：后端 PeriodicReport 模块
1. 创建 `periodic-report.service.ts`，实现报告生成和查询逻辑
2. 创建 `periodic-report.controller.ts`，实现 API 端点
3. 创建 `periodic-report.module.ts`，注册模块
4. 在 app.module.ts 中注册 PeriodicReportModule

### 步骤 3：修改定时任务
1. 在 scheduler-tasks.service.ts 中新增日报和周报的 cron 任务
2. 新增手动触发方法
3. 在 seed.ts 中新增定时任务初始化数据

### 步骤 4：修改 Webhook 系统
1. 修改 webhooks schema（已在步骤 1 完成）
2. 修改 webhook DTO，新增 events 字段
3. 修改 webhooks.service.ts，支持 events 字段的 CRUD
4. 修改 notifications.service.ts，新增报告推送方法
5. 修改 notifications.module.ts，注入 PeriodicReportService（如果需要）

### 步骤 5：前端页面
1. 新增 API 服务文件
2. 创建定期报告页面组件
3. 修改通知设置页面，新增事件类型选择
4. 注册路由
5. 更新菜单 seed 数据
6. 更新 MainLayout 图标映射

### 步骤 6：测试与验证
1. 运行数据库迁移
2. 验证定时任务注册
3. 手动触发报告生成，验证数据正确性
4. 验证 Webhook 推送
5. 验证前端页面展示
