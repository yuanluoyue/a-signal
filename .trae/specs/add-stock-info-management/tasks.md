# Tasks

## 阶段一：数据库 Schema 变更

- [x] **Task 1**: 新增 stocks 表
  - [x] SubTask 1.1: 在 schema.ts 中新增 stocks 表（id, code, name, market, createdAt, updatedAt）
  - [x] SubTask 1.2: 添加唯一约束（code）和索引
  - [x] SubTask 1.3: 使用 drizzle-kit generate 生成迁移文件

## 阶段二：后端股票服务

- [x] **Task 2**: StockService 核心服务
  - [x] SubTask 2.1: 创建 StockService（syncFromCninfo, searchStocks, findByCode, findByCodes）
  - [x] SubTask 2.2: 创建 StockModule 并注册到 AppModule
  - [x] SubTask 2.3: 实现从巨潮资讯 API 获取股票数据的逻辑

- [x] **Task 3**: 股票管理 API
  - [x] SubTask 3.1: 创建 StockController（POST /stocks/sync, GET /stocks/search）
  - [x] SubTask 3.2: 注册 StockController 到 AppModule

## 阶段三：后端服务改造

- [x] **Task 4**: 修改黑名单服务
  - [x] SubTask 4.1: BlacklistService 添加股票名称查询逻辑
  - [x] SubTask 4.2: GET /blacklist 返回数据包含股票名称

- [x] **Task 5**: 修改事件服务
  - [x] SubTask 5.1: EventService 添加股票名称查询逻辑
  - [x] SubTask 5.2: GET /events/:id 返回数据中 subjects 包含股票名称

- [x] **Task 6**: 修改股票追踪服务
  - [x] SubTask 6.1: StockTrackingService 添加股票名称查询逻辑
  - [x] SubTask 6.2: GET /stock-trackings 返回数据包含股票名称

- [x] **Task 7**: 修改仪表盘服务
  - [x] SubTask 7.1: DashboardService 按新 schema 查询最近信号
  - [x] SubTask 7.2: GET /dashboard 返回数据包含股票名称

## 阶段四：前端页面改造

- [x] **Task 8**: 股票查询页面
  - [x] SubTask 8.1: 添加"获取股票信息"按钮
  - [x] SubTask 8.2: 调用同步 API 并显示结果

- [x] **Task 9**: 黑名单页面
  - [x] SubTask 9.1: 股票代码输入改为 AutoComplete 组件
  - [x] SubTask 9.2: 实现动态查询股票功能
  - [x] SubTask 9.3: 选择股票后自动填充代码和名称

- [x] **Task 10**: 事件管理页面
  - [x] SubTask 10.1: 关联标的列表显示股票名称
  - [x] SubTask 10.2: 从 stocks 表查询股票名称

- [x] **Task 11**: 股票追踪页面
  - [x] SubTask 11.1: 股票代码输入改为 AutoComplete 组件
  - [x] SubTask 11.2: 实现动态查询股票功能
  - [x] SubTask 11.3: 选择股票后自动填充代码和名称

- [x] **Task 12**: 仪表盘页面
  - [x] SubTask 12.1: 最近信号列表按新 schema 显示
  - [x] SubTask 12.2: 显示字段：标的代码、股票名称、动作、分数、生成时间

# Task Dependencies

```
Task 1 -> Task 2 -> Task 3
Task 3 -> Task 8
Task 2 -> Task 4 -> Task 9
Task 2 -> Task 5 -> Task 10
Task 2 -> Task 6 -> Task 11
Task 2 -> Task 7 -> Task 12
```

# 并行执行建议

- Task 1 独立执行（数据库变更）
- Task 2、Task 3 顺序执行（后端股票服务）
- Task 4、Task 5、Task 6、Task 7 可并行（依赖 Task 2）
- Task 8、Task 9、Task 10、Task 11、Task 12 可并行（依赖对应的后端服务）
