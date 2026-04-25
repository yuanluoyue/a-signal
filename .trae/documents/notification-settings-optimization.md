# 通知设置优化计划

## 任务概述
1. Webhook 通知置信度范围改为分数范围
2. Webhook 测试按钮改为弹窗选择信号进行测试

---

## 任务一：Webhook 通知改为分数范围

### 1.1 数据库 Schema 修改

**文件**: `apps/backend/src/core/db/schema.ts`

**修改内容**:
- 将 `webhooks` 表的 `minConfidence` 字段改为 `minScore`
- 将 `webhooks` 表的 `maxConfidence` 字段改为 `maxScore`
- 默认值从 `0` 和 `100` 改为 `-1` 和 `1`（分数范围是 -1 到 1）

**注意**: 需要生成迁移文件

### 1.2 后端服务修改

**文件**: `apps/backend/src/modules/notifications/webhooks.service.ts`

**修改内容**:
1. `CreateWebhookInput` 接口：`minConfidence`/`maxConfidence` 改为 `minScore`/`maxScore`
2. `UpdateWebhookInput` 接口：同上
3. `SignalNotification` 接口：添加 `score` 字段
4. `create` 方法：使用 `minScore`/`maxScore`
5. `update` 方法：同上
6. `sendSignalNotifications` 方法：使用分数范围过滤

### 1.3 后端 DTO 修改

**文件**: `apps/backend/src/interfaces/admin/notifications/dto/create-webhook.dto.ts`
**文件**: `apps/backend/src/interfaces/admin/notifications/dto/update-webhook.dto.ts`

**修改内容**:
- `minConfidence`/`maxConfidence` 改为 `minScore`/`maxScore`

### 1.4 前端页面修改

**文件**: `apps/frontend/src/pages/settings/notifications.tsx`

**修改内容**:
1. `Webhook` 接口：`minConfidence`/`maxConfidence` 改为 `minScore`/`maxScore`
2. `WebhookFormData` 接口：`confidenceRange` 改为 `scoreRange`
3. 表单字段：置信度范围滑块改为分数范围滑块（-1 到 1）
4. 显示逻辑：置信度范围改为分数范围

---

## 任务二：Webhook 测试按钮改为弹窗选择信号

### 2.1 后端新增接口

**文件**: `apps/backend/src/interfaces/admin/notifications/webhooks.controller.ts`

**新增接口**:
1. `GET /webhooks/:id/signals` - 获取最近的信号列表（前20条）
2. `POST /webhooks/:id/test-signal/:signalId` - 发送指定信号的测试通知

### 2.2 后端服务新增方法

**文件**: `apps/backend/src/modules/notifications/webhooks.service.ts`

**新增方法**:
1. `getRecentSignals(limit: number)` - 获取最近的信号列表

**文件**: `apps/backend/src/modules/notifications/notifications.service.ts`

**新增方法**:
1. `sendSignalTestNotification(webhook, signal)` - 发送信号测试通知

### 2.3 前端页面修改

**文件**: `apps/frontend/src/pages/settings/notifications.tsx`

**修改内容**:
1. 新增状态：`testModalVisible`、`recentSignals`、`selectedSignal`
2. 修改 `handleTest` 方法：打开弹窗获取信号列表
3. 新增 `handleTestSignal` 方法：发送选中的信号测试
4. 新增测试弹窗：显示信号列表，可选择信号进行测试

---

## 实施顺序

1. 修改数据库 Schema（生成迁移文件）
2. 修改后端 DTO
3. 修改后端服务
4. 修改前端页面
5. 新增后端接口和方法
6. 新增前端测试弹窗功能
