# Tasks

## 阶段一：项目基础架构

- [ ] **Task 1**: 初始化 Monorepo 项目结构
  - [ ] 创建根目录 package.json 配置 pnpm workspace
  - [ ] 创建 pnpm-workspace.yaml 定义 workspace 范围
  - [ ] 创建 .gitignore 文件（包含 node_modules, data/ 等）
  - [ ] 创建 apps/frontend 和 apps/backend 目录

- [ ] **Task 2**: 配置 Docker 开发环境
  - [ ] 创建 docker/ 目录
  - [ ] 创建 docker-compose.dev.yml（PostgreSQL, RabbitMQ, ChromaDB）
  - [ ] 创建 docker/.env.example 环境变量模板
  - [ ] 创建 apps/backend/Dockerfile
  - [ ] 创建 apps/frontend/Dockerfile
  - [ ] 确保 data/ 目录被 gitignore

- [ ] **Task 3**: 根 package.json 开发脚本
  - [ ] 添加 `dev:frontend` 脚本
  - [ ] 添加 `dev:backend` 脚本
  - [ ] 添加 `dev:docker` 脚本
  - [ ] 添加 `build:frontend` 脚本
  - [ ] 添加 `build:backend` 脚本
  - [ ] 添加 `format` 脚本

## 阶段二：后端项目初始化

- [ ] **Task 4**: NestJS 项目初始化
  - [ ] 初始化 NestJS 项目到 apps/backend
  - [ ] 配置 TypeScript 严格模式
  - [ ] 安装核心依赖 (NestJS, RxJS, reflect-metadata)
  - [ ] 配置 ESLint 和 Prettier

- [ ] **Task 5**: 数据库和 ORM 配置
  - [ ] 安装 Drizzle ORM 和 pg 驱动
  - [ ] 创建 drizzle.config.ts 配置
  - [ ] 配置数据库连接模块
  - [ ] 创建 users 表 schema

- [ ] **Task 6**: 认证模块实现
  - [ ] 安装依赖 (passport, passport-jwt, bcrypt, @nestjs/jwt)
  - [ ] 创建 AuthModule
  - [ ] 实现注册接口 POST /api/v1/auth/register
  - [ ] 实现登录接口 POST /api/v1/auth/login
  - [ ] 实现获取当前用户 GET /api/v1/auth/me
  - [ ] 实现 JWT Strategy
  - [ ] 实现 JwtAuthGuard

- [ ] **Task 7**: 用户模块实现
  - [ ] 创建 UsersModule
  - [ ] 实现更新个人信息 PUT /api/v1/auth/profile
  - [ ] 实现修改密码 PUT /api/v1/auth/password
  - [ ] 实现 UsersService 业务逻辑

- [ ] **Task 8**: 全局配置和中间件
  - [ ] 配置全局 API 前缀 /api/v1
  - [ ] 配置全局验证管道 (ValidationPipe)
  - [ ] 配置全局异常过滤器
  - [ ] 配置响应拦截器统一格式
  - [ ] 配置 CORS

## 阶段三：前端项目初始化

- [ ] **Task 9**: UMI 项目初始化
  - [ ] 初始化 UMI 4.x 项目到 apps/frontend
  - [ ] 配置 TypeScript
  - [ ] 安装 Ant Design 5.x
  - [ ] 配置 ESLint 和 Prettier

- [ ] **Task 10**: 路由和布局配置
  - [ ] 配置 UMI 约定式路由
  - [ ] 创建 MainLayout 组件（左右分栏布局）
  - [ ] 创建 Header 组件（显示用户头像和昵称）
  - [ ] 实现用户菜单浮层（个人中心、退出登录）
  - [ ] 配置路由权限控制（未登录重定向）

- [ ] **Task 11**: 认证相关页面
  - [ ] 创建登录页面 /login
  - [ ] 实现记住密码功能（localStorage）
  - [ ] 创建注册页面 /register
  - [ ] 实现登录状态管理
  - [ ] 配置 Axios 拦截器（自动添加 Token）

- [ ] **Task 12**: 个人中心页面
  - [ ] 创建个人中心页面 /profile
  - [ ] 实现昵称修改表单
  - [ ] 实现头像种子修改（实时预览 Dicebear）
  - [ ] 实现密码修改表单

- [ ] **Task 13**: 仪表盘页面
  - [ ] 创建仪表盘页面 /dashboard
  - [ ] 实现统计卡片组件（信号、新闻、股票数量）
  - [ ] 实现回测最高记录展示
  - [ ] 实现最近信号列表
  - [ ] 添加仪表盘到左侧菜单

## 阶段四：集成和优化

- [ ] **Task 14**: API 封装
  - [ ] 创建前端 API 封装层
  - [ ] 封装认证相关 API
  - [ ] 封装用户相关 API
  - [ ] 配置 API 基础 URL

- [ ] **Task 15**: 头像生成集成
  - [ ] 安装 @dicebear/core 和 @dicebear/thumbs
  - [ ] 创建头像生成工具函数
  - [ ] 在 Header 中集成头像显示
  - [ ] 在个人中心实现头像预览

# Task Dependencies

```
Task 1 -> Task 2 -> Task 3
Task 1 -> Task 4 -> Task 5 -> Task 6 -> Task 7 -> Task 8
Task 1 -> Task 9 -> Task 10 -> Task 11 -> Task 12 -> Task 13
Task 6, Task 11 -> Task 14
Task 10, Task 12 -> Task 15
```

# 并行执行建议

- Task 4 (NestJS 初始化) 和 Task 9 (UMI 初始化) 可以并行
- Task 6 (认证模块) 和 Task 11 (认证页面) 可以并行开发
