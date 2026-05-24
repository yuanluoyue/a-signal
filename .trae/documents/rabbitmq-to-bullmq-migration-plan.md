# 迁移计划：RabbitMQ → BullMQ + 缓存迁移到 Redis

## 概述

将项目中的 RabbitMQ 消息队列替换为 BullMQ（基于 Redis），同时将内存缓存模块迁移到 Redis。BullMQ 和缓存共用同一个 Redis 实例。

## 当前状态分析

### RabbitMQ 使用范围
- **核心模块**：`core/queue/`（5 个文件：service, consumer, types, constants, module）
- **5 个消费者**：`jobs/` 目录下的 NewsCrawlConsumer、KlineFetchConsumer、NewsVectorizeConsumer、StockTrackFetchConsumer、EventAnalyzeConsumer
- **7 个生产者调用点**：SchedulerTasksService、NewsService、NewsController、StocksService、StockTrackingService、StockTrackingController、SignalsController

### 缓存使用范围
- **核心模块**：`core/cache/`（2 个文件：service, module）
- **3 个使用点**：LlmCacheService、KlinesService、SimulationService

### 基础设施
- 3 个 Docker Compose 文件（dev/server/prod）均包含 RabbitMQ
- 环境变量：RABBITMQ_HOST/PORT/USER/PASS
- 部署脚本 `deploy-infra.sh` 包含 RabbitMQ 镜像

---

## 实施步骤

### 第 1 步：安装/卸载依赖包

**安装：**
- `bullmq` — BullMQ 消息队列库
- `ioredis` — Redis 客户端（BullMQ 的 peer dependency，也用于缓存）

**卸载：**
- `amqplib` — RabbitMQ 客户端
- `@types/amqplib` — 类型定义
- `amqp-connection-manager` — RabbitMQ 连接管理
- `@nestjs/microservices` — 未使用，可移除

### 第 2 步：添加 Redis 到 Docker Compose

在 3 个 Docker Compose 文件中：
1. **移除** `rabbitmq` 服务定义
2. **新增** `redis` 服务定义：
   - 镜像：`redis:8.6.3-alpine`
   - 端口：6379（dev 环境映射，server/prod 不对外暴露）
   - 健康检查：`redis-cli ping`
   - 数据卷：`../data/redis:/data`
   - 启动命令：`redis-server --appendonly yes`（开启 AOF 持久化）
3. **更新** backend 服务的：
   - `depends_on`：移除 rabbitmq，添加 redis
   - `environment`：移除 RABBITMQ_*，添加 REDIS_HOST/REDIS_PORT

### 第 3 步：更新环境变量

**移除：**
- `RABBITMQ_HOST`、`RABBITMQ_PORT`、`RABBITMQ_USER`、`RABBITMQ_PASS`、`RABBITMQ_MANAGEMENT_PORT`

**新增：**
- `REDIS_HOST`（默认：redis）
- `REDIS_PORT`（默认：6379）
- `REDIS_PASSWORD`（可选，默认为空）

**涉及文件：**
- `docker/.env.example`
- 3 个 Docker Compose 文件中的 backend environment

### 第 4 步：创建 Redis 连接模块

新建 `core/redis/` 目录：
- `redis.module.ts` — 全局模块，提供 Redis 连接
- `redis.service.ts` — 封装 ioredis，提供连接实例

RedisService 负责：
- 从 ConfigService 读取 REDIS_HOST/REDIS_PORT/REDIS_PASSWORD
- 创建 ioredis 实例
- 实现连接错误处理和重连
- 实现 OnModuleDestroy 生命周期断开连接
- 提供 `getClient()` 方法返回 ioredis 实例（供 CacheService 使用）

### 第 5 步：重写 QueueModule（核心迁移）

#### 5.1 重写 `queue.types.ts`

```typescript
export interface QueueMessage<T = unknown> {
  id: string;
  data: T;
  timestamp: number;
  retryCount?: number;
}

export interface QueueConsumerOptions {
  queueName: string;
  concurrency?: number;      // 替代 prefetch
  maxRetries?: number;       // 默认 3
  backoff?: {                // 退避策略
    type: 'exponential' | 'fixed';
    delay: number;
  };
}

export interface SendMessageOptions {
  delay?: number;            // 延迟投递（毫秒）
  priority?: number;         // 优先级 1-20
}

export type QueueName = 'news-crawl' | 'kline-fetch' | 'news-vectorize' | 'stock-track-fetch' | 'event-analyze';
```

#### 5.2 重写 `queue.constants.ts`

