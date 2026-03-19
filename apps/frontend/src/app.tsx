import React from 'react';
import { RuntimeConfig } from 'umi';
import { isAuthenticated } from '@/utils/auth';
import { UserProvider } from '@/contexts/UserContext';

// 全局样式修复表格层级问题
const globalStyles = `
  /* 修复表格固定列层级问题 - 固定列在表头之下 */
  .ant-table-cell-fix-left,
  .ant-table-cell-fix-right {
    z-index: 1 !important;
  }
  
  /* 表头层级 */
  .ant-table-thead > tr > th {
    z-index: 2 !important;
    position: relative;
  }
  
  /* 表格操作按钮层级 */
  .ant-table-tbody > tr > td .ant-btn {
    z-index: 1;
    position: relative;
  }
  
  /* 确保 layout header 层级最高 */
  .ant-layout-header {
    z-index: 100 !important;
    position: relative;
  }
  
  /* 侧边栏层级 */
  .ant-layout-sider {
    z-index: 101 !important;
  }
  
  /* 表格容器 */
  .ant-table-wrapper {
    z-index: 1;
  }
`;

// 注入全局样式
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = globalStyles;
  document.head.appendChild(style);
}

export const onRouteChange: RuntimeConfig['onRouteChange'] = ({ location, routes }) => {
  const publicPaths = ['/login', '/register'];
  const isPublicPath = publicPaths.includes(location.pathname);
  const authenticated = isAuthenticated();

  if (!authenticated && !isPublicPath) {
    window.location.href = '/login';
    return;
  }

  if (authenticated && isPublicPath) {
    window.location.href = '/dashboard';
    return;
  }
};

export const rootContainer: RuntimeConfig['rootContainer'] = (container) => {
  return <UserProvider>{container}</UserProvider>;
};
