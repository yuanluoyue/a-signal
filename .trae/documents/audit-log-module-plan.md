# 审计日志模块开发计划

## 一、需求概述

开发审计日志模块，记录系统中的敏感操作，包括但不限于：
- 用户登录（成功/失败）
- 用户注册
- 修改密码
- 修改用户资料
- API Key 创建/删除
- 修改公用数据（信号规则、黑名单、定时任务等）
- 策略增删改
- Webhook 增删改
- 模拟账户创建/删除

## 二、数据库设计

### 2.1 新增 `audit_logs` 表（Drizzle Schema）

在 `apps/backend/src/core/db/schema.ts` 末尾新增：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid PK | 主键，defaultRandom() |
| `userId` | uuid nullable | 操作人用户ID，匿名操作（如登录失败）为 null，FK -> users |
| `action` | varchar(100) | 操作类型，如 `user.login`、`api_key.create` |
| `resource` | varchar(50) | 资源类型，如 `user`、`api_key`、`strategy` |
| `resourceId` | varchar(255) nullable | 被操作资源的ID |
| `detail` | jsonb nullable | 操作详情（灵活JSON，如登录IP、失败原因等） |
| `ipAddress` | varchar(45) nullable | 客户端IP地址 |
| `userAgent` | text nullable | 客户端 User-Agent |
| `status` | varchar(20) | 操作结果：`success` / `failure` |
| `createdAt` | timestamp with tz | 操作时间，defaultNow() |

索引：
- `audit_logs_user_id_idx` on `userId`
- `audit_logs_action_idx` on `action`
- `audit_logs_resource_idx` on `resource`
- `audit_logs_created_at_idx` on `createdAt`

### 2.2 迁移生成

通过 `drizzle-kit generate` 生成迁移文件，遵循规则：
- 字段默认 nullable
- 禁止 DROP / DELETE / TRUNCATE / RENAME
- 最终只保留一个迁移文件

## 三、后端模块设计

### 3.1 模块文件结构

```
apps/backend/src/
├── modules/audit-log/
│   ├── audit-log.module.ts          # 模块定义
│   └── audit-log.service.ts         # 核心服务（记录日志、查询日志）
├── interfaces/admin/audit-log/
│   ├── audit-log.controller.ts      # API 控制器
│   └── dto/
│       ├── audit-log.dto.ts         # 查询DTO
│       └── index.ts                 # 导出
```

### 3.2 AuditLogService

**核心方法：**

```typescript
@Injectable()
export class AuditLogService {
  // 记录审计日志
  async log(params: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    detail?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failure';
  }): Promise<void>

  // 分页查询审计日志（管理员视图，可按用户/操作类型/时间范围筛选）
  async findAll(params: {
    userId?: string;
    action?: string;
    resource?: string;
    status?: string;
    startTime?: Date;
    endTime?: Date;
    page: number;
    pageSize: number;
  }): Promise<{ data: AuditLog[]; total: number }>

  // 查询当前用户的审计日志
  async findByUserId(userId: string, params: {
    action?: string;
    resource?: string;
    page: number;
    pageSize: number;
  }): Promise<{ data: AuditLog[]; total: number }>
}
```

