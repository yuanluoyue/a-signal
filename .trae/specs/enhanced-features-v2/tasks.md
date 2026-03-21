# 增强功能 v2 任务列表

## 阶段一：数据库设计与迁移

### Task 1: 数据库 Schema 设计与迁移
- [x] SubTask 1.1: 创建 simulation_accounts 表（模拟账户）
- [x] SubTask 1.2: 创建 simulation_positions 表（模拟持仓）
- [x] SubTask 1.3: 创建 simulation_trades 表（模拟交易记录）
- [x] SubTask 1.4: 创建 stock_blacklist 表（股票黑名单）
- [x] SubTask 1.5: 创建 stock_trackings 表（股票追踪）
- [x] SubTask 1.6: 创建 backtest_records 表（回测记录）
- [x] SubTask 1.7: 修改 webhooks 表 - 添加 minConfidence 和 maxConfidence 字段
- [x] SubTask 1.8: 生成并执行 Drizzle 迁移

---

## 阶段二：后端基础服务开发

### Task 2: 向量服务封装
- [x] SubTask 2.1: 创建 VolcengineEmbeddingService 服务
- [x] SubTask 2.2: 实现 Doubao-embedding-vision-251215 模型调用
- [x] SubTask 2.3: 实现文本向量化接口
- [x] SubTask 2.4: 集成 ChromaDB 存储向量

### Task 3: 队列扩展
- [x] SubTask 3.1: 添加 NEWS_VECTORIZE 队列
- [x] SubTask 3.2: 添加 STOCK_TRACK_FETCH 队列
- [x] SubTask 3.3: 实现新闻向量化消费者
- [x] SubTask 3.4: 实现股票追踪新闻获取消费者

### Task 4: 黑名单服务
- [x] SubTask 4.1: 创建 BlacklistModule 模块
- [x] SubTask 4.2: 实现黑名单 CRUD 服务
- [x] SubTask 4.3: 修改通知服务 - 过滤黑名单股票

---

## 阶段三：新闻向量化功能

### Task 5: 新闻向量化 API
- [x] SubTask 5.1: 实现 POST /news/:id/vectorize 单条向量化接口
- [x] SubTask 5.2: 实现 POST /news/batch-vectorize 批量向量化接口
- [x] SubTask 5.3: 实现 GET /news/vectorize-progress 进度统计接口
- [x] SubTask 5.4: 修改 news 表状态 - 增加 vectorizing 状态

---

## 阶段四：账户模拟功能

### Task 6: 模拟账户 API
- [x] SubTask 6.1: 创建 SimulationModule 模块
- [x] SubTask 6.2: 实现 GET /simulation/account 获取账户接口
- [x] SubTask 6.3: 实现 POST /simulation/account 创建账户接口
- [x] SubTask 6.4: 实现 PUT /simulation/account 更新账户接口
- [x] SubTask 6.5: 实现 GET /simulation/positions 获取持仓接口
- [x] SubTask 6.6: 实现 POST /simulation/trade 执行交易接口
- [x] SubTask 6.7: 实现 GET /simulation/trades 获取交易记录接口

---

## 阶段五：股票查询功能

### Task 7: 股票服务
- [x] SubTask 7.1: 创建 StocksModule 模块
- [x] SubTask 7.2: 实现 GET /stocks 股票列表接口（过滤黑名单）
- [x] SubTask 7.3: 实现 GET /stocks/:code 股票详情接口
- [x] SubTask 7.4: 实现 GET /stocks/:code/signals 历史信号接口
- [x] SubTask 7.5: 实现 GET /stocks/:code/klines K线数据接口

---

## 阶段六：股票追踪功能

### Task 8: 股票追踪服务
- [x] SubTask 8.1: 创建 StockTrackingModule 模块
- [x] SubTask 8.2: 实现 GET /stock-trackings 追踪列表接口
- [x] SubTask 8.3: 实现 POST /stock-trackings 创建追踪接口
- [x] SubTask 8.4: 实现 GET /stock-trackings/:id 追踪详情接口
- [x] SubTask 8.5: 实现 POST /stock-trackings/:id/fetch-news 获取历史新闻接口
- [x] SubTask 8.6: 使用 doubao-seed-2-0-lite-260215 模型 + 联网搜索
- [x] SubTask 8.7: 使用 LangChain 格式化输出
- [x] SubTask 8.8: 实现新闻去重与存储

### Task 9: 股票追踪信号与回测
- [x] SubTask 9.1: 实现 POST /stock-trackings/:id/generate-signals 生成信号接口
- [x] SubTask 9.2: 复用信号生成逻辑，非近期信号不发送 webhook
- [x] SubTask 9.3: 实现 POST /stock-trackings/:id/backtest 执行回测接口
- [x] SubTask 9.4: 实现 GET /stock-trackings/:id/backtest-result 获取回测结果接口
- [x] SubTask 9.5: 实现 POST /stock-trackings/:id/generate-report 生成研投报告接口
- [x] SubTask 9.6: 研投报告 200 字左右，结合新闻和回测结果

---

## 阶段七：回测功能完善

### Task 10: 回测记录功能
- [x] SubTask 10.1: 修改 BacktestModule 保存回测记录
- [x] SubTask 10.2: 实现 GET /backtest/records 回测记录列表接口
- [x] SubTask 10.3: 实现 GET /backtest/records/:id 回测详情接口
- [x] SubTask 10.4: 实现交易详情存储与查询

---

