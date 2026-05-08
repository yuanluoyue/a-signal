# 替换向量化服务为 Transformers.js 规范

## Why

当前系统使用火山引擎的 Doubao-embedding-vision-251215 模型进行新闻向量化，这需要依赖外部 API 和付费服务。为了降低成本和依赖，改用本地运行的 @xenova/transformers 库的 MiniLM 模型进行向量化，同时记录向量化使用的模型信息，便于后续管理和追踪。

## What Changes

### 新增功能
1. **本地向量化** - 在 VectorService 中集成 @xenova/transformers 的 MiniLM 模型进行文本向量化
2. **模型信息记录** - 在数据库中记录每条新闻使用的向量化模型
3. **重新向量化功能** - 支持删除旧向量并重新生成，用于迁移到新模型

### 数据库表变更
- **BREAKING** `news` 表新增 `embedding_model` 字段 - 存储向量化使用的模型名称

### 服务变更
- 重构 `VectorService` - 集成 @xenova/transformers 向量化功能
- 移除 `VolcengineEmbeddingService` 的使用 - 不再调用火山引擎 API
- 更新 `NewsVectorizeConsumer` - 使用 VectorService 的向量化方法并记录模型信息
- 新增重新向量化 API - 删除旧向量并重新生成

### 前端变更
- 新闻详情页新增"重新向量化"按钮 - 用于重新生成向量

### 依赖变更
- 新增 `@xenova/transformers` 依赖

## Impact

### 受影响模块
- `apps/backend/src/core/vector/vector.service.ts` - 重构，集成向量化功能
- `apps/backend/src/jobs/news-vectorize.consumer.ts` - 更新消费者逻辑
- `apps/backend/src/modules/news/news.service.ts` - 新增重新向量化方法
- `apps/backend/src/interfaces/admin/news/news.controller.ts` - 新增重新向量化 API
- `apps/backend/src/core/db/schema.ts` - 数据库 schema 变更
- `apps/frontend/src/pages/news/[id].tsx` - 新增重新向量化按钮
- `apps/backend/package.json` - 新增依赖

### 向后兼容性
- 已向量化的新闻数据保留在 ChromaDB 中
- 新的向量化使用 MiniLM 模型，向量维度可能与火山引擎不同
- 通过"重新向量化"功能可以迁移旧数据

## ADDED Requirements

### Requirement 1: VectorService 集成本地向量化

#### Scenario 1.1: 初始化模型
- **GIVEN** VectorService 实例化时
- **WHEN** 调用向量化方法
- **THEN** 自动加载并缓存 MiniLM 模型（Xenova/paraphrase-multilingual-MiniLM-L12-v2）
- **AND** 模型缓存在本地，避免重复下载

#### Scenario 1.2: 文本向量化
- **GIVEN** 需要向量化的文本
- **WHEN** 调用 VectorService.generateEmbedding(text) 方法
- **THEN** 使用 MiniLM 模型生成向量
- **AND** 返回固定维度的浮点数数组
- **AND** 记录向量化日志

#### Scenario 1.3: 批量向量化
- **GIVEN** 多条需要向量化的文本
- **WHEN** 调用 VectorService.generateBatchEmbeddings(texts) 方法
- **THEN** 依次对每条文本进行向量化
- **AND** 返回向量数组

### Requirement 2: 模型信息记录

#### Scenario 2.1: 数据库字段新增
- **GIVEN** news 表需要记录模型信息
- **WHEN** 执行数据库迁移
- **THEN** 新增 `embedding_model` 字段（varchar(100)，nullable）
- **AND** 该字段存储模型名称，如 "Xenova/paraphrase-multilingual-MiniLM-L12-v2"

#### Scenario 2.2: 向量化时记录模型
- **GIVEN** 新闻向量化完成
- **WHEN** 更新新闻状态为 vectorized
- **THEN** 同时更新 embedding_model 字段
- **AND** 记录使用的模型名称

#### Scenario 2.3: 查询时展示模型
- **GIVEN** 用户查看新闻详情
- **WHEN** 新闻已向量化
- **THEN** 显示使用的向量化模型名称

### Requirement 3: 重新向量化功能

#### Scenario 3.1: 后端 API
- **GIVEN** 用户需要重新向量化新闻
- **WHEN** 调用 POST /api/v1/news/:id/re-vectorize
- **THEN** 删除 ChromaDB 中的旧向量
- **AND** 重置 vectorizeStatus 为 pending
- **AND** 清空 embeddingModel 字段
- **AND** 触发新的向量化任务

#### Scenario 3.2: 前端按钮
- **GIVEN** 用户在新闻详情页
- **WHEN** 新闻已向量化
- **THEN** 显示"重新向量化"按钮
- **AND** 点击按钮调用重新向量化 API
- **AND** 显示操作成功提示

#### Scenario 3.3: 批量重新向量化
- **GIVEN** 管理员需要批量迁移旧数据
- **WHEN** 调用 POST /api/v1/news/batch-re-vectorize
- **THEN** 批量删除旧向量
- **AND** 批量触发重新向量化任务

### Requirement 4: 向量化消费者更新

#### Scenario 4.1: 使用 VectorService 向量化
- **GIVEN** 新闻向量化任务
- **WHEN** 消费者处理任务
- **THEN** 调用 VectorService.generateEmbedding 方法
- **AND** 不再调用 VolcengineEmbeddingService

#### Scenario 4.2: 错误处理
- **GIVEN** 向量化失败
- **WHEN** 模型加载失败或推理失败
- **THEN** 记录错误日志
- **AND** 更新新闻状态为 failed
- **AND** 不影响其他新闻的向量化

## MODIFIED Requirements

### Requirement M1: 数据库 Schema
**修改内容**: 在 news 表中新增 embedding_model 字段

```typescript
embeddingModel: varchar('embedding_model', { length: 100 })
```

### Requirement M2: VectorService 重构
**修改内容**: 
- 集成 @xenova/transformers 库
- 新增 generateEmbedding 方法
- 新增 generateBatchEmbeddings 方法
- 保留原有的 ChromaDB 操作方法

### Requirement M3: NewsVectorizeConsumer
**修改内容**: 
- 移除 VolcengineEmbeddingService 依赖
- 直接使用 VectorService 的向量化方法
- 向量化完成后更新 embedding_model 字段

## REMOVED Requirements

### Requirement R1: 火山引擎向量化
**Reason**: 改用本地模型，降低成本和外部依赖
**Migration**: 
- VolcengineEmbeddingService 保留但不使用
- 已有向量数据保留在 ChromaDB 中
- 通过"重新向量化"功能迁移到新模型
