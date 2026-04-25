# Checklist

## 数据库设计

- [x] stocks 表结构正确
  - [x] 包含所有字段：id, code, name, market, createdAt, updatedAt
  - [x] 有唯一约束（code）
  - [x] Drizzle 迁移文件生成成功

## 后端股票服务

- [x] StockService 正确实现
  - [x] syncFromCninfo 方法正确从巨潮资讯获取数据
  - [x] searchStocks 方法支持关键词搜索
  - [x] findByCode 方法正确返回股票信息
  - [x] findByCodes 方法正确批量查询股票信息

- [x] StockController 正确实现
  - [x] POST /stocks/sync 接口正确同步股票信息
  - [x] GET /stocks/search 接口正确搜索股票

## 后端服务改造

- [x] BlacklistService 改造正确
  - [x] 返回数据包含股票名称

- [x] EventService 改造正确
  - [x] subjects 数据包含股票名称

- [x] StockTrackingService 改造正确
  - [x] 返回数据包含股票名称

- [x] DashboardService 改造正确
  - [x] 最近信号按新 schema 返回
  - [x] 包含股票名称

## 前端页面

- [x] 股票查询页面
  - [x] "获取股票信息"按钮正常工作
  - [x] 同步结果正确显示

- [x] 黑名单页面
  - [x] 股票代码输入支持动态查询
  - [x] 选择股票后自动填充信息

- [x] 事件管理页面
  - [x] 关联标的显示股票名称

- [x] 股票追踪页面
  - [x] 股票代码输入支持动态查询
  - [x] 选择股票后自动填充信息

- [x] 仪表盘页面
  - [x] 最近信号按新 schema 显示
  - [x] 显示股票名称

## 集成验证

- [x] 端到端流程测试
  - [x] 股票信息同步流程正常
  - [x] 黑名单添加流程正常
  - [x] 事件关联标的显示正常
  - [x] 股票追踪添加流程正常
  - [x] 仪表盘信号显示正常
