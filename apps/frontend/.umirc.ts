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
