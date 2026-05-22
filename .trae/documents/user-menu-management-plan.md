# 用户管理 + 菜单管理 开发计划

## 需求概述

1. **轻量级用户管理**：系统内只做两种角色（管理员 `admin` 和普通用户 `normal`），支持用户列表查看、角色分配
2. **菜单管理功能**：菜单数据存入数据库，前端根据角色控制菜单显隐（纯前端判断，后端不做接口级权限控制）

---

## 一、数据库变更

### 1.1 users 表新增 role 字段

在 `apps/backend/src/core/db/schema.ts` 的 `users` 表定义中新增：

```typescript
role: varchar('role', { length: 20 }).default('normal'),
```

- 字段 nullable（符合规则：字段必须默认 nullable）
- 默认值为 `'normal'`，新注册用户默认为普通角色
- 已有用户通过迁移自动获得 `NULL` 值，前端对 `NULL` 视为 `normal`

### 1.2 新增 menus 表

在 `apps/backend/src/core/db/schema.ts` 中新增 `menus` 表：

```typescript
export const menus = pgTable('menus', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id'),
  name: varchar('name', { length: 100 }).notNull(),
  path: varchar('path', { length: 255 }),
  icon: varchar('icon', { length: 100 }),
  sort: integer('sort').notNull().default(0),
  visibleRoles: jsonb('visible_roles').$type<string[]>().default(['admin', 'normal']),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Menu = typeof menus.$inferSelect;
export type NewMenu = typeof menus.$inferInsert;
```

字段说明：
- `parentId`：父菜单 ID，nullable，顶级菜单为 NULL
- `name`：菜单名称
- `path`：路由路径，nullable（分组菜单无路径）
- `icon`：Ant Design 图标名称
- `sort`：排序权重，越小越靠前
- `visibleRoles`：可见角色列表，jsonb 类型，默认 `['admin', 'normal']`，表示哪些角色可以看到此菜单
- `status`：状态，默认 `'active'`

### 1.3 迁移生成

运行 `drizzle-kit generate` 生成迁移文件，**只保留最终一个迁移文件**。

### 1.4 更新 seed.ts

在 `seed.ts` 中新增：
1. 更新 admin 用户的 role 为 `'admin'`
2. 插入菜单初始数据（与当前硬编码菜单一致）

菜单数据结构示例：
```
仪表盘 (visibleRoles: ['admin', 'normal'])
数据中心 (visibleRoles: ['admin', 'normal'])
  ├── 新闻管理
  ├── 股票查询
  └── 股票追踪
策略中心 (visibleRoles: ['admin', 'normal'])
  ├── 信号规则
  ├── 信号管理
  ├── 事件管理
  ├── 策略管理
  └── 回测记录
交易中心 (visibleRoles: ['admin', 'normal'])
  ├── 运行管理
  └── 账户模拟
AI 智能体 (visibleRoles: ['admin', 'normal'])
  ├── 研究员 Agent
  ├── 交易 Agent
  ├── 新闻过滤 Agent
  ├── 交易经验
  ├── AI 运行中心
  └── LLM 日志
分析中心 (visibleRoles: ['admin', 'normal'])
  ├── 综合分析
  └── 策略总览
系统设置 (visibleRoles: ['admin'])
  ├── 通知设置
  ├── 定时任务
  ├── API Key
  ├── 黑名单
  ├── 审计日志
  ├── 用户管理 (visibleRoles: ['admin'])
  └── 菜单管理 (visibleRoles: ['admin'])
```

> 注意：系统设置及其子菜单默认仅管理员可见，用户管理和菜单管理仅管理员可见。

---

## 二、后端变更

### 2.1 更新 JWT Payload

**文件**：`apps/backend/src/core/auth/jwt.strategy.ts`

- `JwtPayload` 接口新增 `role` 字段
- `validate()` 方法返回 `{ sub, email, role }`

**文件**：`apps/backend/src/modules/auth/auth.service.ts`

- `generateToken()` 方法的 payload 新增 `role` 字段
- `register()` 方法：创建用户时 role 默认为 `'normal'`
- `login()` 方法：返回的用户信息包含 role
- `getMe()` 方法：返回的用户信息包含 role

### 2.2 新增用户管理接口

**新建文件**：`apps/backend/src/interfaces/admin/users/users.controller.ts`

