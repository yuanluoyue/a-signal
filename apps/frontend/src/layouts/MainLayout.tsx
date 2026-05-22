import React, { useState, useMemo, useCallback, Suspense, useEffect } from 'react';
import { Layout, Menu, theme, Spin } from 'antd';
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
  CloudServerOutlined,
  FileTextOutlined,
  BulbOutlined,
  FilterOutlined,
  UserOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Outlet, useNavigate, useLocation } from 'umi';
import Header from '@/components/Header';
import PageLoading from '@/components/PageLoading';
import { menuApi } from '@/services/menu';
import type { MenuItem } from '@/services/types';
import { useUser } from '@/contexts/UserContext';

const { Sider, Content } = Layout;

const iconMap: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  DatabaseOutlined: <DatabaseOutlined />,
  ReadOutlined: <ReadOutlined />,
  SearchOutlined: <SearchOutlined />,
  EyeOutlined: <EyeOutlined />,
  ExperimentOutlined: <ExperimentOutlined />,
  SettingOutlined: <SettingOutlined />,
  BellOutlined: <BellOutlined />,
  ThunderboltOutlined: <ThunderboltOutlined />,
  CodeOutlined: <CodeOutlined />,
  LineChartOutlined: <LineChartOutlined />,
  WalletOutlined: <WalletOutlined />,
  ControlOutlined: <ControlOutlined />,
  DollarOutlined: <DollarOutlined />,
  RobotOutlined: <RobotOutlined />,
  MessageOutlined: <MessageOutlined />,
  FilterOutlined: <FilterOutlined />,
  BulbOutlined: <BulbOutlined />,
  CloudServerOutlined: <CloudServerOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  FundOutlined: <FundOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  PieChartOutlined: <PieChartOutlined />,
  NotificationOutlined: <NotificationOutlined />,
  ClockCircleOutlined: <ClockCircleOutlined />,
  KeyOutlined: <KeyOutlined />,
  BlockOutlined: <BlockOutlined />,
  AuditOutlined: <AuditOutlined />,
  UserOutlined: <UserOutlined />,
  MenuOutlined: <MenuOutlined />,
};

const buildMenuItems = (menus: MenuItem[]): MenuProps['items'] => {
  const topMenus = menus.filter(m => !m.parentId);
  const childMenus = menus.filter(m => m.parentId);

  return topMenus
    .sort((a, b) => a.sort - b.sort)
    .map(menu => {
      const children = childMenus
        .filter(c => c.parentId === menu.id)
        .sort((a, b) => a.sort - b.sort);

      if (children.length > 0) {
        return {
          key: menu.path || menu.id,
          icon: menu.icon ? iconMap[menu.icon] : undefined,
          label: menu.name,
          children: children.map(child => ({
            key: child.path || child.id,
            icon: child.icon ? iconMap[child.icon] : undefined,
            label: child.name,
          })),
        };
      }

      return {
        key: menu.path || menu.id,
        icon: menu.icon ? iconMap[menu.icon] : undefined,
        label: menu.name,
      };
    });
};

const buildPathToParentMap = (menus: MenuItem[]): Record<string, string> => {
  const map: Record<string, string> = {};
  const topMenus = menus.filter(m => !m.parentId);
  const childMenus = menus.filter(m => m.parentId);

  for (const parent of topMenus) {
    const children = childMenus.filter(c => c.parentId === parent.id);
    for (const child of children) {
      if (child.path) {
        map[child.path] = parent.path || parent.id;
      }
    }
  }

  return map;
};

const getSelectedKey = (pathname: string, allPaths: string[]): string => {
  if (allPaths.includes(pathname)) {
    return pathname;
  }

  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length >= 3 && pathParts[0] === 'analysis' && pathParts[1] === 'strategies') {
    return '/analysis/strategies';
  }

  if (pathParts.length >= 2) {
    const parentPath = `/${pathParts[0]}/${pathParts[1]}`;
    if (allPaths.includes(parentPath)) {
      return parentPath;
    }
  }

  if (pathParts.length >= 1) {
    const basePath = `/${pathParts[0]}`;
    if (allPaths.includes(basePath)) {
      return basePath;
    }
  }

  return pathname;
};

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        setMenuLoading(true);
        const menus = await menuApi.getMyMenus();
        console.log('[MainLayout] Fetched menus:', menus.length, menus.map(m => m.name));
        setMenuItems(menus);
      } catch (error) {
        console.error('[MainLayout] Failed to fetch menus:', error);
      } finally {
        setMenuLoading(false);
      }
    };

    fetchMenus();
  }, [user?.role]);

  const antdMenuItems = useMemo(() => buildMenuItems(menuItems), [menuItems]);

  const allPaths = useMemo(() => {
    const paths: string[] = [];
    for (const menu of menuItems) {
      if (menu.path) paths.push(menu.path);
    }
    return paths;
  }, [menuItems]);

  const pathToParentMap = useMemo(() => buildPathToParentMap(menuItems), [menuItems]);

  const handleMenuClick = useCallback(({ key }: { key: string }) => {
    if (key.startsWith('/')) {
      navigate(key);
    }
  }, [navigate]);

  const handleToggle = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  const handleLogoClick = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const selectedKeys = useMemo(() => [getSelectedKey(location.pathname, allPaths)], [location.pathname, allPaths]);
  const defaultOpenKeys = useMemo(() => {
    const selectedKey = getSelectedKey(location.pathname, allPaths);
    const parentKey = pathToParentMap[selectedKey];
    return parentKey ? [parentKey] : [];
  }, [location.pathname, allPaths, pathToParentMap]);

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
          {menuLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <Spin />
            </div>
          ) : (
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={selectedKeys}
              defaultOpenKeys={defaultOpenKeys}
              items={antdMenuItems}
              onClick={handleMenuClick}
              style={{ borderRight: 0 }}
            />
          )}
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
