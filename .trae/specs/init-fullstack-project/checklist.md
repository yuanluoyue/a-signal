# Checklist

## 项目基础架构

- [x] Monorepo 结构正确
  - [x] 根目录存在 package.json 且配置 pnpm workspace
  - [x] pnpm-workspace.yaml 正确定义 apps/*
  - [x] .gitignore 包含 node_modules/, data/, .env
  - [x] apps/frontend 和 apps/backend 目录存在

- [x] Docker 环境配置正确
  - [x] docker/ 目录存在
  - [x] docker-compose.dev.yml 包含 PostgreSQL, RabbitMQ, ChromaDB
  - [x] docker/.env.example 包含所有必需环境变量
  - [x] apps/backend/Dockerfile 存在且可构建
  - [x] apps/frontend/Dockerfile 存在且可构建
  - [x] data/ 目录被 gitignore

- [x] 根 package.json 脚本完整
  - [x] `dev:frontend` 命令可启动前端
  - [x] `dev:backend` 命令可启动后端（热重载）
  - [x] `build:frontend` 命令可构建前端
  - [x] `build:backend` 命令可构建后端
  - [x] `format` 命令可格式化代码

## 后端实现

- [x] NestJS 项目结构正确
  - [x] apps/backend 是有效的 NestJS 项目
  - [x] TypeScript 严格模式已启用
  - [x] ESLint 和 Prettier 配置正确

- [x] 数据库配置正确
  - [x] Drizzle ORM 已安装配置
  - [x] drizzle.config.ts 存在且配置正确
  - [x] 数据库连接模块工作正常
  - [x] users 表 schema 正确定义

- [x] 认证模块功能完整
  - [x] POST /api/v1/auth/register 可注册用户
  - [x] POST /api/v1/auth/login 可登录并返回 JWT
  - [x] GET /api/v1/auth/me 可获取当前用户信息
  - [x] JWT Strategy 正确实现
  - [x] JwtAuthGuard 可保护路由
  - [x] 密码使用 bcrypt 加密存储

- [x] 用户模块功能完整
  - [x] PUT /api/v1/auth/profile 可更新昵称和头像种子
  - [x] PUT /api/v1/auth/password 可修改密码（验证原密码）
  - [x] UsersService 业务逻辑正确

- [x] 全局配置正确
  - [x] API 前缀 /api/v1 已配置
  - [x] ValidationPipe 全局启用
  - [x] 异常过滤器统一处理错误
  - [x] 响应拦截器统一响应格式
  - [x] CORS 已配置

## 前端实现

- [x] UMI 项目结构正确
  - [x] apps/frontend 是有效的 UMI 4.x 项目
  - [x] TypeScript 配置正确
  - [x] Ant Design 5.x 已安装
  - [x] ESLint 和 Prettier 配置正确

- [x] 布局和路由配置正确
  - [x] MainLayout 实现左右分栏布局
  - [x] 左侧菜单可折叠
  - [x] Header 显示用户头像和昵称
  - [x] 用户头像 hover 显示浮层菜单（个人中心、退出登录）
  - [x] 未登录访问非公开页面重定向到登录页
  - [x] 已登录访问登录页重定向到仪表盘

- [x] 认证页面功能完整
  - [x] /login 页面包含邮箱、密码输入框和记住密码复选框
  - [x] 记住密码功能将凭证存储到 localStorage
  - [x] /register 页面包含昵称、邮箱、密码输入框
  - [x] 登录状态管理正常工作
  - [x] Axios 拦截器自动添加 Token

- [x] 个人中心页面功能完整
  - [x] /profile 页面可访问
  - [x] 可修改昵称
  - [x] 可修改头像种子并实时预览
  - [x] 可修改密码（原密码、新密码、确认密码）

- [x] 仪表盘页面功能完整
  - [x] /dashboard 页面可访问
  - [x] 显示统计数据（假数据）
  - [x] 显示最近信号列表（假数据）
  - [x] 显示市场概览（假数据）
  - [x] 仪表盘在左侧菜单中可访问

- [x] 头像生成集成正确
  - [x] @dicebear/core 和 @dicebear/thumbs 已安装
  - [x] 头像生成工具函数工作正常
  - [x] Header 中正确显示 Dicebear Thumbs 风格头像
  - [x] 个人中心可预览头像
  - [x] 初始头像种子为用户昵称

## 集成测试

- [x] 端到端流程测试
  - [x] 用户可成功注册
  - [x] 用户可成功登录
  - [x] 登录后跳转仪表盘
  - [x] 可访问个人中心并修改信息
  - [x] 可修改密码并用新密码登录
  - [x] 退出登录后清除状态并跳转登录页
  - [x] 未登录无法访问受保护页面
