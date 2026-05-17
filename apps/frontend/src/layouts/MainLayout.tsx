import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  StockOutlined,
  ReadOutlined,
  BellOutlined,
  LineChartOutlined,
  SettingOutlined,
  NotificationOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  WalletOutlined,
  BlockOutlined,
  EyeOutlined,
  RobotOutlined,
  KeyOutlined,
  DatabaseOutlined,
  FundOutlined,
  ThunderboltOutlined,
  AuditOutlined,
  ExperimentOutlined,
  CodeOutlined,
  DollarOutlined,
  ControlOutlined,
  MessageOutlined,
  BarChartOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'umi';
import Header from '@/components/Header';
import PageLoading from '@/components/PageLoading';

const { Sider, Content } = Layout;

const MENU_ITEMS = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/data',
    icon: <DatabaseOutlined />,
    label: '数据中心',
    children: [
      { key: '/news', icon: <ReadOutlined />, label: '新闻管理' },
      { key: '/stocks', icon: <SearchOutlined />, label: '股票查询' },
      { key: '/stock-trackings', icon: <EyeOutlined />, label: '股票追踪' },
    ],
  },
  {
    key: '/strategy',
    icon: <ExperimentOutlined />,
    label: '策略中心',
    children: [
      { key: '/signal-rules', icon: <SettingOutlined />, label: '信号规则' },
      { key: '/signals', icon: <BellOutlined />, label: '信号管理' },
      { key: '/events', icon: <ThunderboltOutlined />, label: '事件管理' },
      { key: '/strategies', icon: <CodeOutlined />, label: '策略管理' },
      { key: '/backtest', icon: <LineChartOutlined />, label: '回测记录' },
    ],
  },
  {
    key: '/trading',
    icon: <WalletOutlined />,
    label: '交易中心',
    children: [
      { key: '/runtime', icon: <ControlOutlined />, label: '运行管理' },
      { key: '/simulation', icon: <DollarOutlined />, label: '账户模拟' },
    ],
  },
  {
    key: '/agent',
    icon: <RobotOutlined />,
    label: 'AI 智能体',
    children: [
      { key: '/agent-chat', icon: <MessageOutlined />, label: 'AI 助手' },
    ],
  },
  {
    key: '/analysis',
    icon: <FundOutlined />,
    label: '分析中心',
    children: [
      { key: '/analysis/overview', icon: <BarChartOutlined />, label: '综合分析' },
      { key: '/analysis/strategies', icon: <PieChartOutlined />, label: '策略总览' },
    ],
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
    children: [
      { key: '/settings/notifications', icon: <NotificationOutlined />, label: '通知设置' },
      { key: '/settings/scheduler', icon: <ClockCircleOutlined />, label: '定时任务' },
      { key: '/settings/api-keys', icon: <KeyOutlined />, label: 'API Key' },
      { key: '/blacklist', icon: <BlockOutlined />, label: '黑名单' },
      { key: '/audit-logs', icon: <AuditOutlined />, label: '审计日志' },
    ],
  },
];

const getSelectedKey = (pathname: string): string => {
  const pathParts = pathname.split('/').filter(Boolean);
  
  if (pathParts.length === 0) {
    return '/dashboard';
  }
  
  const basePath = `/${pathParts[0]}`;
  
  if (pathParts.length >= 2) {
    const secondLevelPath = `/${pathParts[0]}/${pathParts[1]}`;
    const knownSecondLevelPaths = [
      '/settings/notifications',
      '/settings/scheduler',
      '/settings/api-keys',
      '/analysis/overview',
      '/analysis/strategies',
    ];
    
    if (knownSecondLevelPaths.includes(secondLevelPath)) {
      return secondLevelPath;
    }

  if (pathParts.length >= 3 && pathParts[0] === 'analysis' && pathParts[1] === 'strategies') {
    return '/analysis/strategies';
  }
  }
  
  const knownFirstLevelPaths = [
    '/dashboard',
    '/news',
    '/stocks',
    '/stock-trackings',
    '/signal-rules',
    '/signals',
    '/events',
    '/strategies',
    '/backtest',
    '/runtime',
    '/simulation',
    '/agent-chat',
    '/analysis/overview',
    '/analysis/strategies',
    '/blacklist',
    '/audit-logs',
  ];
  
  if (knownFirstLevelPaths.includes(basePath)) {
    return basePath;
  }
  
  return pathname;
};

const getOpenKeys = (pathname: string): string[] => {
  const pathToParentMap: Record<string, string> = {
    '/news': '/data',
    '/stocks': '/data',
    '/stock-trackings': '/data',
    '/signal-rules': '/strategy',
    '/signals': '/strategy',
    '/events': '/strategy',
    '/strategies': '/strategy',
    '/backtest': '/strategy',
    '/runtime': '/trading',
    '/simulation': '/trading',
    '/agent-chat': '/agent',
    '/analysis/overview': '/analysis',
    '/analysis/strategies': '/analysis',
    '/settings/notifications': '/settings',
    '/settings/scheduler': '/settings',
    '/settings/api-keys': '/settings',
    '/blacklist': '/settings',
    '/audit-logs': '/settings',
  };
  
  const openKeys: string[] = [];
  const selectedKey = getSelectedKey(pathname);
  const parentKey = pathToParentMap[selectedKey];
  if (parentKey) {
    openKeys.push(parentKey);
  }
  return openKeys;
};

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick = useCallback(({ key }: { key: string }) => {
    navigate(key);
  }, [navigate]);

  const handleToggle = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  const handleLogoClick = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const selectedKeys = useMemo(() => [getSelectedKey(location.pathname)], [location.pathname]);
  const defaultOpenKeys = useMemo(() => getOpenKeys(location.pathname), [location.pathname]);

  const siderStyle = useMemo(() => ({
    height: '100vh',
    position: 'fixed' as const,
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
  }), []);

  const logoStyle = useMemo(() => ({
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    padding: collapsed ? 0 : '0 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    gap: 10,
    whiteSpace: 'nowrap' as const,
  }), [collapsed]);

  const menuContainerStyle = useMemo(() => ({
    height: 'calc(100vh - 64px)',
    overflow: 'auto' as const,
    overflowX: 'hidden' as const,
  }), []);

  const layoutStyle = useMemo(() => ({
    marginLeft: collapsed ? 80 : 200,
    transition: 'margin-left 0.2s',
  }), [collapsed]);

  const contentStyle = useMemo(() => ({
    margin: '88px 16px 24px',
    padding: 24,
    minHeight: 280,
    background: colorBgContainer,
    borderRadius: borderRadiusLG,
    overflow: location.pathname === '/agent-chat' ? 'hidden' as const : 'auto' as const,
  }), [colorBgContainer, borderRadiusLG, location.pathname]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        style={siderStyle}
      >
        <div onClick={handleLogoClick} style={logoStyle}>
          <StockOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          {!collapsed && (
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              A Signal
            </span>
          )}
        </div>
        <div style={menuContainerStyle} className="custom-scrollbar">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={selectedKeys}
            defaultOpenKeys={defaultOpenKeys}
            items={MENU_ITEMS}
            onClick={handleMenuClick}
            style={{ borderRight: 0 }}
          />
        </div>
      </Sider>
      <Layout style={layoutStyle}>
        <Header collapsed={collapsed} onToggle={handleToggle} />
        <Content style={contentStyle}>
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
