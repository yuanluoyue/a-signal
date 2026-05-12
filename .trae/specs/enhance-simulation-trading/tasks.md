# Tasks

- [x] Task 1: 数据库 Schema 变更 - 新增字段和新表
  - [x] SubTask 1.1: simulation_positions 表新增 takeProfitPrice、stopLossPrice、tradeSource 字段
  - [x] SubTask 1.2: simulation_trades 表新增 closeReason、tradeSource 字段
  - [x] SubTask 1.3: 新增 simulation_equity_curve 表
  - [x] SubTask 1.4: 运行 drizzle-kit generate 生成迁移文件

- [x] Task 2: 后端 - 实时价格获取与盈亏刷新
  - [x] SubTask 2.1: SimulationModule 导入 KlinesModule，注入 KlinesService
  - [x] SubTask 2.2: SimulationService 新增 getLatestPrice(stockCode) 方法，调用 KlinesService.checkAndUpdateKlines 后查询最新 4h close 价格
  - [x] SubTask 2.3: SimulationService 新增 refreshPositionPrices(accountId) 方法，批量刷新所有持仓的实时价格并更新 currentPrice/marketValue/profit/return
  - [x] SubTask 2.4: SimulationService 新增 refreshAccountEquity(accountId) 方法，重新计算账户的 currentCapital/totalProfit/totalReturn
  - [x] SubTask 2.5: SimulationController 新增 GET /simulation/refresh 接口，触发价格刷新和盈亏重算

- [x] Task 3: 后端 - 实时价格交易
  - [x] SubTask 3.1: 修改 ExecuteTradeDto，移除 price 必填，新增 takeProfitPrice/stopLossPrice 可选字段
  - [x] SubTask 3.2: 修改 SimulationService.executeTrade，买入时自动获取实时价格，保存止盈止损和 tradeSource
  - [x] SubTask 3.3: 修改 SimulationService.executeTrade，卖出时自动获取实时价格，记录 closeReason 和 tradeSource

- [x] Task 4: 后端 - 资金曲线
  - [x] SubTask 4.1: SimulationService 新增 recordEquityCurve(accountId) 方法，记录资金曲线数据点
  - [x] SubTask 4.2: 在 executeTrade 完成后自动调用 recordEquityCurve
  - [x] SubTask 4.3: SimulationController 新增 GET /simulation/equity-curve 接口，返回资金曲线数据
  - [x] SubTask 4.4: SimulationService 新增 getEquityCurve(accountId) 方法

- [x] Task 5: 后端 - 止盈止损自动平仓
  - [x] SubTask 5.1: SimulationService 新增 checkTakeProfitStopLoss(accountId) 方法，检查所有持仓是否触发止盈止损
  - [x] SubTask 5.2: 在 refreshPositionPrices 后调用 checkTakeProfitStopLoss，触发自动平仓
  - [x] SubTask 5.3: 自动平仓时 closeReason 记录为 'take_profit' 或 'stop_loss'，tradeSource 记录为 'system'

- [x] Task 6: 后端 - 添加持仓接口适配
  - [x] SubTask 6.1: 修改 AddPositionDto，新增 takeProfitPrice/stopLossPrice 可选字段
  - [x] SubTask 6.2: 修改 SimulationService.addPosition，保存止盈止损和 tradeSource 字段

- [x] Task 7: 前端 - 股票搜索选择交互改造
  - [x] SubTask 7.1: 添加持仓弹窗 - 股票代码改为 Select 搜索组件（参考 stock-trackings 页面），stockName 自动填充且只读
  - [x] SubTask 7.2: 模拟交易弹窗 - 股票改为 Select 搜索组件，stockName 自动填充且只读
  - [x] SubTask 7.3: 模拟交易弹窗 - 选择股票后自动获取实时价格并填入价格字段（只读）

- [x] Task 8: 前端 - 实时盈亏展示
  - [x] SubTask 8.1: 页面加载时调用 /simulation/refresh 接口刷新实时价格和盈亏
  - [x] SubTask 8.2: 持仓列表展示刷新后的实时盈亏数据

- [x] Task 9: 前端 - 资金曲线图表
  - [x] SubTask 9.1: 新增资金曲线 Tab，使用折线图展示总权益随时间变化
  - [x] SubTask 9.2: 调用 GET /simulation/equity-curve 接口获取数据

- [x] Task 10: 前端 - 止盈止损与平仓理由
  - [x] SubTask 10.1: 模拟交易弹窗买入时增加止盈价格和止损价格可选输入框
  - [x] SubTask 10.2: 交易记录列表增加平仓理由列，展示手动/止盈/止损/Agent 等标签

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1, Task 2]
- [Task 4] depends on [Task 1, Task 2]
- [Task 5] depends on [Task 2, Task 3]
- [Task 6] depends on [Task 1]
- [Task 7] depends on [Task 3] (后端接口变更完成后再改前端)
- [Task 8] depends on [Task 2]
- [Task 9] depends on [Task 4]
- [Task 10] depends on [Task 3, Task 6]
