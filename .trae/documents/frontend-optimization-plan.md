# 前端性能优化和体验优化计划

## 一、登录页背景修改

将登录页背景从渐变色改为白色。

**修改文件**: `apps/frontend/src/pages/login.tsx`

```tsx
// 修改前
background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',

// 修改后
background: '#fff',
```

## 二、性能优化

### 2.1 移除生产环境 console.log（高优先级）

**问题**: 代码中有 68 处 console.log，生产环境会暴露调试信息并影响性能。

**解决方案**: 在 `.umirc.ts` 中配置构建时移除 console.log。

```typescript
// .umirc.ts 添加
chainWebpack: (config) => {
  if (process.env.NODE_ENV === 'production') {
    config.optimization.minimizer('terser').use(TerserPlugin, [{
      terserOptions: {
        compress: {
          drop_console: true,
        },
      },
    }]);
  }
},
```

### 2.2 组件渲染优化（中优先级）

**问题**: 多个页面组件没有使用 React.memo、useMemo、useCallback 优化。

**优化点**:
1. `MainLayout.tsx` - menuItems 数组每次渲染都会重新创建
2. `dashboard.tsx` - getConfidenceColor、getConfidenceText 函数每次渲染都会重新创建
3. `stocks/index.tsx` - columns 数组每次渲染都会重新创建

**解决方案**:
- 使用 useMemo 缓存数组和对象
- 使用 useCallback 缓存回调函数
- 使用 React.memo 包装纯展示组件

### 2.3 内联样式优化（中优先级）

**问题**: `agent-chat/index.tsx` 有大量内联样式字符串，影响性能和维护性。

**解决方案**: 将内联样式移到 SCSS 文件中。

### 2.4 路由懒加载（低优先级）

**问题**: 所有页面组件都是同步加载，首屏加载时间较长。

**解决方案**: 使用 Umi 的动态导入功能。

```typescript
// .umirc.ts 添加
dynamicImport: {},
```

## 三、体验优化

### 3.1 加载状态优化

**问题**: 部分页面加载时没有骨架屏或加载动画。

**解决方案**: 为列表页面添加 Skeleton 组件。

### 3.2 错误边界

**问题**: 没有全局错误边界，组件错误会导致白屏。

**解决方案**: 添加 ErrorBoundary 组件。

## 四、实施步骤

### 步骤 1: 修改登录页背景
修改 `login.tsx` 的背景样式为白色。

### 步骤 2: 配置生产环境移除 console.log
在 `.umirc.ts` 中添加构建配置。

### 步骤 3: 优化 MainLayout 组件
使用 useMemo 缓存 menuItems 数组。

### 步骤 4: 优化 Dashboard 页面
使用 useCallback 缓存回调函数。

### 步骤 5: 优化 Stocks 页面
使用 useMemo 缓存 columns 数组。

## 五、影响范围

### 需要修改的文件

**配置文件**:
- `apps/frontend/.umirc.ts` - 添加构建优化配置

**页面组件**:
- `apps/frontend/src/pages/login.tsx` - 修改背景
- `apps/frontend/src/layouts/MainLayout.tsx` - 优化渲染
- `apps/frontend/src/pages/dashboard.tsx` - 优化渲染
- `apps/frontend/src/pages/stocks/index.tsx` - 优化渲染

## 六、预期收益

1. **登录页更简洁**: 白色背景更专业
2. **生产环境更安全**: 不暴露调试信息
3. **渲染性能提升**: 减少不必要的重渲染
4. **代码可维护性**: 样式统一管理