## 阶段八：Dashboard 增强

### Task 11: Dashboard API 增强
- [x] SubTask 11.1: 修改 GET /dashboard/stats 增加股票数量统计
- [x] SubTask 11.2: 修改 GET /dashboard/stats 增加回测最高记录
- [x] SubTask 11.3: 移除活跃信号和待分析信号统计

---

## 阶段九：功能优化

### Task 12: 新闻功能优化
- [x] SubTask 12.1: 新闻列表页移除删除按钮
- [x] SubTask 12.2: 新闻详情页顶部添加操作按钮（删除、分析）
- [ ] SubTask 12.3: 修改新闻列表关联股票显示逻辑（显示信号关联的股票）

### Task 13: 分页优化
- [x] SubTask 13.1: 修改后端所有分页接口默认 pageSize 为 10
- [x] SubTask 13.2: 修改前端所有分页组件默认 pageSize 为 10

### Task 14: 通知设置优化
- [x] SubTask 14.1: 修改 webhooks 表结构支持置信度范围
- [x] SubTask 14.2: 修改创建/更新 Webhook 接口支持范围
- [x] SubTask 14.3: 修改通知逻辑使用范围判断

### Task 15: 表格按钮优化
- [x] SubTask 15.1: 统一所有表格操作按钮为 size="small"

### Task 16: 信号详情页优化
- [ ] SubTask 16.1: 修改默认展示 4h K 线
- [ ] SubTask 16.2: 4h K 线绘制买卖点标记

### Task 17: 页面布局优化
- [x] SubTask 17.1: 修改 MainLayout 固定 Header 和菜单栏
- [x] SubTask 17.2: 内容区域独立滚动
- [x] SubTask 17.3: Header 使用深色主题与菜单栏区分

---

## 阶段十：前端页面开发

### Task 18: 新闻向量化页面
- [x] SubTask 18.1: 新闻列表页添加一键向量化按钮
- [x] SubTask 18.2: 添加向量化进度统计展示
- [x] SubTask 18.3: 添加单条新闻向量化按钮

### Task 19: 账户模拟页面
- [x] SubTask 19.1: 创建 /simulation 页面
- [x] SubTask 19.2: 实现账户资金展示
- [x] SubTask 19.3: 实现持仓列表展示
- [x] SubTask 19.4: 实现模拟交易表单
- [x] SubTask 19.5: 实现交易记录列表

### Task 20: 股票查询页面
- [x] SubTask 20.1: 创建 /stocks 列表页面
- [x] SubTask 20.2: 创建 /stocks/:code 详情页面
- [x] SubTask 20.3: 复用 K 线图组件
- [x] SubTask 20.4: 实现信号标记功能

### Task 21: 黑名单页面
- [x] SubTask 21.1: 创建 /blacklist 页面
- [x] SubTask 21.2: 实现黑名单列表
- [x] SubTask 21.3: 实现添加/移除黑名单功能

### Task 22: 股票追踪页面
- [x] SubTask 22.1: 创建 /stock-trackings 列表页面
- [x] SubTask 22.2: 创建 /stock-trackings/:id 详情页面
- [x] SubTask 22.3: 实现创建追踪表单
- [x] SubTask 22.4: 实现历史新闻展示
- [x] SubTask 22.5: 实现一键生成信号按钮
- [x] SubTask 22.6: 实现回测功能按钮
- [x] SubTask 22.7: 实现研投报告展示

### Task 23: 回测页面完善
- [ ] SubTask 23.1: 修改回测页面为列表展示
- [ ] SubTask 23.2: 实现回测详情弹窗
- [ ] SubTask 23.3: 弹窗内展示每笔交易详情

### Task 24: Dashboard 页面
- [ ] SubTask 24.1: 修改 Dashboard 统计数据展示
- [ ] SubTask 24.2: 移除活跃信号和数据概览卡片
- [ ] SubTask 24.3: 添加回测最高记录展示

### Task 25: 菜单更新
- [x] SubTask 25.1: 添加股票查询菜单
- [x] SubTask 25.2: 添加账户模拟菜单
- [x] SubTask 25.3: 添加黑名单菜单
- [x] SubTask 25.4: 添加股票追踪菜单

---

## 任务依赖关系

```
阶段一 (Task 1) -> 阶段二 (Task 2-4)
阶段二 (Task 2) -> 阶段三 (Task 5)
阶段一 (Task 1) -> 阶段四 (Task 6)
阶段一 (Task 1) -> 阶段五 (Task 7)
阶段一 (Task 1) -> 阶段六 (Task 8-9)
阶段一 (Task 1) -> 阶段七 (Task 10)
阶段一 (Task 1) -> 阶段八 (Task 11)

阶段三 (Task 5) -> 阶段十 (Task 18)
阶段四 (Task 6) -> 阶段十 (Task 19)
阶段五 (Task 7) -> 阶段十 (Task 20)
阶段二 (Task 4) -> 阶段十 (Task 21)
阶段六 (Task 8-9) -> 阶段十 (Task 22)
阶段七 (Task 10) -> 阶段十 (Task 23)
阶段八 (Task 11) -> 阶段十 (Task 24)
```

## 并行执行建议

1. **阶段一、阶段二可以并行开发**（依赖数据库设计）
2. **阶段三、四、五、六、七、八可以并行开发**（依赖阶段一完成）
3. **阶段九的优化任务可以并行开发**
4. **阶段十的前端页面可以并行开发**（依赖对应后端 API）
