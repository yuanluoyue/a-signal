# A Signal 增强功能 v2 规格文档

## 概述

基于现有 A Signal 股票分析系统进行迭代，增加新闻向量化、账户模拟、股票查询、黑名单、股票追踪、回测优化等功能，并对现有功能进行优化改进。

---

## 新功能

### 1. 新闻向量化功能

#### 需求描述
每条新闻可以单独向量化，新闻列表页也有一键向量化功能，点击可以将所有新闻向量化。向量化的任务需要进入 MQ，新闻列表页显示所有新闻的向量化进度统计。

#### 技术方案
- 使用 Doubao-embedding-vision-251215 模型进行向量化
- 向量化状态包含：`pending`（待处理）、`vectorizing`（向量化中）、`vectorized`（已完成）、`failed`（失败）
- 按新闻 PG ID 写入 ChromaDB
- 通过 RabbitMQ 队列异步处理向量化任务

#### API 设计
```
POST /api/v1/news/:id/vectorize          # 单条新闻向量化
POST /api/v1/news/batch-vectorize        # 批量向量化（所有待处理新闻）
GET  /api/v1/news/vectorize-progress     # 获取向量化进度统计
```

---

### 2. 账户模拟页面

#### 需求描述
用户可以记录自己的持仓和资金，并且能进行模拟交易，需要记录下模拟交易记录。

#### 数据库表设计
```sql
-- 模拟账户表
simulation_accounts (
  id: uuid,
  userId: uuid,
  initialCapital: decimal,
  currentCapital: decimal,
  availableCash: decimal,
  totalProfit: decimal,
  totalReturn: decimal,
  createdAt: timestamp,
  updatedAt: timestamp
)

-- 模拟持仓表
simulation_positions (
  id: uuid,
  accountId: uuid,
  stockCode: varchar,
  stockName: varchar,
  quantity: integer,
  avgCost: decimal,
  currentPrice: decimal,
  marketValue: decimal,
  profit: decimal,
  return: decimal,
  createdAt: timestamp,
  updatedAt: timestamp
)

-- 模拟交易记录表
simulation_trades (
  id: uuid,
  accountId: uuid,
  stockCode: varchar,
  stockName: varchar,
  type: varchar, -- buy/sell
  quantity: integer,
  price: decimal,
  totalAmount: decimal,
  profit: decimal, -- 卖出时记录盈亏
  tradeTime: timestamp,
  createdAt: timestamp
)
```

#### API 设计
```
GET    /api/v1/simulation/account          # 获取账户信息
POST   /api/v1/simulation/account          # 创建账户
PUT    /api/v1/simulation/account          # 更新账户资金
GET    /api/v1/simulation/positions        # 获取持仓列表
POST   /api/v1/simulation/trade            # 执行模拟交易
GET    /api/v1/simulation/trades           # 获取交易记录
```

---

### 3. 股票查询页面

#### 需求描述
列出系统中已生成过信号的股票，点击查看可以进入股票详情，股票详情显示 K 线，以及标记出对应信号在 K 线中的位置（复用信号详情页的组件）。

#### API 设计
```
GET /api/v1/stocks                         # 获取有信号的股票列表
GET /api/v1/stocks/:code                   # 获取股票详情
GET /api/v1/stocks/:code/signals           # 获取股票历史信号
GET /api/v1/stocks/:code/klines            # 获取股票 K 线数据
```

#### 页面设计
- 股票列表页：展示股票代码、名称、信号数量、最新信号时间
- 股票详情页：
  - K 线图（支持 1d/4h 切换）
  - 信号标记（买入/卖出箭头）
  - 历史信号列表
  - 基本信息展示

---

### 4. 黑名单页面

#### 需求描述
可以选择屏蔽股票，新闻分析的时候不限制生成信号，但屏蔽的股票不会发送 webhook 通知，也不会在股票列表展示。

#### 数据库表设计
```sql
stock_blacklist (
  id: uuid,
  stockCode: varchar,
  stockName: varchar,
  reason: text,
  createdAt: timestamp,
  updatedAt: timestamp
)
```

#### API 设计
```
GET    /api/v1/blacklist                   # 获取黑名单列表
POST   /api/v1/blacklist                   # 添加黑名单
DELETE /api/v1/blacklist/:id               # 移除黑名单
```

#### 业务逻辑
- 信号生成时正常生成（用于回测等用途）
- Webhook 通知时过滤黑名单股票
- 股票列表页过滤黑名单股票

---

### 5. 股票追踪页面

