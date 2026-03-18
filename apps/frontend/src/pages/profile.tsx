import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Avatar, 
  Row, 
  Col, 
  Divider, 
  Typography, 
  message,
  Space,
  Tooltip,
  Popover
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  LockOutlined,
  SyncOutlined,
  SaveOutlined,
  KeyOutlined,
  EditOutlined,
  CopyOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useUser } from '@/contexts/UserContext';
import { authApi } from '@/services/auth';
import { generateAvatarDataUrl, generateRandomSeed } from '@/utils/avatar';

const { Title, Text } = Typography;

const ProfilePage: React.FC = () => {
  const { user, setUser, refreshUser } = useUser();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState<string>('');

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        nickname: user.nickname,
        email: user.email,
      });
      // 使用用户的 avatarSeed，如果没有则使用昵称作为种子（保持一致性）
      const seed = user.avatarSeed || user.nickname || 'default';
      setAvatarSeed(seed);
    }
  }, [user, profileForm]);

  const handleUpdateProfile = async (values: { nickname: string }) => {
    setProfileLoading(true);
    try {
      const updatedUser = await authApi.updateProfile({
        nickname: values.nickname,
        avatarSeed,
      });
      setUser(updatedUser);
      message.success('个人资料更新成功');
    } catch (error) {
      console.error('Update profile error:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (values: { 
    currentPassword: string; 
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的新密码不一致');
      return;
    }

    setPasswordLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch (error) {
      console.error('Change password error:', error);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRegenerateAvatar = () => {
    const newSeed = generateRandomSeed();
    setAvatarSeed(newSeed);
  };

  const handleCopySeed = () => {
    navigator.clipboard.writeText(avatarSeed);
    message.success('头像种子已复制到剪贴板');
  };

  const avatarSrc = generateAvatarDataUrl(avatarSeed);

  return (
    <div>
      <Title level={2}>个人资料</Title>
      <Text type="secondary">管理您的账户信息和安全设置</Text>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} md={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Avatar 
                src={avatarSrc} 
                size={120}
                icon={<UserOutlined />}
                style={{ marginBottom: 16 }}
              />
              <Title level={4} style={{ margin: 0 }}>
                {user?.nickname || '用户'}
              </Title>
              <Text type="secondary">{user?.email}</Text>
            </div>
            <Divider />
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                头像预览
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                在右侧表单中修改种子
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card title="基本信息">
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleUpdateProfile}
            >
              <Form.Item
                name="nickname"
                label="昵称"
                rules={[
                  { required: true, message: '请输入昵称' },
                  { min: 2, message: '昵称至少2个字符' },
                  { max: 20, message: '昵称最多20个字符' },
                ]}
              >
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="请输入昵称" 
                />
              </Form.Item>

              <Form.Item
                name="email"
                label="邮箱"
              >
                <Input 
                  prefix={<MailOutlined />} 
                  disabled 
                />
              </Form.Item>

              <Form.Item
                label="头像种子"
                extra="修改种子可以生成不同的头像，或使用随机生成"
              >
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={avatarSeed}
                    onChange={(e) => setAvatarSeed(e.target.value)}
                    placeholder="输入头像种子"
                    prefix={<EditOutlined />}
                  />
                  <Tooltip title="复制种子">
                    <Button 
                      icon={<CopyOutlined />} 
                      onClick={handleCopySeed}
                    />
                  </Tooltip>
                  <Tooltip title="随机生成">
                    <Button 
                      icon={<SyncOutlined />} 
                      onClick={handleRegenerateAvatar}
                    />
                  </Tooltip>
                </Space.Compact>
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={profileLoading}
                  icon={<SaveOutlined />}
                >
                  保存修改
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Card title="修改密码" style={{ marginTop: 24 }}>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handleChangePassword}
            >
              <Form.Item
                name="currentPassword"
                label="当前密码"
                rules={[
                  { required: true, message: '请输入当前密码' },
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined />} 
                  placeholder="请输入当前密码" 
                />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="新密码"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码至少6位' },
                ]}
              >
                <Input.Password 
                  prefix={<KeyOutlined />} 
                  placeholder="请输入新密码" 
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="确认新密码"
                rules={[
                  { required: true, message: '请确认新密码' },
                ]}
              >
                <Input.Password 
                  prefix={<KeyOutlined />} 
                  placeholder="请再次输入新密码" 
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={passwordLoading}
                  icon={<SaveOutlined />}
                >
                  修改密码
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProfilePage;
