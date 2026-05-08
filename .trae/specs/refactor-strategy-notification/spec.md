# 策略驱动信号通知改造 Spec

## Why

当前信号生成后直接发送 webhook 通知，通知过滤仅依赖 webhook 自身的 minScore/maxScore，无法利用策略的丰富筛选条件（方向、类别、规则等）。需要改造为：信号生成后，从已启用的策略中过滤出交易机会，再通过策略绑定的 webhook 发送通知，通知内容需标明来自哪个策略。

## What Changes

- **BREAKING** 重构通知流程：信号生成后不再直接发送 webhook，而是遍历已启用的策略，用策略条件过滤信号，匹配的策略通过其绑定的 webhook 发送通知
- strategies 表新增 webhookId 字段，建立策略与 webhook 的绑定关系
- webhooks 表移除 minScore/maxScore/minConfidence/maxConfidence 字段（改为 nullable 保留向前兼容）
- 改造 NotificationsService，实现策略驱动的通知逻辑
- 改造前端通知管理页面，webhook 配置取消分数过滤，改为关联策略
- 改造前端策略管理页面，策略可绑定 webhook

## Impact

- Affected specs: add-strategy-module（策略表需新增 webhookId）
- Affected code:
  - `apps/backend/src/core/db/schema.ts` - strategies 新增 webhookId，webhooks 旧字段改 nullable
  - `apps/backend/src/modules/notifications/notifications.service.ts` - 核心通知逻辑改造
  - `apps/backend/src/modules/notifications/webhooks.service.ts` - webhook 发送逻辑改造
  - `apps/backend/src/modules/signal-generator/signal-generator.service.ts` - 通知调用方式改造
  - `apps/backend/src/interfaces/admin/webhooks/` - webhook DTO/Controller 改造
  - `apps/backend/src/interfaces/admin/strategy/` - strategy DTO 改造
  - `apps/frontend/src/pages/settings/notifications.tsx` - 通知管理页面改造
  - `apps/frontend/src/pages/strategy/index.tsx` - 策略页面新增 webhook 绑定
  - `apps/frontend/src/services/types.ts` - 类型定义更新

## ADDED Requirements

### Requirement 1: 策略绑定 webhook

系统 SHALL 支持策略绑定 webhook 配置：

#### Scenario 1.1: 策略绑定 webhook
- **WHEN** 用户创建或编辑策略时
- **THEN** 可以选择一个已启用的 webhook 配置进行绑定
- **AND** 一个 webhook 可以被多个策略绑定
- **AND** 一个策略只能绑定一个 webhook（或不绑定）

### Requirement 2: 策略驱动的通知流程

系统 SHALL 实现策略驱动的通知流程：

#### Scenario 2.1: 信号生成后过滤交易机会
- **WHEN** 信号生成完成
- **THEN** 系统获取所有已启用的策略
- **AND** 对每个策略，用其筛选条件过滤信号：
  - minScore/maxScore 过滤信号分数
  - directionMode 过滤信号方向（long_only 只保留做多，short_only 只保留做空）
  - allowedCategories 过滤事件类别
  - allowedRuleIds 过滤规则 ID
- **AND** 如果信号匹配某策略，则通过该策略绑定的 webhook 发送通知
- **AND** 通知内容包含策略名称，标明是哪个策略过滤出的交易机会

#### Scenario 2.2: 策略无绑定 webhook
- **WHEN** 信号匹配某策略但该策略未绑定 webhook
- **THEN** 不发送通知（仅记录日志）

#### Scenario 2.3: 无策略匹配
- **WHEN** 信号不匹配任何已启用的策略
- **THEN** 不发送通知

### Requirement 3: 通知内容包含策略信息

系统 SHALL 在 webhook 通知中包含策略信息：

#### Scenario 3.1: 通知消息格式
- **WHEN** 发送 webhook 通知
- **THEN** 通知消息包含以下信息：
  - 策略名称（标明来源策略）
  - 信号方向、标的代码、标的名称
  - 信号分数
  - 事件类别
  - 信号原因
  - 事件发生时间

## MODIFIED Requirements

### Requirement M1: webhooks 表字段变更

**修改内容**: webhooks 表的 minScore、maxScore、minConfidence、maxConfidence 字段改为 nullable（保留向前兼容，不再使用）。

### Requirement M2: strategies 表新增 webhookId

**修改内容**: strategies 表新增 webhookId 字段（uuid, nullable），关联 webhooks 表。

### Requirement M3: 前端通知管理页面改造

**修改内容**:
- webhook 创建/编辑表单移除分数范围配置
- webhook 列表不再显示分数范围列
- 显示该 webhook 被哪些策略绑定

### Requirement M4: 前端策略管理页面改造

**修改内容**:
- 策略创建/编辑弹窗新增 webhook 选择（下拉选择已启用的 webhook）
- 策略列表显示绑定的 webhook 名称

## REMOVED Requirements

无
