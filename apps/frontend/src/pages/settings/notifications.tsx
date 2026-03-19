import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Switch,
  Modal,
  Form,
  Input,
  Select,
  Slider,
  Typography,
  message,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  BellOutlined,
  LinkOutlined,
  PercentageOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import api from '@/services/api';

const { Title } = Typography;
const { Option } = Select;

interface Webhook {
  id: string;
  name: string;
  url: string;
  type: 'wechat' | 'dingtalk' | 'slack' | 'custom';
  confidenceThreshold: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WebhookFormData {
  name: string;
  url: string;
  type: 'wechat' | 'dingtalk' | 'slack' | 'custom';
  confidenceThreshold: number;
  enabled?: boolean;
}

const NotificationsPage: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [form] = Form.useForm();
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);

  // 获取 Webhook 列表
  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ data: Webhook[]; total: number }>('/webhooks');
      console.log('[Notifications] Webhooks response:', response);
      // 处理响应数据
      const webhooksData = response.data?.data || response.data || [];
      console.log('[Notifications] Webhooks data:', webhooksData);
      setWebhooks(webhooksData);
    } catch (error) {
      console.error('获取 Webhook 列表失败:', error);
      message.error('获取 Webhook 列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  // 打开添加 Modal
  const handleAdd = () => {
    setEditingWebhook(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'wechat',
      confidenceThreshold: 70,
      enabled: true,
    });
    setModalVisible(true);
  };

  // 打开编辑 Modal
  const handleEdit = (record: Webhook) => {
    setEditingWebhook(record);
    form.setFieldsValue({
      name: record.name,
      url: record.url,
      type: record.type,
      confidenceThreshold: record.confidenceThreshold,
      enabled: record.enabled,
    });
    setModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async (values: WebhookFormData) => {
    try {
      if (editingWebhook) {
        await api.put(`/webhooks/${editingWebhook.id}`, values);
        message.success('Webhook 更新成功');
      } else {
        await api.post('/webhooks', values);
        message.success('Webhook 创建成功');
      }
      setModalVisible(false);
      fetchWebhooks();
    } catch (error) {
      console.error('保存 Webhook 失败:', error);
      message.error('保存 Webhook 失败');
    }
  };

  // 删除 Webhook
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/webhooks/${id}`);
      message.success('Webhook 删除成功');
      fetchWebhooks();
    } catch (error) {
      console.error('删除 Webhook 失败:', error);
      message.error('删除 Webhook 失败');
    }
  };

  // 测试 Webhook
  const handleTest = async (id: string) => {
    try {
      setTestingWebhookId(id);
      await api.post(`/webhooks/${id}/test`);
      message.success('测试消息已发送');
    } catch (error) {
      console.error('测试 Webhook 失败:', error);
      message.error('测试 Webhook 失败');
    } finally {
      setTestingWebhookId(null);
    }
  };

  // 切换启用状态
  const handleToggleEnabled = async (id: string) => {
    try {
      const response = await api.put(`/webhooks/${id}/toggle`);
      message.success(response.data.message);
      fetchWebhooks();
    } catch (error) {
      console.error('切换 Webhook 状态失败:', error);
      message.error('切换 Webhook 状态失败');
    }
  };

  // 获取 Webhook 类型标签
  const getTypeTag = (type: string) => {
    const typeMap: Record<string, { color: string; label: string }> = {
      wechat: { color: 'green', label: '企业微信' },
      dingtalk: { color: 'blue', label: '钉钉' },
      slack: { color: 'purple', label: 'Slack' },
      custom: { color: 'default', label: '自定义' },
    };
    const config = typeMap[type] || { color: 'default', label: type };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string) => (
        <Space>
          <BellOutlined />
          <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{name}</span>
        </Space>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      width: 300,
      ellipsis: true,
      render: (url: string) => (
        <Tooltip title={url}>
          <Space>
            <LinkOutlined />
            <span style={{ whiteSpace: 'nowrap' }}>{url}</span>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => getTypeTag(type),
    },
    {
      title: '置信度阈值',
      dataIndex: 'confidenceThreshold',
      key: 'confidenceThreshold',
      width: 120,
      align: 'center' as const,
      render: (threshold: number) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <PercentageOutlined style={{ color: threshold >= 70 ? '#52c41a' : '#faad14' }} />
          <span>{threshold}%</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      align: 'center' as const,
      render: (enabled: boolean, record: Webhook) => (
        <Switch
          checked={enabled}
          onChange={() => handleToggleEnabled(record.id)}
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<CloseCircleOutlined />}
        />
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: any, record: Webhook) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<SendOutlined />}
            loading={testingWebhookId === record.id}
            onClick={() => handleTest(record.id)}
          >
            测试
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个 Webhook 吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>通知设置</Title>

      <Card
        title="Webhook 管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加 Webhook
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={webhooks}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1100 }}
          style={{ zIndex: 1 }}
        />
      </Card>

      <Modal
        title={editingWebhook ? '编辑 Webhook' : '添加 Webhook'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="名称"
            rules={[
              { required: true, message: '请输入 Webhook 名称' },
              { max: 100, message: '名称最多 100 个字符' },
            ]}
          >
            <Input placeholder="例如：企业微信通知" prefix={<BellOutlined />} />
          </Form.Item>

          <Form.Item
            name="url"
            label="Webhook URL"
            rules={[
              { required: true, message: '请输入 Webhook URL' },
              { type: 'url', message: '请输入有效的 URL' },
            ]}
          >
            <Input.TextArea
              placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
              rows={2}
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择 Webhook 类型' }]}
          >
            <Select placeholder="选择 Webhook 类型">
              <Option value="wechat">企业微信</Option>
              <Option value="dingtalk">钉钉</Option>
              <Option value="slack">Slack</Option>
              <Option value="custom">自定义</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="confidenceThreshold"
            label="置信度阈值"
            rules={[{ required: true, message: '请设置置信度阈值' }]}
          >
            <Slider
              min={0}
              max={100}
              marks={{
                0: '0%',
                50: '50%',
                70: '70%',
                100: '100%',
              }}
            />
          </Form.Item>

          <Form.Item
            name="enabled"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="启用"
              unCheckedChildren="禁用"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NotificationsPage;