| 方法 | 路由 | 功能 | 权限 |
|------|------|------|------|
| GET | `/users` | 获取用户列表（分页） | 需认证 |
| GET | `/users/:id` | 获取用户详情 | 需认证 |
| PUT | `/users/:id/role` | 修改用户角色 | 需认证 |
| PUT | `/users/:id/status` | 启用/禁用用户 | 需认证 |

**新建 DTO 文件**：
- `apps/backend/src/interfaces/admin/users/dto/index.ts`
- `apps/backend/src/interfaces/admin/users/dto/query-users.dto.ts`
- `apps/backend/src/interfaces/admin/users/dto/update-role.dto.ts`

**更新文件**：`apps/backend/src/modules/users/users.service.ts`

新增方法：
- `findAll(params)` - 分页查询用户列表
- `updateRole(id, role)` - 更新用户角色

### 2.3 新增菜单管理模块

**新建文件**：`apps/backend/src/modules/menu/menu.module.ts`
**新建文件**：`apps/backend/src/modules/menu/menu.service.ts`

MenuService 方法：
- `findAll()` - 获取所有菜单（树形结构）
- `getMenusByRole(role)` - 根据角色获取可见菜单
- `create(data)` - 创建菜单
- `update(id, data)` - 更新菜单
- `delete(id)` - 删除菜单（软删除，设置 status='inactive'）
- `updateSort(id, sort)` - 更新排序

**新建文件**：`apps/backend/src/interfaces/admin/menu/menu.controller.ts`

| 方法 | 路由 | 功能 | 权限 |
|------|------|------|------|
| GET | `/menus` | 获取所有菜单 | 需认证 |
| GET | `/menus/my` | 获取当前角色可见菜单 | 需认证 |
| POST | `/menus` | 创建菜单 | 需认证 |
| PUT | `/menus/:id` | 更新菜单 | 需认证 |
| PUT | `/menus/:id/sort` | 更新排序 | 需认证 |
| DELETE | `/menus/:id` | 删除菜单 | 需认证 |

**新建 DTO 文件**：
- `apps/backend/src/interfaces/admin/menu/dto/index.ts`
- `apps/backend/src/interfaces/admin/menu/dto/create-menu.dto.ts`
- `apps/backend/src/interfaces/admin/menu/dto/update-menu.dto.ts`
- `apps/backend/src/interfaces/admin/menu/dto/update-sort.dto.ts`

### 2.4 注册模块

**更新文件**：`apps/backend/src/app.module.ts`

- imports 新增 `MenuModule`
- controllers 新增 `UsersController`、`MenuController`

---

## 三、前端变更

### 3.1 类型定义更新

**更新文件**：`apps/frontend/src/services/types.ts`

- `User` 接口新增 `role?: string` 字段
- 新增菜单相关类型：`MenuItem`、`CreateMenuRequest`、`UpdateMenuRequest`

### 3.2 工具函数更新

**更新文件**：`apps/frontend/src/utils/auth.ts`

- `User` 接口新增 `role?: string` 字段

### 3.3 新增 API 服务

**新建文件**：`apps/frontend/src/services/users.ts`

- `usersApi.getUsers(params)` - 获取用户列表
- `usersApi.updateRole(id, role)` - 修改用户角色

**新建文件**：`apps/frontend/src/services/menu.ts`

- `menuApi.getMyMenus()` - 获取当前角色可见菜单
- `menuApi.getAllMenus()` - 获取所有菜单
- `menuApi.create(data)` - 创建菜单
- `menuApi.update(id, data)` - 更新菜单
- `menuApi.delete(id)` - 删除菜单
- `menuApi.updateSort(id, sort)` - 更新排序

### 3.4 MainLayout 菜单改造

**更新文件**：`apps/frontend/src/layouts/MainLayout.tsx`

核心变更：
1. 删除硬编码的 `MENU_ITEMS` 常量
2. 新增 `useEffect` 在组件挂载时调用 `/menus/my` 获取当前角色可见菜单
3. 将后端返回的菜单数据转换为 Ant Design Menu 的 `items` 格式
4. 图标映射：后端存储图标名称字符串，前端维护 `iconMap` 将字符串映射为 React 组件
5. 加载中显示 Spin 组件

