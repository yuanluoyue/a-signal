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
  Typography,
  message,
  Popconfirm,
  Tooltip,
  Radio,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  BellOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import client from '@/services/client';
import type { Signal } from '@/services/types';

const { Title, Text } = Typography;
const { Option } = Select;

interface Webhook {
  id: string;
  name: string;
  url: string;
  type: 'wechat' | 'dingtalk' | 'slack' | 'custom';
  enabled: boolean;
  strategies?: Array<{ id: string; name: string }>;
  createdAt: string;
  updatedAt: string;
}

interface WebhookFormData {
  name: string;
  url: string;
  type: 'wechat' | 'dingtalk' | 'slack' | 'custom';
  enabled?: boolean;
}

const NotificationsPage: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [form] = Form.useForm();
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<Webhook | null>(null);
  const [recentSignals, setRecentSignals] = useState<Signal[]>([]);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [loadingSignals, setLoadingSignals] = useState(false);

  // 获取 Webhook 列表
  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const response = await client.get<{ data: Webhook[]; total: number }>('/webhooks');
      console.log('[Notifications] Webhooks response:', response);
      const webhooksData = response.data?.data || response.data || [];
      console.log('[Notifications] Webhooks data:', webhooksData);

      const webhooksWithStrategies = await Promise.all(
        (webhooksData as Webhook[]).map(async (wh: Webhook) => {
          try {
            const strategiesRes = await client.get<{ data: Array<{ id: string; name: string }> }>(`/webhooks/${wh.id}/strategies`);
            const strategies = strategiesRes.data?.data || strategiesRes.data || [];
            return { ...wh, strategies: Array.isArray(strategies) ? strategies : [] };
          } catch {
            return { ...wh, strategies: [] };
          }
        })
      );

      setWebhooks(webhooksWithStrategies);
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
      enabled: record.enabled,
    });
    setModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async (values: WebhookFormData) => {
    try {
      const payload = {
        name: values.name,
        url: values.url,
        type: values.type,
        enabled: values.enabled,
      };

      if (editingWebhook) {
        await client.put(`/webhooks/${editingWebhook.id}`, payload);
        message.success('Webhook 更新成功');
      } else {
        await client.post('/webhooks', payload);
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
      await client.delete(`/webhooks/${id}`);
      message.success('Webhook 删除成功');
      fetchWebhooks();
    } catch (error) {
      console.error('删除 Webhook 失败:', error);
      message.error('删除 Webhook 失败');
    }
  };

  // 测试 Webhook - 打开测试弹窗
  const handleTest = async (webhook: Webhook) => {
    try {
      setTestingWebhook(webhook);
      setLoadingSignals(true);
      setSelectedSignalId(null);
      setTestModalVisible(true);
      
      const response = await client.get<{ data: Signal[] }>(`/webhooks/${webhook.id}/signals`);
      console.log('[Notifications] Signals response:', response);
      const signalsData = response.data?.data || response.data || [];
      console.log('[Notifications] Signals data:', signalsData);
      setRecentSignals(Array.isArray(signalsData) ? signalsData : []);
    } catch (error) {
      console.error('获取信号列表失败:', error);
      message.error('获取信号列表失败');
      setTestModalVisible(false);
    } finally {
      setLoadingSignals(false);
    }
  };

  // 发送测试通知
  const handleTestSignal = async () => {
    if (!testingWebhook || !selectedSignalId) {
      message.warning('请选择一个信号进行测试');
      return;
    }

    try {
      setTestingWebhookId(testingWebhook.id);
      await client.post(`/webhooks/${testingWebhook.id}/test-signal/${selectedSignalId}`);
      message.success('测试消息已发送');
      setTestModalVisible(false);
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
      const response = await client.put(`/webhooks/${id}/toggle`);
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

  // 格式化分数范围显示
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
      title: '绑定策略',
      key: 'strategies',
      width: 200,
      render: (_: any, record: Webhook) => {
        if (!record.strategies || record.strategies.length === 0) {
          return <Text type="secondary">未绑定</Text>;
        }
        return (
          <Space wrap>
            {record.strategies.map((s) => (
              <Tag key={s.id} color="blue">{s.name}</Tag>
            ))}
          </Space>
        );
      },
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
      width: 250,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: any, record: Webhook) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<SendOutlined />}
            onClick={() => handleTest(record)}
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

      <Modal
        title={`测试 Webhook - ${testingWebhook?.name || ''}`}
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        onOk={handleTestSignal}
        okText="发送测试"
        cancelText="取消"
        okButtonProps={{ 
          disabled: !selectedSignalId,
          loading: testingWebhookId === testingWebhook?.id,
        }}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">选择一个信号进行测试，测试消息将发送到配置的 Webhook URL</Text>
        </div>
        
        {loadingSignals ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text>加载信号列表中...</Text>
          </div>
        ) : recentSignals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">暂无信号数据</Text>
          </div>
        ) : (
          <Radio.Group
            value={selectedSignalId}
            onChange={(e) => setSelectedSignalId(e.target.value)}
            style={{ width: '100%' }}
          >
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {recentSignals.map((signal) => {
                const action = signal.action || (signal.direction === 'bullish' ? 'long' : signal.direction === 'bearish' ? 'short' : 'hold');
                const score = signal.score ? parseFloat(signal.score) : (signal.confidence ? signal.confidence / 100 : 0);
                const time = signal.generatedAt || signal.signalTime || signal.createdAt;
                
                return (
                  <Radio
                    key={signal.id}
                    value={signal.id}
                    style={{ 
                      width: '100%', 
                      padding: '12px',
                      marginBottom: '8px',
                      border: selectedSignalId === signal.id ? '2px solid #1890ff' : '1px solid #f0f0f0',
                      borderRadius: '4px',
                      display: 'block',
                    }}
                  >
                    <div style={{ marginLeft: 8 }}>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Space>
                          <Tag color={action === 'long' ? 'green' : action === 'short' ? 'red' : 'default'}>
                            {action === 'long' ? '买入' : action === 'short' ? '卖出' : '观望'}
                          </Tag>
                          <Text strong>{signal.stockName || signal.stockCode || signal.symbol}</Text>
                          <Text type="secondary">({signal.stockCode || signal.symbol})</Text>
                        </Space>
                        <Space>
                          <Text type="secondary">分数: {score.toFixed(2)}</Text>
                          <Text type="secondary">|</Text>
                          <Text type="secondary">
                            {time ? new Date(time).toLocaleString('zh-CN') : '-'}
                          </Text>
                        </Space>
                        {signal.reason && (
                          <Text type="secondary" ellipsis style={{ maxWidth: 600 }}>
                            理由: {signal.reason}
                          </Text>
                        )}
                      </Space>
                    </div>
                  </Radio>
                );
              })}
            </div>
          </Radio.Group>
        )}
      </Modal>
    </div>
  );
};

export default NotificationsPage;
