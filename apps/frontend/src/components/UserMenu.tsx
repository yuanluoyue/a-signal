import React from 'react';
import { Dropdown, Avatar, MenuProps } from 'antd';
import { UserOutlined, LogoutOutlined, ProfileOutlined } from '@ant-design/icons';
import { useNavigate } from 'umi';
import { useUser } from '@/contexts/UserContext';
import { generateAvatarDataUrl } from '@/utils/avatar';

const UserMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useUser();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <ProfileOutlined />,
      label: '个人资料',
      onClick: handleProfile,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  // 使用 avatarSeed 或昵称作为种子生成头像
  const seed = user?.avatarSeed || user?.nickname || 'default';
  const avatarSrc = generateAvatarDataUrl(seed);

  return (
    <Dropdown menu={{ items }} placement="bottomRight" arrow>
      <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar 
          src={avatarSrc} 
          icon={!avatarSrc && <UserOutlined />}
          size="small"
        />
        <span style={{ color: '#fff' }}>{user?.nickname || '用户'}</span>
      </div>
    </Dropdown>
  );
};

export default UserMenu;
