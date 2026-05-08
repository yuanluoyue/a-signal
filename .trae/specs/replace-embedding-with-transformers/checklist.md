# Checklist

## 数据库变更
- [x] news 表新增 embedding_model 字段
- [x] 迁移文件已生成（使用 drizzle-kit generate）
- [x] 数据库迁移已执行

## 依赖管理
- [x] @xenova/transformers 已添加到 package.json
- [x] 依赖已安装（pnpm install）

## VectorService 重构
- [x] VectorService 已集成 @xenova/transformers
- [x] generateEmbedding 方法实现正确，使用 MiniLM 模型
- [x] generateBatchEmbeddings 方法实现正确
- [x] 模型缓存配置正确
- [x] 模型名称常量已定义

## 消费者更新
- [x] NewsVectorizeConsumer 已移除 VolcengineEmbeddingService 依赖
- [x] NewsVectorizeConsumer 使用 VectorService.generateEmbedding
- [x] 向量化完成后更新 embeddingModel 字段

## NewsService 更新
- [x] updateEmbeddingModel 方法已添加
- [x] reVectorizeNews 方法已添加（删除旧向量 + 重置状态）
- [x] 新闻详情 API 返回 embeddingModel 字段

## API 接口
- [x] POST /news/:id/re-vectorize 接口已实现
- [x] 接口正确删除旧向量
- [x] 接口正确重置状态并触发新任务
- [x] 接口返回正确的响应

## 前端功能
- [x] 新闻详情页显示"重新向量化"按钮
- [x] 按钮点击调用正确的 API
- [x] 操作成功/失败提示正确显示
- [x] 显示当前使用的向量化模型信息

## 功能验证
- [x] 后端服务启动成功，模型自动下载
- [x] 手动触发新闻向量化成功
- [x] 向量化状态更新为 vectorized
- [x] embeddingModel 字段记录正确的模型名称
- [x] 新闻详情页显示模型信息
- [x] 重新向量化功能正常工作
- [x] 旧向量被正确删除
- [x] 新向量生成成功
- [x] 错误处理正确，失败时状态更新为 failed

## 日志记录
- [x] 向量化过程有详细日志
- [x] 错误日志清晰可追踪
- [x] 重新向量化操作有日志记录
