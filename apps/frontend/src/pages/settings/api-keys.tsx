import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Typography,
  message,
  Popconfirm,
  Tooltip,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  KeyOutlined,
  CopyOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  getApiKeys,
  createApiKey,
  deleteApiKey,
  type ApiKeyResponse,
  type ApiKeyWithKeyResponse,
} from '@/services/api-key';

const { Title, Text } = Typography;

const ApiKeysPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyWithKeyResponse | null>(null);
  const [form] = Form.useForm();

  // 获取 API Key 列表
  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const data = await getApiKeys();
      setApiKeys(data);
    } catch (error) {
      console.error('获取 API Key 列表失败:', error);
      message.error('获取 API Key 列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  // 打开创建 Modal
  const handleAdd = () => {
    form.resetFields();
    form.setFieldsValue({
      rateLimit: 60,
    });
    setModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async (values: { name: string; rateLimit: number }) => {
    try {
      const data = await createApiKey({
        name: values.name,
        rateLimit: values.rateLimit,
      });
      setCreatedKey(data);
      setModalVisible(false);
      fetchApiKeys();
    } catch (error) {
      console.error('创建 API Key 失败:', error);
      message.error('创建 API Key 失败');
    }
  };

  // 删除 API Key
  const handleDelete = async (id: string) => {
    try {
      await deleteApiKey(id);
      message.success('API Key 删除成功');
      fetchApiKeys();
    } catch (error) {
      console.error('删除 API Key 失败:', error);
      message.error('删除 API Key 失败');
    }
  };

  // 复制到剪贴板
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      active: { color: 'green', label: '启用' },
      disabled: { color: 'red', label: '禁用' },
    };
    const config = statusMap[status] || { color: 'default', label: status };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => (
        <Space>
          <KeyOutlined />
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '限流（次/分钟）',
      dataIndex: 'rateLimit',
      key: 'rateLimit',
      width: 150,
      render: (rateLimit: number) => (
        <Space>
          <ClockCircleOutlined />
          <span>{rateLimit}</span>
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: ApiKeyResponse) => (
        <Popconfirm
          title="确认删除"
          description="确定要删除这个 API Key 吗？删除后将无法恢复。"
          onConfirm={() => handleDelete(record.id)}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>API Key 管理</Title>

      <Alert
        message="使用说明"
        description={
          <div>
            <p>API Key 用于外部系统调用 MCP 服务。创建后请妥善保管，key 值仅在创建时显示一次。</p>
            <p>调用 MCP 接口时，请在请求头中添加：x-api-key: YOUR_API_KEY</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card
        title="API Key 列表"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            创建 API Key
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={apiKeys}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      {/* 创建 API Key Modal */}
      <Modal
        title="创建 API Key"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={500}
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
              { required: true, message: '请输入 API Key 名称' },
              { max: 100, message: '名称最多 100 个字符' },
            ]}
          >
            <Input placeholder="例如：MCP Demo 调用" prefix={<KeyOutlined />} />
          </Form.Item>

          <Form.Item
            name="rateLimit"
            label="限流（次/分钟）"
            rules={[{ required: true, message: '请设置限流值' }]}
            tooltip="每分钟允许的最大请求数"
          >
            <InputNumber
              min={1}
              max={10000}
              style={{ width: '100%' }}
              placeholder="60"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 显示创建的 API Key Modal */}
      <Modal
        title="API Key 创建成功"
        open={!!createdKey}
        onCancel={() => setCreatedKey(null)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setCreatedKey(null)}>
            确定
          </Button>,
        ]}
        width={600}
        closable={false}
        maskClosable={false}
      >
        <Alert
          message="请妥善保管您的 API Key"
          description="此 key 值仅在创建时显示一次，关闭后将无法再次查看。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
          <Text strong>名称：</Text>
          <Text>{createdKey?.name}</Text>
          <br />
          <Text strong>限流：</Text>
          <Text>{createdKey?.rateLimit} 次/分钟</Text>
          <br />
          <Text strong>API Key：</Text>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <Input
              value={createdKey?.key}
              readOnly
              style={{ flex: 1 }}
            />
            <Button
              icon={<CopyOutlined />}
              onClick={() => createdKey?.key && handleCopy(createdKey.key)}
            >
              复制
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ApiKeysPage;
