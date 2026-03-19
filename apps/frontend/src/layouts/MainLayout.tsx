import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  StockOutlined,
  ReadOutlined,
  BellOutlined,
  LineChartOutlined,
  SettingOutlined,
  NotificationOutlined,
  ClockCircleOutlined,
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
      key: '/news',
      icon: <ReadOutlined />,
      label: '新闻',
    },
    {
      key: '/signals',
      icon: <BellOutlined />,
      label: '信号',
    },
    {
      key: '/backtest',
      icon: <LineChartOutlined />,
      label: '回测',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
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
      ],
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: '个人资料',
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
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div
          onClick={() => navigate('/dashboard')}
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
          }}
        >
          {collapsed ? (
            <StockOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          ) : (
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              A Signal
            </span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            padding: '16px',
            textAlign: 'center',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{
              color: '#fff',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
        </div>
      </Sider>
      <Layout
        style={{
          marginLeft: collapsed ? 80 : 200,
          transition: 'all 0.2s',
          overflow: 'hidden',
        }}
      >
        <Header collapsed={collapsed} />
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
