import React, { useState } from 'react';
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
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'umi';
import Header from '@/components/Header';

const { Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/data',
      icon: <DatabaseOutlined />,
      label: '数据管理',
      children: [
        {
          key: '/news',
          icon: <ReadOutlined />,
          label: '新闻管理',
        },
        {
          key: '/stocks',
          icon: <SearchOutlined />,
          label: '股票查询',
        },
        {
          key: '/stock-trackings',
          icon: <EyeOutlined />,
          label: '股票追踪',
        },
      ],
    },
    {
      key: '/analysis',
      icon: <FundOutlined />,
      label: '分析中心',
      children: [
        {
          key: '/signals',
          icon: <BellOutlined />,
          label: '信号管理',
        },
        {
          key: '/simulation',
          icon: <WalletOutlined />,
          label: '账户模拟',
        },
        {
          key: '/backtest',
          icon: <LineChartOutlined />,
          label: '回测记录',
        },
        {
          key: '/agent-chat',
          icon: <RobotOutlined />,
          label: 'AI 助手',
        },
      ],
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: [
        {
          key: '/settings/notifications',
          icon: <NotificationOutlined />,
          label: '通知设置',
        },
        {
          key: '/settings/scheduler',
          icon: <ClockCircleOutlined />,
          label: '定时任务',
        },
        {
          key: '/settings/api-keys',
          icon: <KeyOutlined />,
          label: 'API Key',
        },
        {
          key: '/blacklist',
          icon: <BlockOutlined />,
          label: '黑名单',
        },
      ],
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        style={{
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div
          onClick={() => navigate('/dashboard')}
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            gap: 10,
            whiteSpace: 'nowrap',
          }}
        >
          <StockOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          {!collapsed && (
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              A Signal
            </span>
          )}
        </div>
        <div
          style={{
            height: 'calc(100vh - 64px)',
            overflow: 'auto',
            overflowX: 'hidden',
          }}
          className="custom-scrollbar"
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderRight: 0 }}
          />
        </div>
      </Sider>
      <Layout
        style={{
          marginLeft: collapsed ? 80 : 200,
          transition: 'margin-left 0.2s',
        }}
      >
        <Header collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <Content
          style={{
            margin: '88px 16px 24px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: location.pathname === '/agent-chat' ? 'hidden' : 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
