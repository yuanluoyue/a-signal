# 股票追踪功能修复计划

## 问题诊断

经过对整个系统的深入分析，发现以下关键断点：

### 断点 1：新闻保存时 uniqueKey 格式不一致
- **Consumer** (`stock-track-fetch.consumer.ts` L73) 保存新闻时 `uniqueKey` 格式为 `${stockCode}_${news.title}_${news.publishDate}`
- **Service** (`stock-tracking.service.ts` L214) 查询关联新闻时用 `LIKE ${stockCode + '_%'}`，这能匹配
- **但** `StockTrackingService.saveNews()` (L184) 用的是 `${stockCode}-${Date.now()}-xxx` 格式（中划线），而查询用下划线 `_`，**导致查不到**
- Consumer 直接调用 `newsService.saveNews()` 而不是 `stockTrackingService.saveNews()`，两条路径 uniqueKey 格式不同

### 断点 2：新闻未关联 stockCode
- Consumer 保存的新闻 `uniqueKey` 是 `${stockCode}_${title}_${date}`，但 `news` 表本身没有 `stockCode` 字段
- `queueNewsForAnalysis()` 查询待分析新闻用 `LIKE ${stockCode + '_%'}` 匹配 uniqueKey
- 但如果新闻的 `analyzeStatus` 被更新为 `analyzing`（在 EventAnalyzeConsumer 中），后续重新查询时会被跳过
- **核心问题**：Consumer 保存新闻后没有自动触发信号生成，需要用户手动点击「生成信号」按钮

### 断点 3：回测功能与股票追踪脱节
- 前端「执行回测」按钮只是跳转到回测管理页面（`navigate("/backtest")`），没有在追踪详情页内直接执行
- 回测需要用户手动选择策略、时间范围等，没有与追踪记录自动关联
- 无法基于单条新闻的信号进行回测

### 断点 4：研投报告数据不完整
- `getLatestBacktestResult()` 查的是全局最新回测记录，不是该股票的回测记录
- 报告中的信号统计使用 `direction === 'bullish' || 'bearish'`，但系统实际存的是 `action === 'long' || 'short'`（新信号系统）

### 断点 5：前端回测流程不完整
- 追踪详情页没有策略选择器
- 没有一键回测功能
- 回测后不会自动刷新研投报告

---

## 修复方案

### 1. 修复新闻保存和关联（后端）

**文件**: `stock-track-fetch.consumer.ts`
- 统一 uniqueKey 格式为 `${stockCode}_${hash}`，确保与查询一致
- 保存新闻后自动触发信号生成（将新闻入队 EVENT_ANALYZE），无需手动操作

**文件**: `stock-tracking.service.ts`
- 修复 `saveNews()` 的 uniqueKey 格式与 Consumer 一致
- 修复 `getTrackingNews()` 查询逻辑
- 修复 `queueNewsForAnalysis()` 查询逻辑

### 2. 修复信号生成流程（后端）

**文件**: `stock-tracking.service.ts`
- `queueNewsForAnalysis()` 发送消息时带上 `stockCode` 参数，确保事件只生成该股票的信号
- Consumer 已经支持 `stockCode` 过滤，无需修改

### 3. 新增追踪详情页回测功能（后端 + 前端）

**后端**: `stock-tracking.controller.ts`
- 新增 `POST /stock-trackings/:id/backtest` 接口
  - 参数：`strategyId`、`period`（可选，默认 4h）
  - 自动根据追踪的新闻时间范围确定回测区间
  - 自动设置 `stockCode` 过滤
  - 调用 `BacktestService.createBacktest()` 创建回测记录

**前端**: `[id].tsx`
- 将「执行回测」按钮改为弹出策略选择 Modal
- Modal 中展示策略列表供选择
- 选择策略后调用新接口执行回测
- 回测完成后自动刷新回测记录列表

### 4. 修复研投报告（后端）

**文件**: `stock-tracking.service.ts`
- `getLatestBacktestResult()` 改为按 `stockCode` 过滤，只查该股票的回测记录
- `getTrackingSignals()` 修复信号方向判断：`action === 'long'` 而不是 `direction === 'bullish'`
- 报告 prompt 增加回测数据的详细程度

### 5. 修复前端信号查询（前端）

**文件**: `[id].tsx`
- 信号查询改用 `symbol` 参数（新系统用 `symbol` 而不是 `stockCode`）

---

## 实施步骤

1. 修复 `stock-track-fetch.consumer.ts`：统一 uniqueKey 格式 + 保存后自动入队分析
2. 修复 `stock-tracking.service.ts`：uniqueKey 格式、查询逻辑、信号方向判断、回测查询
3. 新增回测 API：`StockTrackingController` + `StockTrackingService`
4. 修复前端 `[id].tsx`：策略选择 Modal + 一键回测 + 信号查询修复
5. 构建验证