保持队列名不变，移除 DLQ/DELAY 后缀常量（BullMQ 内置支持）：
- 保留 `QUEUE_NAMES` 和 `QUEUE_DELAYS`
- 移除 `DLQ_SUFFIX` 和 `DELAY_QUEUE_SUFFIX`

#### 5.3 重写 `queue.service.ts`

使用 BullMQ 的 `Queue` 类：
- 注入 RedisService 获取连接
- 为每个 QueueName 创建 BullMQ Queue 实例
- `sendMessage()` → 使用 `queue.add()` 添加 job
  - 延迟投递：使用 BullMQ 的 `delay` 选项
  - 优先级：使用 BullMQ 的 `priority` 选项
  - 重试：使用 BullMQ 的 `attempts` 和 `backoff` 选项
- `sendToNewsCrawl()`、`sendToEventAnalyze()`、`sendToKlineFetch()` 保持不变
- 移除 `getChannel()`、`isConnected()` 等方法
- 移除 `setupQueues()`（BullMQ 自动创建）
- 实现 `OnModuleDestroy` 关闭所有 Queue

#### 5.4 重写 `queue.consumer.ts`

使用 BullMQ 的 `Worker` 类：
- `QueueConsumer` 抽象类改为使用 BullMQ Worker
- 注入 RedisService 获取连接
- `onModuleInit()` 中创建 Worker 并注册处理器
- `processMessage()` 保持抽象，子类实现不变
- 重试机制：使用 BullMQ 内置的 `attempts` + `backoff`
- 死信队列：BullMQ 的 `failed` 事件，记录日志
- `concurrency` 替代 `prefetch`
- 移除手动 ACK/NACK 逻辑（BullMQ 自动管理）
- `QueueConsumerRegistry` 简化为仅记录注册信息

#### 5.5 更新 `queue.module.ts`

- 导入 RedisModule
- 保持 @Global() 和 providers/exports 不变

### 第 6 步：更新 5 个消费者

每个消费者需要调整：
1. **构造函数**：移除 `configService` 参数（不再需要自行连接 RabbitMQ），改为注入 RedisService 或直接通过 super 传递
2. **options 格式**：`prefetch` → `concurrency`，新增 `backoff` 配置
3. **processMessage** 签名保持不变，但内部无需手动 ACK

| 消费者 | 当前配置 | 迁移后配置 |
|--------|---------|-----------|
| NewsCrawlConsumer | prefetch:1, autoAck:false | concurrency:1, maxRetries:3, backoff:{type:'exponential',delay:1000} |
| KlineFetchConsumer | prefetch:1, autoAck:false | concurrency:1, maxRetries:3, backoff:{type:'exponential',delay:1000} |
| NewsVectorizeConsumer | prefetch:1, autoAck:false, maxRetries:3 | concurrency:1, maxRetries:3, backoff:{type:'exponential',delay:1000} |
| StockTrackFetchConsumer | prefetch:1, autoAck:false, maxRetries:3 | concurrency:1, maxRetries:3, backoff:{type:'exponential',delay:1000} |
| EventAnalyzeConsumer | prefetch:1, autoAck:false | concurrency:1, maxRetries:3, backoff:{type:'exponential',delay:1000} |

### 第 7 步：重写 CacheModule（迁移到 Redis）

#### 7.1 重写 `cache.service.ts`

使用 ioredis 替代内存 Map：
- 注入 RedisService 获取 ioredis 实例
- `get<T>(key)` → `redis.get(key)` + JSON.parse
- `set<T>(key, value, ttlMs)` → `redis.set(key, JSON.stringify(value), 'PX', ttlMs)`
- `getOrSet<T>(key, factory, ttlMs)` → 保持去重逻辑，使用 Redis 分布式锁或本地 pendingRequests Map
- `delete(key)` → `redis.del(key)`
- `clear()` → `redis.flushdb()` 或 scan + del（建议仅清除带前缀的 key）
- 保持与现有 API 完全兼容，所有调用方无需修改

#### 7.2 更新 `cache.module.ts`

- 导入 RedisModule
- 保持 @Global() 和 providers/exports 不变

### 第 8 步：更新部署脚本

**`scripts/deploy-infra.sh`：**
- 移除 `docker save rabbitmq:4.2.5-management` 和 `scp rabbitmq.tar`
- 新增 `docker save redis:8.6.3-alpine` 和 `scp redis.tar`
- 移除 `docker load -i images/rabbitmq.tar`
- 新增 `docker load -i images/redis.tar`
- 移除 `mkdir -p data/rabbitmq`
- 新增 `mkdir -p data/redis`
- 更新 `docker compose up -d` 命令中的服务名