### 3.3 AuditLogController

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/audit-logs` | 查询当前用户审计日志（分页、筛选） |

查询参数（DTO）：
- `action`: 可选，操作类型筛选
- `resource`: 可选，资源类型筛选
- `page`: 页码，默认 1
- `pageSize`: 每页条数，默认 20

### 3.4 AuditLogModule

```typescript
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],  // 导出供其他模块注入使用
})
export class AuditLogModule {}
```

需在 `app.module.ts` 中 imports 添加 `AuditLogModule`，controllers 添加 `AuditLogController`。

## 四、审计日志埋点（集成点）

### 4.1 Auth 模块（`auth.service.ts`）

在 `AuthService` 中注入 `AuditLogService`，在以下方法中记录日志：

| 方法 | action | resource | status |
|------|--------|----------|--------|
| `register()` 成功 | `user.register` | `user` | `success` |
| `register()` 失败（邮箱已存在） | `user.register` | `user` | `failure` |
| `login()` 成功 | `user.login` | `user` | `success` |
| `login()` 失败（密码错误/用户不存在） | `user.login` | `user` | `failure` |
| `changePassword()` 成功 | `user.change_password` | `user` | `success` |
| `changePassword()` 失败 | `user.change_password` | `user` | `failure` |
| `updateProfile()` 成功 | `user.update_profile` | `user` | `success` |

**需要修改 `AuthController`**：在 `login` 和 `register` 方法中提取 `@Req() req` 对象，将 `ip` 和 `headers['user-agent']` 传入 service，以便记录 IP 和 UA。

### 4.2 API Key 模块（`api-key.service.ts`）

在 `ApiKeyService` 中注入 `AuditLogService`：

| 方法 | action | resource | resourceId |
|------|--------|----------|------------|
| `create()` | `api_key.create` | `api_key` | 新创建的 key ID |
| `delete()` | `api_key.delete` | `api_key` | 被删除的 key ID |

### 4.3 策略模块

在 `StrategyService` 中注入 `AuditLogService`：

| 方法 | action | resource |
|------|--------|----------|
| `create()` | `strategy.create` | `strategy` |
| `update()` | `strategy.update` | `strategy` |
| `delete()` | `strategy.delete` | `strategy` |

### 4.4 Webhook 模块

在 `NotificationsService` 中注入 `AuditLogService`：

| 方法 | action | resource |
|------|--------|----------|
| Webhook 创建 | `webhook.create` | `webhook` |
| Webhook 更新 | `webhook.update` | `webhook` |
| Webhook 删除 | `webhook.delete` | `webhook` |

### 4.5 模拟交易模块

在 `SimulationService` 中注入 `AuditLogService`：

| 方法 | action | resource |
|------|--------|----------|
| 创建账户 | `simulation.account_create` | `simulation_account` |
| 删除账户 | `simulation.account_delete` | `simulation_account` |
| 执行交易 | `simulation.trade_execute` | `simulation_trade` |

### 4.6 公用数据模块

**信号规则（`signal-rule.service.ts`）**：

| 方法 | action | resource |
|------|--------|----------|
| 创建/更新 | `signal_rule.update` | `signal_rule` |

**黑名单（`blacklist.service.ts`）**：

| 方法 | action | resource |
|------|--------|----------|
| 添加 | `blacklist.create` | `blacklist` |
| 删除 | `blacklist.delete` | `blacklist` |

**定时任务（`scheduler.service.ts`）**：

| 方法 | action | resource |
|------|--------|----------|
| 更新 | `scheduler.update` | `scheduler_task` |

## 五、前端设计

### 5.1 路由

在 `.umirc.ts` 的 routes 中添加：

```typescript
{
  path: '/audit-logs',
  component: '@/pages/audit-logs/index',
  title: '审计日志',
},
```

### 5.2 页面结构

`apps/frontend/src/pages/audit-logs/index.tsx`

- 顶部：筛选条件（操作类型 Select、资源类型 Select、时间范围 DatePicker.RangePicker）
- 主体：Ant Design Table 展示审计日志列表
  - 列：操作时间、操作人、操作类型、资源类型、资源ID、状态、IP地址、详情
  - 分页
- 详情：点击某行可展开查看 detail JSON

### 5.3 API 调用

在 `apps/frontend/src/services/` 中添加 `auditLog.ts`：

```typescript
export async function getAuditLogs(params: {
  action?: string;
  resource?: string;
  page?: number;
  pageSize?: number;
})
```

## 六、实现步骤（按顺序）

### 步骤 1：数据库 Schema + 迁移
1. 在 `schema.ts` 中新增 `audit_logs` 表定义
2. 运行 `drizzle-kit generate` 生成迁移文件
3. 确认只生成一个迁移文件

### 步骤 2：后端 AuditLog 模块
1. 创建 `modules/audit-log/audit-log.service.ts`
2. 创建 `modules/audit-log/audit-log.module.ts`
3. 创建 `interfaces/admin/audit-log/dto/audit-log.dto.ts`
4. 创建 `interfaces/admin/audit-log/dto/index.ts`
5. 创建 `interfaces/admin/audit-log/audit-log.controller.ts`
6. 在 `app.module.ts` 中注册 AuditLogModule 和 AuditLogController

### 步骤 3：埋点 - Auth 模块
1. 修改 `AuthController`：在 login/register 方法中提取 req 对象，传递 IP 和 UA
2. 修改 `AuthService`：注入 AuditLogService，在 register/login/changePassword/updateProfile 中记录审计日志
3. 修改 `AuthModule`：imports AuditLogModule

### 步骤 4：埋点 - API Key 模块
1. 修改 `ApiKeyService`：注入 AuditLogService，在 create/delete 中记录审计日志
2. 修改 `ApiKeyModule`：imports AuditLogModule

### 步骤 5：埋点 - 策略模块
1. 修改 `StrategyService`：注入 AuditLogService，在 create/update/delete 中记录审计日志
2. 修改 `StrategyModule`：imports AuditLogModule

### 步骤 6：埋点 - Webhook 模块
1. 修改 `NotificationsService`：注入 AuditLogService，在 webhook create/update/delete 中记录审计日志
2. 修改 `NotificationsModule`：imports AuditLogModule

### 步骤 7：埋点 - 模拟交易模块
1. 修改 `SimulationService`：注入 AuditLogService，在 createAccount/deleteAccount/executeTrade 中记录审计日志
2. 修改 `SimulationModule`：imports AuditLogModule

### 步骤 8：埋点 - 公用数据模块
1. 修改 `SignalRuleService`：注入 AuditLogService
2. 修改 `BlacklistService`：注入 AuditLogService
3. 修改 `SchedulerService`：注入 AuditLogService
4. 修改对应 Module：imports AuditLogModule

### 步骤 9：前端页面
1. 添加 API service `auditLog.ts`
2. 创建 `pages/audit-logs/index.tsx` 审计日志列表页
3. 在 `.umirc.ts` 中添加路由
4. 在侧边栏菜单中添加"审计日志"入口

### 步骤 10：验证
1. 运行数据库迁移
2. 启动后端，测试各敏感操作的审计日志记录
3. 启动前端，验证审计日志页面展示
