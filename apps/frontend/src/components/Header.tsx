import React from 'react';
import { Layout } from 'antd';
import UserMenu from './UserMenu';

const { Header: AntHeader } = Layout;

interface HeaderProps {
  collapsed: boolean;
}

const Header: React.FC<HeaderProps> = ({ collapsed }) => {
  return (
    <AntHeader
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 24px',
        background: '#1f1f1f',
        borderBottom: '1px solid #333',
        position: 'fixed',
        top: 0,
        right: 0,
        left: collapsed ? 80 : 200,
        zIndex: 99,
        width: 'auto',
        transition: 'all 0.2s',
      }}
    >
      <UserMenu />
    </AntHeader>
  );
};

export default Header;
