import { defineConfig } from 'umi';

export default defineConfig({
  npmClient: 'pnpm',
  title: 'A Signal',
  favicons: ['/favicon.ico'],
  esbuildMinifyIIFE: true,
  routes: [
    {
      path: '/login',
      component: '@/pages/login',
      layout: false,
    },
    {
      path: '/register',
      component: '@/pages/register',
      layout: false,
    },
    {
      path: '/',
      component: '@/layouts/MainLayout',
      routes: [
        {
          path: '/dashboard',
          component: '@/pages/dashboard',
          title: '仪表盘',
        },
        {
          path: '/news',
          component: '@/pages/news/index',
          title: '新闻列表',
        },
        {
          path: '/news/:id',
          component: '@/pages/news/[id]',
          title: '新闻详情',
        },
        {
          path: '/signals',
          component: '@/pages/signals/index',
          title: '信号列表',
        },
        {
          path: '/signals/:id',
          component: '@/pages/signals/[id]',
          title: '信号详情',
        },
        {
          path: '/stocks',
          component: '@/pages/stocks/index',
          title: '股票查询',
        },
        {
          path: '/stocks/:code',
          component: '@/pages/stocks/[code]',
          title: '股票详情',
        },
        {
          path: '/stock-trackings',
          component: '@/pages/stock-trackings/index',
          title: '股票追踪',
        },
        {
          path: '/stock-trackings/:id',
          component: '@/pages/stock-trackings/[id]',
          title: '追踪详情',
        },
        {
          path: '/simulation',
          component: '@/pages/simulation/index',
          title: '账户模拟',
        },
        {
          path: '/blacklist',
          component: '@/pages/blacklist/index',
          title: '黑名单',
        },
        {
          path: '/backtest',
          component: '@/pages/backtest/index',
          title: '回测分析',
        },
        {
          path: '/agent-chat',
          component: '@/pages/agent-chat/index',
          title: 'AI 投研助手',
        },
        {
          path: '/settings/notifications',
          component: '@/pages/settings/notifications',
          title: '通知设置',
        },
        {
          path: '/settings/scheduler',
          component: '@/pages/settings/scheduler',
          title: '定时任务',
        },
        {
          path: '/settings/api-keys',
          component: '@/pages/settings/api-keys',
          title: 'API Key 管理',
        },
        {
          path: '/profile',
          component: '@/pages/profile',
          title: '个人资料',
        },
        {
          path: '/',
          redirect: '/dashboard',
        },
      ],
    },
  ],
  theme: {
    'primary-color': '#1890ff',
  },
  plugins: [
    '@umijs/plugins/dist/antd',
    '@umijs/plugins/dist/model',
    '@umijs/plugins/dist/locale',
  ],
  antd: {},
  model: {},
  locale: {
    default: 'zh-CN',
    antd: true,
  },
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      pathRewrite: { '^/api': '/api/v1' },
    },
  },
  // MFSU 配置 - 添加需要预构建的依赖
  mfsu: {
    strategy: 'eager',
    include: ['react-markdown', 'remark-gfm', '@ant-design/x'],
  },
});
