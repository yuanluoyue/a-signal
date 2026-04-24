# Checklist

## 数据库设计

- [x] signal_rules 表结构正确
  - [x] 包含所有字段：id, name, type, eventType, enabled, multiplier, threshold, enableSurprise, enableConfidence, description, createdAt, updatedAt
  - [x] 有唯一约束（name）
  - [x] 有索引（type, eventType, enabled）
  - [x] Drizzle 迁移文件生成成功

- [x] signals 表重构正确（向后兼容）
  - [x] 保留旧字段：stockCode, stockName, direction, confidence, sentiment, reasoning, keyFactors, timeWindow, signalTime, newsId（均为 nullable）
  - [x] 新增字段：eventId, symbol, action, score, generatedAt, validFrom, validTo, reason, ruleId, ruleSnapshot, weight（均为 nullable）
  - [x] eventId 为 nullable，外键关联 events 表
  - [x] ruleId 为 nullable，外键关联 signal_rules 表
  - [x] 有正确的索引

## 后端信号规则模块

- [x] SignalRuleService 正确实现
  - [x] create 方法正确保存规则
  - [x] findById 方法正确返回规则详情
  - [x] findList 方法支持分页和筛选（type, eventType, enabled）
  - [x] findByEventType 方法正确匹配规则
  - [x] getGlobalRule 方法正确返回全局规则
  - [x] update 方法正确更新规则
  - [x] updateGlobalRule 方法正确更新全局规则

- [x] SignalGeneratorService 正确实现
  - [x] generateSignalsFromEvent 方法正确生成信号
  - [x] 规则匹配逻辑正确（先 subcategory 后 category）
  - [x] 分数计算逻辑正确（global_score, final_score）
  - [x] enableSurprise 和 enableConfidence 开关正确生效
  - [x] 为每个 stock subject 生成信号
  - [x] ruleSnapshot 正确记录规则参数
  - [x] 阈值过滤逻辑正确

- [x] EventAnalyzeConsumer 改造正确
  - [x] 事件保存后调用 SignalGeneratorService
  - [x] 信号正确关联事件和规则

## 后端 API

- [x] 信号规则管理 API
  - [x] GET /api/v1/signal-rules 列表接口正确（分页、筛选）
  - [x] GET /api/v1/signal-rules/:id 详情接口正确
  - [x] POST /api/v1/signal-rules 创建接口正确
  - [x] PUT /api/v1/signal-rules/:id 更新接口正确
  - [x] GET /api/v1/signal-rules/global 全局规则接口正确
  - [x] PUT /api/v1/signal-rules/global 更新全局规则接口正确

## 前端页面

- [x] 信号规则管理页 /signal-rules
  - [x] 全局规则区展示正确（公式只读、阈值、系数、启用 surprise/confidence 开关）
  - [x] 规则表格展示正确（事件类型、名称、启用状态、系数、阈值）
  - [x] 新增/编辑规则功能正常
  - [x] 启用/禁用规则功能正常

- [x] 菜单配置
  - [x] 「信号规则」菜单项在分析中心分组下
  - [x] 菜单图标使用 SettingOutlined
  - [x] 路由跳转正常

## Seed 数据

- [x] 初始规则数据正确
  - [x] 幂等处理正确（已存在则跳过）
  - [x] 全局规则数据完整（global_default）
  - [x] 特定规则数据完整（m_a_v1, earnings_forecast_v1, earnings_actual_v1, policy_v1, macro_v1）

## 代码质量

- [x] 后端代码编译成功
  - [x] TypeScript 类型检查通过
  - [x] 无编译错误
  - [x] Null 安全性处理正确

- [x] 前端代码编译成功
  - [x] TypeScript 类型检查通过
  - [x] 无编译错误

## 集成验证

- [x] 代码质量验证
  - [x] 后端编译成功
  - [x] 前端编译成功
  - [x] 所有类型错误已修复
