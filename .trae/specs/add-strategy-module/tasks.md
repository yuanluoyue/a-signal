# Tasks

- [x] Task 1: 新增 strategies 数据库表 schema 并生成迁移
  - [x] SubTask 1.1: 在 schema.ts 中新增 strategies 表定义
  - [x] SubTask 1.2: 运行 drizzle-kit generate 生成迁移文件

- [x] Task 2: 后端策略模块开发
  - [x] SubTask 2.1: 创建 strategy.module.ts
  - [x] SubTask 2.2: 创建 strategy.service.ts（CRUD + 列表分页筛选）
  - [x] SubTask 2.3: 创建 DTO 文件（create-strategy.dto.ts、update-strategy.dto.ts、strategy-list-query.dto.ts）
  - [x] SubTask 2.4: 创建 strategy.controller.ts
  - [x] SubTask 2.5: 在 app.module.ts 中注册 StrategyModule 和 StrategyController

- [x] Task 3: 前端策略页面开发
  - [x] SubTask 3.1: 在 services/types.ts 中新增策略相关类型定义
  - [x] SubTask 3.2: 创建 services/strategy.ts API 服务
  - [x] SubTask 3.3: 创建 pages/strategy/index.tsx 策略管理页面
  - [x] SubTask 3.4: 在 .umirc.ts 中新增 /strategies 路由
  - [x] SubTask 3.5: 在 MainLayout.tsx 中新增策略管理菜单项

- [x] Task 4: Seed 数据
  - [x] SubTask 4.1: 在 seed.ts 中新增初始策略数据（幂等处理）

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 1]
