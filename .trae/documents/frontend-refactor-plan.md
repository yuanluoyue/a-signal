# 前端重构计划

## 背景

根据 React 最佳实践（Vercel Engineering 指南），对前端代码进行小幅重构，不改动功能。

## 发现的问题

### 1. api 和 services 目录重复

**当前结构**:
- `api/` - 包含 types.ts 和各业务模块的 API 函数
- `services/` - 包含 axios 实例、api-key.ts、auth.ts

**问题**:
- api 目录的文件引用 `@/services/api`（axios 实例）
- 两个目录职责重叠，语义不清晰
- 页面组件调用方式不一致：有的用封装函数，有的直接用 axios 实例

### 2. 类型定义分散

- `api/types.ts` - 包含 API 相关类型
- `types/` 目录 - 包含 backtest.ts, news.ts, settings.ts, signal.ts
- 存在重复定义（如 BacktestResult, NewsItem 等）

### 3. 样式文件不统一

- `pages/agent-chat/index.less` - 使用 Less
- `global.scss` - 使用 SCSS
- 需要统一为 Sass

### 4. Barrel Imports 问题

根据 React 最佳实践 `bundle-barrel-imports` 规则：
- `api/index.ts` 导出所有模块会影响 tree-shaking
- 应该直接导入需要的模块

## 重构方案

### 步骤 1: 合并 api 和 services 目录

将两个目录合并为 `services/` 目录，统一管理所有 API 相关代码：

```
services/
├── client.ts          # axios 实例配置（原 api.ts）
├── auth.ts            # 认证 API
├── api-key.ts         # API Key 管理
├── backtest.ts        # 回测 API
├── dashboard.ts       # 仪表盘 API
├── news.ts            # 新闻 API
├── settings.ts        # 设置 API（webhooks, scheduler）
├── signals.ts         # 信号 API
└── types.ts           # 所有 API 相关类型定义
```

**删除**:
- `api/` 目录
- `types/` 目录（合并到 services/types.ts）

### 步骤 2: 统一类型定义

1. 将 `api/types.ts` 和 `types/` 目录下的类型合并到 `services/types.ts`
2. 删除重复的类型定义
3. 确保类型命名一致

### 步骤 3: 统一 API 调用方式

1. 所有页面使用封装好的 API 函数，不直接使用 axios 实例
2. 更新所有导入路径

### 步骤 4: 样式文件转换为 Sass

1. 将 `pages/agent-chat/index.less` 转换为 `index.module.scss`
2. 更新页面组件中的样式导入

### 步骤 5: 移除 Barrel Imports

1. 删除 `services/index.ts`（如果存在）
2. 更新所有导入为直接导入具体模块

## 详细执行步骤

### 1. 创建新的 services/types.ts

合并所有类型定义，删除重复项。

### 2. 迁移 API 文件

将 api/ 目录下的文件移动到 services/，并更新导入路径。

### 3. 更新页面组件导入

更新所有页面组件的导入路径：
- `@/api/xxx` → `@/services/xxx`
- `@/types/xxx` → `@/services/types`

### 4. 转换样式文件

将 index.less 转换为 SCSS 格式。

### 5. 清理旧文件

删除 api/ 目录和 types/ 目录。

## 影响范围

### 需要修改的文件

**页面组件** (约 15 个文件):
- `pages/dashboard.tsx`
- `pages/login.tsx`
- `pages/register.tsx`
- `pages/profile.tsx`
- `pages/news/index.tsx`
- `pages/news/[id].tsx`
- `pages/signals/index.tsx`
- `pages/signals/[id].tsx`
- `pages/stocks/index.tsx`
- `pages/stocks/[code].tsx`
- `pages/stock-trackings/index.tsx`
- `pages/stock-trackings/[id].tsx`
- `pages/backtest/index.tsx`
- `pages/agent-chat/index.tsx`
- `pages/settings/api-keys.tsx`
- `pages/settings/notifications.tsx`
- `pages/settings/scheduler.tsx`
- `pages/simulation/index.tsx`
- `pages/blacklist/index.tsx`

**其他组件**:
- `layouts/MainLayout.tsx`
- `components/Header.tsx`
- `components/UserMenu.tsx`
- `contexts/UserContext.tsx`

## 预期收益

1. **代码组织更清晰**: 所有 API 相关代码集中在一个目录
2. **类型定义统一**: 消除重复，便于维护
3. **样式统一**: 全部使用 Sass
4. **更好的 Tree-shaking**: 移除 barrel imports，减少打包体积
5. **API 调用一致**: 所有页面使用封装好的 API 函数

## 风险评估

- **低风险**: 仅重构代码结构，不改动功能逻辑
- **可验证性**: 重构后运行项目，确保所有功能正常
