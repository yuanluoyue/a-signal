# 股票查询页面重复数据问题修复计划

## 问题分析

### 问题现象
前端股票查询页面显示多条相同股票代码（如 000001）的数据，导致 React key 重复警告。

### 问题根源

1. **AI 分析输出不一致**：AI 分析新闻时提取股票代码和名称，由于 AI 的输出不一致，同一个股票代码可能对应不同的股票名称
   - 例如：000001 可能被识别为 "平安银行"、"平安银行股份有限公司"、"平安银行A股" 等

2. **后端查询逻辑问题**：`findAllWithSignals` 方法使用 `GROUP BY stockCode, stockName`，导致同一个股票代码出现多条记录
   ```typescript
   // 当前代码
   .groupBy(signals.stockCode, signals.stockName)
   ```

3. **前端 key 问题**：前端使用 `rowKey="stockCode"` 作为表格行的 key，如果同一个 `stockCode` 出现多次，会导致 key 重复

### 数据流程
```
新闻 → AI分析 → 提取 stockCode + stockName → 存入 signals 表
                                              ↓
                                    GROUP BY stockCode, stockName
                                              ↓
                                    同一 stockCode 多条记录
```

## 解决方案

### 方案一：后端修复（推荐）

修改 `findAllWithSignals` 方法，只按 `stockCode` 分组，使用聚合函数获取最常见的 `stockName`：

```typescript
// 修改后
.select({
  stockCode: signals.stockCode,
  stockName: sql<string>`MODE() WITHIN GROUP (ORDER BY ${signals.stockName})`,
  signalCount: sql<number>`COUNT(*)`,
  latestSignalTime: sql<Date>`MAX(${signals.signalTime})`,
})
.from(signals)
.groupBy(signals.stockCode)
```

或者使用子查询获取最新的 stockName：

```typescript
.select({
  stockCode: signals.stockCode,
  stockName: sql<string>`(SELECT stock_name FROM signals s2 WHERE s2.stock_code = signals.stock_code ORDER BY signal_time DESC LIMIT 1)`,
  signalCount: sql<number>`COUNT(*)`,
  latestSignalTime: sql<Date>`MAX(${signals.signalTime})`,
})
.from(signals)
.groupBy(signals.stockCode)
```

### 方案二：前端临时修复

使用组合 key 或索引作为 key：

```tsx
<Table
  dataSource={data}
  rowKey={(record, index) => `${record.stockCode}-${index}`}
/>
```

### 方案三：数据清理

提供清理脏数据的功能：
1. 后端已有 `DELETE /stocks/:code/signals` 接口
2. 可以添加批量清理功能

## 实施步骤

### 步骤 1：修复后端查询逻辑
修改 `stocks.service.ts` 的 `findAllWithSignals` 方法，只按 `stockCode` 分组。

### 步骤 2：添加数据清理功能
在股票查询页面添加"清理脏数据"按钮，允许用户删除指定股票的所有信号。

### 步骤 3：前端优化
- 添加删除信号的功能
- 显示信号数量和最新信号时间
- 提供查看详情和删除操作

## 影响范围

### 需要修改的文件

**后端**:
- `apps/backend/src/modules/stocks/stocks.service.ts` - 修复查询逻辑

**前端**:
- `apps/frontend/src/pages/stocks/index.tsx` - 添加清理功能
- `apps/frontend/src/services/stocks.ts` - 添加清理 API（如果不存在）

## 预期收益

1. **消除重复数据**：每个股票代码只显示一条记录
2. **更好的用户体验**：可以清理脏数据
3. **数据一致性**：避免 AI 输出不一致导致的问题
