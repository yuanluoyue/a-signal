# A Signal 全栈项目初始化 Spec

## Why
需要初始化一个 TypeScript 全栈 monorepo 项目，包含股票分析系统的前后端基础架构、用户认证系统和后台管理界面。

## What Changes
- 使用 pnpm workspace 初始化 monorepo 项目结构
- 创建前端项目 (React + Umi + AntDesign)
- 创建后端项目 (NestJS + Drizzle ORM)
- 配置 Docker 开发环境 (PostgreSQL + RabbitMQ + ChromaDB)
- 实现用户注册/登录/认证系统
- 实现后台管理布局 (MainLayout)
- 实现个人中心页面
- 实现仪表盘页面

## Impact
- 新增项目基础架构
- 新增用户认证模块
- 新增前端路由和布局系统
- 新增数据库 schema

## ADDED Requirements

### Requirement: 项目初始化与 Monorepo 架构
The system SHALL 使用 pnpm workspace 建立 monorepo 项目结构

#### Scenario: 项目结构创建
- **GIVEN** 空项目目录
- **WHEN** 执行初始化
- **THEN** 创建以下结构：
  ```
  a-signal/
  ├── apps/
  │   ├── frontend/     # UMI + React + AntDesign
  │   └── backend/      # NestJS + Drizzle
  ├── docker/           # Docker 配置文件
  ├── data/             # 数据卷 (gitignored)
  ├── package.json      # 根 package.json (pnpm workspace)
  └── pnpm-workspace.yaml
  ```

### Requirement: Docker 开发环境
The system SHALL 提供 Docker Compose 开发环境配置

#### Scenario: 基础设施服务
- **GIVEN** 开发环境
- **WHEN** 启动 docker-compose
- **THEN** 启动以下服务：
  - PostgreSQL 15 (端口 5432)
  - RabbitMQ (端口 5672, 管理界面 15672)
  - ChromaDB (端口 8000)
- **AND** 数据持久化到 `./data` 目录
- **AND** 优先使用本地已有镜像

#### Scenario: 应用 Dockerfile
- **GIVEN** 前后端项目
- **WHEN** 构建镜像
- **THEN** 前端有独立的 Dockerfile
- **AND** 后端有独立的 Dockerfile

### Requirement: 根 Package.json 脚本
The system SHALL 在根 package.json 提供开发命令

#### Scenario: 开发命令
- **GIVEN** 根 package.json
- **WHEN** 查看 scripts
- **THEN** 包含以下命令：
  - `dev:frontend` - 启动前端开发服务器
  - `dev:backend` - 启动后端开发服务器（热重载）
  - `dev:docker` - 启动 Docker Compose 基础设施
  - `build:frontend` - 构建前端
  - `build:backend` - 构建后端
  - `format` - 格式化代码

### Requirement: 用户注册功能
The system SHALL 提供用户注册功能

#### Scenario: 注册页面
- **GIVEN** 未登录用户
- **WHEN** 访问 `/register`
- **THEN** 显示注册表单，包含：
  - 昵称 (必填)
  - 邮箱 (必填，唯一)
  - 密码 (必填，加密存储)
- **AND** 表单验证错误提示
- **AND** 注册成功跳转登录页

#### Scenario: 后端注册接口
- **GIVEN** 注册请求
- **WHEN** POST `/api/v1/auth/register`
- **THEN** 验证输入数据
- **AND** 密码使用 bcrypt 加密
- **AND** 头像种子默认为用户昵称
- **AND** 返回成功响应

### Requirement: 用户登录功能
The system SHALL 提供用户登录功能

#### Scenario: 登录页面
- **GIVEN** 未登录用户
- **WHEN** 访问 `/login`
- **THEN** 显示登录表单，包含：
  - 邮箱输入框
  - 密码输入框
  - 记住密码复选框
- **AND** 勾选记住密码后，账号密码存储在 localStorage
- **AND** 登录成功跳转仪表盘

#### Scenario: JWT 认证
- **GIVEN** 登录请求
- **WHEN** POST `/api/v1/auth/login`
- **THEN** 验证邮箱和密码
- **AND** 生成 JWT Token
- **AND** Token 有效期 7 天
- **AND** 返回 token 和用户信息

### Requirement: 后台管理布局 (MainLayout)
The system SHALL 提供后台管理统一布局

#### Scenario: 布局结构
- **GIVEN** 已登录用户
- **WHEN** 访问除登录/注册外的页面
- **THEN** 页面被 MainLayout 包裹
- **AND** 布局为左右分栏：
  - 左侧：菜单栏（可折叠）
  - 右侧：页面内容区
- **AND** 右侧顶部有 Header

#### Scenario: Header 组件
- **GIVEN** MainLayout
- **WHEN** 查看 Header
- **THEN** 显示：
  - 用户头像 (Dicebear Thumbs 风格)
  - 用户昵称
- **AND** 头像由种子生成，初始种子为用户昵称

#### Scenario: 用户菜单浮层
- **GIVEN** Header 中的用户头像
- **WHEN** 鼠标 hover
- **THEN** 显示浮层菜单：
  - 个人中心
  - 退出登录
- **AND** 点击个人中心跳转 `/profile`
- **AND** 点击退出登录清除 token 并跳转登录页

### Requirement: 个人中心页面
The system SHALL 提供个人中心功能

#### Scenario: 个人信息修改
- **GIVEN** 已登录用户
- **WHEN** 访问 `/profile`
- **THEN** 显示表单：
  - 昵称（可修改）
  - 头像种子（可修改，实时预览）
- **AND** 保存后更新用户信息

#### Scenario: 密码修改
- **GIVEN** 个人中心页面
- **WHEN** 点击修改密码
- **THEN** 显示表单：
  - 原密码
  - 新密码
  - 确认新密码
- **AND** 验证原密码正确
- **AND** 新密码加密存储

### Requirement: 路由权限控制
The system SHALL 实现路由权限控制

#### Scenario: 未登录访问控制
- **GIVEN** 未登录用户
- **WHEN** 访问非登录/注册页面
- **THEN** 重定向到 `/login`

#### Scenario: 已登录默认跳转
- **GIVEN** 已登录用户
- **WHEN** 访问 `/` 或 `/login`
- **THEN** 重定向到 `/dashboard`

### Requirement: 仪表盘页面
The system SHALL 提供仪表盘首页

#### Scenario: 仪表盘数据展示
- **GIVEN** 已登录用户
- **WHEN** 访问 `/dashboard`
- **THEN** 显示以下数据（暂时使用假数据）：
  - 今日信号数量
  - 新闻数量
  - 股票数量
  - 回测最高记录
  - 最近信号列表
- **AND** 仪表盘在左侧菜单中可访问

## Database Schema

### users 表
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nickname VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, -- bcrypt 加密
  avatar_seed VARCHAR(100) NOT NULL, -- Dicebear 种子
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API 接口列表

### 认证接口
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/auth/me` - 获取当前用户信息
- `PUT /api/v1/auth/profile` - 更新个人信息
- `PUT /api/v1/auth/password` - 修改密码

## 前端路由

| 路由 | 页面 | 权限 |
|------|------|------|
| `/login` | 登录页 | 公开 |
| `/register` | 注册页 | 公开 |
| `/dashboard` | 仪表盘 | 需登录 |
| `/profile` | 个人中心 | 需登录 |

## 技术栈详情

### 后端
- NestJS 11.x
- Drizzle ORM
- PostgreSQL 15
- JWT 认证
- bcrypt 密码加密
- class-validator 验证

### 前端
- UMI 4.x
- React 18
- Ant Design 5.x
- Dicebear 头像生成
- localStorage 本地存储
