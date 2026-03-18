import React from 'react';
import { Layout } from 'antd';
import UserMenu from './UserMenu';

const { Header: AntHeader } = Layout;

interface HeaderProps {
  collapsed: boolean;
}

const Header: React.FC<HeaderProps> = () => {
  return (
    <AntHeader
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 24px',
        background: '#001529',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        width: '100%',
      }}
    >
      <UserMenu />
    </AntHeader>
  );
};

export default Header;
