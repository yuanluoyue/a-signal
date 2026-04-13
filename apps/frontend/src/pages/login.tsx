import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Checkbox, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'umi';
import { authApi } from '@/services/auth';
import { setToken, isAuthenticated } from '@/utils/auth';
import { useUser } from '@/contexts/UserContext';

const { Title } = Typography;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 处理浏览器自动填充的凭据
  const handleAutoFill = () => {
    console.log('[Login] Checking for auto-fill...');
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
    
    console.log('[Login] Email input found:', !!emailInput);
    console.log('[Login] Password input found:', !!passwordInput);
    console.log('[Login] Email input value:', emailInput?.value);
    console.log('[Login] Password input has value:', !!passwordInput?.value);
    
    if (emailInput?.value && passwordInput?.value) {
      console.log('[Login] Auto-fill detected, setting form values');
      form.setFieldsValue({
        email: emailInput.value,
        password: passwordInput.value,
        remember: true
      });
      console.log('[Login] Form values set from auto-fill');
    } else {
      console.log('[Login] No auto-fill detected or inputs empty');
    }
  };

  useEffect(() => {
    console.log('[Login] useEffect running');
    
    // 获取记住的登录信息（从 rememberedCredentials key）
    const rememberedCredentialsStr = localStorage.getItem('rememberedCredentials');
    console.log('[Login] rememberedCredentials:', rememberedCredentialsStr);
    
    if (rememberedCredentialsStr) {
      try {
        const credentials = JSON.parse(rememberedCredentialsStr);
        console.log('[Login] Parsed credentials:', credentials);
        
        if (credentials.email && credentials.password) {
          console.log('[Login] Setting form values with remembered credentials');
          form.setFieldsValue({ 
            email: credentials.email, 
            password: credentials.password,
            remember: true 
          });
          console.log('[Login] Form values set from rememberedCredentials');
        }
      } catch (error) {
        console.error('[Login] Failed to parse rememberedCredentials:', error);
      }
    } else {
      console.log('[Login] No rememberedCredentials found');
    }
    
    // 延迟检查登录状态，确保 UserContext 已初始化
    const timer = setTimeout(() => {
      console.log('[Login] Checking authentication, isAuthenticated:', isAuthenticated());
      if (isAuthenticated()) {
        navigate('/dashboard');
      }
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [navigate, form]);

  const handleSubmit = async (values: { email: string; password: string; remember: boolean }) => {
    console.log('[Login] Form submitted with values:', values);
    console.log('[Login] Remember checkbox value:', values.remember);
    
    setLoading(true);
    try {
      const response = await authApi.login({
        email: values.email,
        password: values.password,
      });
      
      console.log('[Login] Response:', response);
      console.log('[Login] Access token:', response.accessToken);
      
      if (!response.accessToken) {
        message.error('登录失败：未获取到访问令牌');
        return;
      }
      
      setToken(response.accessToken, values.remember);
      console.log('[Login] Token stored, checking localStorage:', localStorage.getItem('a_signal_token'));
      setUser(response.user);
      
      console.log('[Login] About to check remember condition, values.remember =', values.remember);
      if (values.remember) {
        console.log('[Login] Saving remembered credentials to localStorage');
        localStorage.setItem('rememberedCredentials', JSON.stringify({
          email: values.email,
          password: values.password
        }));
        console.log('[Login] Credentials saved to localStorage');
      } else {
        console.log('[Login] Remember is false, removing credentials from localStorage');
        localStorage.removeItem('rememberedCredentials');
      }
      
      // 验证存储结果
      console.log('[Login] Verified credentials in storage:', localStorage.getItem('rememberedCredentials'));
      
      message.success('登录成功');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            A Signal
          </Title>
          <p style={{ color: '#666', marginTop: 8 }}>股票分析系统</p>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="邮箱"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住我</Checkbox>
              </Form.Item>
            </div>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{ borderRadius: 8 }}
            >
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <span style={{ color: '#666' }}>还没有账号？</span>
            <Link to="/register" style={{ marginLeft: 8 }}>
              立即注册
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