#### 需求描述
需要在菜单栏增加新菜单，这个页面可以输入某个股票，点击回溯历史按钮，后端通过 doubao-seed-2-0-lite-260215 模型，提问（搜索 100 条最近一年关于该股票的新闻，按照时间排序，并且给出具体时间，不足 100 条则返回最多条，每条新闻摘要返回 150 字以内）返回的内容需要用 langchain 进行格式化约束，要启用模型的联网能力，这些新闻获取后需要写入数据库，按照之前的表结构。

#### 数据库表设计
```sql
stock_trackings (
  id: uuid,
  stockCode: varchar,
  stockName: varchar,
  status: varchar, -- pending/processing/completed/failed
  totalNews: integer,
  createdAt: timestamp,
  updatedAt: timestamp
)
```

#### API 设计
```
GET    /api/v1/stock-trackings             # 获取追踪列表
POST   /api/v1/stock-trackings             # 创建股票追踪
GET    /api/v1/stock-trackings/:id         # 获取追踪详情
POST   /api/v1/stock-trackings/:id/fetch-news  # 触发获取历史新闻
POST   /api/v1/stock-trackings/:id/generate-signals  # 生成历史信号
POST   /api/v1/stock-trackings/:id/backtest        # 执行回测
GET    /api/v1/stock-trackings/:id/backtest-result # 获取回测结果
POST   /api/v1/stock-trackings/:id/generate-report # 生成研投报告
```

#### 功能说明
1. **历史新闻获取**：使用 doubao-seed-2-0-lite-260215 模型，启用联网能力搜索新闻
2. **信号生成**：复用现有信号生成逻辑，非最近两天的信号不发送 webhook
3. **回测功能**：对历史信号进行回测，可查看每笔交易详情
4. **研投报告**：使用分析新闻的模型，结合历史新闻和回测结果生成 200 字投资建议

---

### 6. Dashboard 页面增强

#### 需求描述
增加股票数量统计，已有新闻数量统计，回测最高记录展示。

#### 统计数据
- 股票总数（有信号的不同股票数量）
- 新闻总数
- 回测最高收益率记录
- 回测最高胜率记录

---

### 7. 回测页面完善

#### 需求描述
回测页面展示的是列表，回测列表点击详情，弹窗展示本次回测的每一笔交易。

#### 功能改进
- 保存回测历史记录
- 回测列表展示
- 详情弹窗展示每笔交易

---

## 功能优化

### 1. 新闻列表页优化
- 删除按钮移到新闻详情页
- 新闻详情的操作按钮放在页面顶部

### 2. 分页默认大小
- 所有有分页的页面，前后端的默认 size 默认为 10

### 3. 通知设置优化
- 置信度阈值可以选择范围（最小值-最大值）

### 4. 表格操作按钮
- 所有表格的操作按钮都使用小尺寸按钮（size="small"）

### 5. 仪表盘页面优化
- 移除活跃信号统计
- 移除数据概览卡片

### 6. 新闻列表关联股票
- 应该展示跟本新闻关联的信号的股票

### 7. 信号详情页优化
- 4h K 线也需要绘制出对应的买卖点
- 进入信号详情页，默认展示 4h K 线

### 8. 页面布局优化
- Header 不应该随着内容滚动
- Header 与菜单栏固定
- 内容在中间滚动
- Header 颜色浅一些，与菜单栏做出区分

---

## 数据库变更

### 新增表
1. `simulation_accounts` - 模拟账户
2. `simulation_positions` - 模拟持仓
3. `simulation_trades` - 模拟交易记录
4. `stock_blacklist` - 股票黑名单
5. `stock_trackings` - 股票追踪
6. `backtest_records` - 回测记录

### 修改表
1. `news` 表 - `vectorizeStatus` 增加 `vectorizing` 状态
2. `webhooks` 表 - `confidenceThreshold` 改为范围存储

---

## 队列新增

```typescript
QUEUE_NAMES = {
  // 现有队列
  NEWS_CRAWL: 'news-crawl',
  NEWS_ANALYZE: 'news-analyze',
  KLINE_FETCH: 'kline-fetch',
  
  // 新增队列
  NEWS_VECTORIZE: 'news-vectorize',       // 新闻向量化
  STOCK_TRACK_FETCH: 'stock-track-fetch', // 股票追踪新闻获取
}
```

---

## 技术实现要点

### 向量化服务
- 封装 VolcengineEmbeddingService
- 支持 Doubao-embedding-vision-251215 模型
- 文本向量化接口
- ChromaDB 集成存储

### 股票追踪服务
- 使用 LangChain 格式化模型输出
- 启用联网搜索能力
- 新闻去重与存储

### 回测记录
- 保存每次回测的参数和结果
- 支持历史回测查询
- 交易详情存储
