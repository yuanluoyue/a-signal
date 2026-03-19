import { defineConfig } from 'umi';

export default defineConfig({
  npmClient: 'pnpm',
  title: 'A Signal',
  favicons: ['/favicon.ico'],
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
          path: '/backtest',
          component: '@/pages/backtest/index',
          title: '回测分析',
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
});
