# Tasks

- [x] Task 1: 安装 @xenova/transformers 依赖
  - [x] SubTask 1.1: 在 apps/backend/package.json 中添加 @xenova/transformers 依赖
  - [x] SubTask 1.2: 执行 pnpm install 安装依赖

- [x] Task 2: 数据库 Schema 变更
  - [x] SubTask 2.1: 在 news 表中添加 embeddingModel 字段（varchar(100), nullable）
  - [x] SubTask 2.2: 使用 drizzle-kit generate 生成迁移文件
  - [x] SubTask 2.3: 执行数据库迁移

- [x] Task 3: 重构 VectorService
  - [x] SubTask 3.1: 在 VectorService 中集成 @xenova/transformers
  - [x] SubTask 3.2: 实现 generateEmbedding 方法，使用 Xenova/paraphrase-multilingual-MiniLM-L12-v2 模型
  - [x] SubTask 3.3: 实现 generateBatchEmbeddings 方法
  - [x] SubTask 3.4: 添加模型缓存配置，避免重复下载
  - [x] SubTask 3.5: 添加模型名称常量 MODEL_NAME

- [x] Task 4: 更新 NewsVectorizeConsumer
  - [x] SubTask 4.1: 移除 VolcengineEmbeddingService 依赖
  - [x] SubTask 4.2: 更新 processMessage 方法，调用 VectorService.generateEmbedding
  - [x] SubTask 4.3: 向量化完成后更新 news.embeddingModel 字段

- [x] Task 5: 更新 NewsService
  - [x] SubTask 5.1: 添加 updateEmbeddingModel 方法
  - [x] SubTask 5.2: 添加 reVectorizeNews 方法（删除旧向量 + 重置状态）
  - [x] SubTask 5.3: 在新闻详情 API 中返回 embeddingModel 字段

- [x] Task 6: 新增重新向量化 API
  - [x] SubTask 6.1: 在 NewsController 中添加 POST /news/:id/re-vectorize 接口
  - [x] SubTask 6.2: 在 NewsController 中添加 POST /news/batch-re-vectorize 接口（可选）

- [x] Task 7: 前端添加重新向量化按钮
  - [x] SubTask 7.1: 在新闻详情页添加"重新向量化"按钮
  - [x] SubTask 7.2: 实现调用重新向量化 API 的逻辑
  - [x] SubTask 7.3: 添加操作成功/失败的提示
  - [x] SubTask 7.4: 显示当前使用的向量化模型信息

- [x] Task 8: 测试验证
  - [x] SubTask 8.1: 启动后端服务，验证模型自动下载
  - [x] SubTask 8.2: 手动触发新闻向量化，验证向量化成功
  - [x] SubTask 8.3: 检查数据库 embeddingModel 字段是否正确记录
  - [x] SubTask 8.4: 测试重新向量化功能，验证旧向量被删除
  - [x] SubTask 8.5: 验证新闻详情页显示模型信息

# Task Dependencies

- [Task 2] depends on [Task 1] (需要先安装依赖才能使用向量化功能)
- [Task 3] depends on [Task 1] (需要依赖安装完成)
- [Task 4] depends on [Task 2, Task 3] (需要数据库字段和向量化方法都准备好)
- [Task 5] depends on [Task 2] (需要数据库字段)
- [Task 6] depends on [Task 5] (需要 NewsService 方法)
- [Task 7] depends on [Task 6] (需要 API 接口)
- [Task 8] depends on [Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7] (所有功能完成后测试)