菜单数据转换逻辑：
```typescript
const buildMenuItems = (menus: MenuItem[]): MenuProps['items'] => {
  // 按 sort 排序
  // 构建树形结构（parentId 为 null 的是顶级菜单）
  // 递归构建 children
  // 映射 icon 字符串到 Ant Design 图标组件
};
```

### 3.5 新增用户管理页面

**新建文件**：`apps/frontend/src/pages/users/index.tsx`

功能：
- Ant Design ProTable 展示用户列表
- 列：昵称、邮箱、角色（Tag 标签）、注册时间
- 操作：修改角色（下拉选择 admin/normal）
- 仅管理员可见

### 3.6 新增菜单管理页面

**新建文件**：`apps/frontend/src/pages/menu-management/index.tsx`

功能：
- 树形表格展示菜单列表
- 新增菜单（Modal 表单）
- 编辑菜单（Modal 表单）
- 删除菜单
- 拖拽排序或手动输入排序值
- 可见角色多选（Checkbox：admin、normal）
- 仅管理员可见

### 3.7 路由配置

**更新文件**：`apps/frontend/.umirc.ts`

在系统设置分组下新增：
```typescript
{
  path: '/settings/users',
  component: '@/pages/users/index',
  title: '用户管理',
},
{
  path: '/settings/menu-management',
  component: '@/pages/menu-management/index',
  title: '菜单管理',
},
```

### 3.8 UserContext 更新

**更新文件**：`apps/frontend/src/contexts/UserContext.tsx`

- 确保 `refreshUser()` 后用户信息包含 `role` 字段
- 可选：新增 `isAdmin` 计算属性

---

## 四、实施步骤（按顺序执行）

### 步骤 1：数据库 Schema 变更
1. 在 `schema.ts` 中 users 表新增 `role` 字段
2. 在 `schema.ts` 中新增 `menus` 表
3. 运行 `drizzle-kit generate` 生成迁移
4. 更新 `seed.ts` 添加菜单初始数据和 admin 角色更新

### 步骤 2：后端 - JWT Payload 更新
1. 更新 `jwt.strategy.ts` 的 JwtPayload 接口和 validate 方法
2. 更新 `auth.service.ts` 的 generateToken、register、login、getMe 方法

### 步骤 3：后端 - 用户管理接口
1. 更新 `users.service.ts` 新增 findAll、updateRole 方法
2. 新建 `interfaces/admin/users/` 目录及 Controller、DTO
3. 在 `app.module.ts` 中注册 UsersController

### 步骤 4：后端 - 菜单管理模块
1. 新建 `modules/menu/` 目录及 Module、Service
2. 新建 `interfaces/admin/menu/` 目录及 Controller、DTO
3. 在 `app.module.ts` 中注册 MenuModule 和 MenuController

### 步骤 5：前端 - 类型和服务层
1. 更新 `types.ts` 新增 User.role 和菜单相关类型
2. 更新 `utils/auth.ts` 的 User 接口
3. 新建 `services/users.ts`
4. 新建 `services/menu.ts`

### 步骤 6：前端 - MainLayout 菜单动态化
1. 改造 `MainLayout.tsx`，从后端获取菜单数据
2. 实现菜单数据到 Ant Design Menu items 的转换
3. 实现图标映射

### 步骤 7：前端 - 用户管理页面
1. 新建 `pages/users/index.tsx`
2. 更新 `.umirc.ts` 添加路由

### 步骤 8：前端 - 菜单管理页面
1. 新建 `pages/menu-management/index.tsx`
2. 更新 `.umirc.ts` 添加路由

### 步骤 9：验证和测试
1. 运行迁移
2. 运行 seed
3. 验证管理员登录后能看到所有菜单
4. 验证普通用户登录后只能看到对应菜单
5. 验证用户管理页面功能
6. 验证菜单管理页面功能

---

## 五、关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 角色存储方式 | users 表新增 role 字段 | 轻量级需求，只有两种角色，无需独立角色表 |
| 菜单权限控制 | 前端判断 | 需求明确要求"只在前端判断角色控制菜单显隐" |
| 菜单数据来源 | 数据库存储 | 需要菜单管理功能，必须持久化 |
| 删除策略 | 软删除（status='inactive'） | 符合数据库安全规则，禁止删除数据 |
| visibleRoles 格式 | jsonb 数组 | 灵活支持多角色，查询简单 |
| 图标处理 | 前端维护 iconMap | 后端只存图标名称字符串，前端映射为组件 |