### 第 9 步：更新 app.module.ts

- 新增 `RedisModule` 到 imports
- 消费者 providers 保持不变（构造函数参数由 NestJS DI 自动解析）

### 第 10 步：清理

- 移除 `@nestjs/microservices` 依赖（未使用）
- 确认所有 `import * as amqp from 'amqplib'` 引用已移除
- 确认所有 RabbitMQ 相关环境变量引用已移除
- 确认 Docker Compose 中无 RabbitMQ 残留

---

## 文件变更清单

### 新增文件
| 文件 | 说明 |
|------|------|
| `apps/backend/src/core/redis/redis.module.ts` | Redis 全局模块 |
| `apps/backend/src/core/redis/redis.service.ts` | Redis 连接服务 |

### 修改文件
| 文件 | 变更内容 |
|------|---------|
| `apps/backend/package.json` | 依赖变更 |
| `apps/backend/src/core/queue/queue.service.ts` | 重写为 BullMQ |
| `apps/backend/src/core/queue/queue.consumer.ts` | 重写为 BullMQ Worker |
| `apps/backend/src/core/queue/queue.types.ts` | 更新类型定义 |
| `apps/backend/src/core/queue/queue.constants.ts` | 移除 DLQ/DELAY 后缀 |
| `apps/backend/src/core/queue/queue.module.ts` | 导入 RedisModule |
| `apps/backend/src/core/cache/cache.service.ts` | 重写为 Redis 缓存 |
| `apps/backend/src/core/cache/cache.module.ts` | 导入 RedisModule |
| `apps/backend/src/app.module.ts` | 新增 RedisModule |
| `apps/backend/src/jobs/news-crawl.consumer.ts` | 调整构造函数和配置 |
| `apps/backend/src/jobs/kline-fetch.consumer.ts` | 调整构造函数和配置 |
| `apps/backend/src/jobs/news-vectorize.consumer.ts` | 调整构造函数和配置 |
| `apps/backend/src/jobs/stock-track-fetch.consumer.ts` | 调整构造函数和配置 |
| `apps/backend/src/jobs/event-analyze.consumer.ts` | 调整构造函数和配置 |
| `docker/docker-compose.dev.yml` | 移除 RabbitMQ，新增 Redis |
| `docker/docker-compose.server.yml` | 移除 RabbitMQ，新增 Redis，更新 backend env |
| `docker/docker-compose.prod.yml` | 移除 RabbitMQ，新增 Redis，更新 backend env |
| `docker/.env.example` | 移除 RABBITMQ_*，新增 REDIS_* |
| `scripts/deploy-infra.sh` | 更新镜像和服务 |

### 无需修改的文件
- 所有使用 `QueueService` 的 Service/Controller（API 接口不变）
- 所有使用 `CacheService` 的 Service（API 接口不变）
- `LlmCacheService`（仅依赖 CacheService 接口）
- 前端代码（无变化）

---

## 关键设计决策

1. **BullMQ 延迟队列**：BullMQ 原生支持 `delay` 选项，无需像 RabbitMQ 那样通过 TTL+DLX 间接实现
2. **BullMQ 重试**：BullMQ 内置 `attempts` + `backoff` 机制，替代 RabbitMQ 消费者中手动的 x-retry-count 逻辑
3. **BullMQ 死信队列**：BullMQ 中失败的 job 自动标记为 `failed`，可通过 `queue.getFailed()` 获取，无需单独的 DLQ
4. **缓存 API 兼容**：CacheService 保持相同的接口签名，内部实现从 Map 切换到 Redis，所有调用方零改动
5. **Redis 共用**：BullMQ 和缓存共用同一个 Redis 实例，通过 key 前缀隔离（BullMQ 使用 `bull:` 前缀，缓存使用业务前缀如 `llm:cache:`、`kline:check:`、`price:`）
6. **getOrSet 去重**：保留本地 `pendingRequests` Map 实现请求去重（单进程内有效），不引入分布式锁以保持简洁

---

## 风险与注意事项

1. **数据迁移**：RabbitMQ 中正在处理的消息在切换时可能丢失，建议在低峰期切换
2. **Redis 持久化**：开启 AOF 持久化避免 Redis 重启后队列数据丢失
3. **内存使用**：Redis 同时承担队列和缓存职责，需监控内存使用
4. **缓存序列化**：Redis 存储需要 JSON.stringify/parse，Date 对象需要特殊处理（反序列化后为字符串）
5. **CacheService.getOrSet 的 pendingRequests**：仅在同一进程内有效，多实例部署时去重失效（可接受，因为 Redis 缓存本身会防穿透）
