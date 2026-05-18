import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Table, Switch, Button, Modal, Form, InputNumber, Input, message, Tag, Spin, Typography } from 'antd';
import { NumberOutlined, ApiOutlined, WarningOutlined, DollarOutlined, ThunderboltOutlined, ReloadOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { llmApi } from '@/services/llm';
import type { LlmTodayStats, LlmModuleUsage, LlmProviderUsage, LlmLatencyStats, LlmProviderConfig } from '@/services/types';
import styles from './index.module.scss';

const { Title } = Typography;

const formatCost = (val: number) => `¥${val.toFixed(4)}`;

const formatPercent = (val: number) => `${(val * 100).toFixed(2)}%`;

const LlmCenterPage: React.FC = () => {
  const [todayStats, setTodayStats] = useState<LlmTodayStats | null>(null);
  const [moduleUsage, setModuleUsage] = useState<LlmModuleUsage[]>([]);
  const [providerUsage, setProviderUsage] = useState<LlmProviderUsage[]>([]);
  const [latencyStats, setLatencyStats] = useState<LlmLatencyStats | null>(null);
  const [providerConfigs, setProviderConfigs] = useState<LlmProviderConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LlmProviderConfig | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm();
  const [form] = Form.useForm();

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, modules, providers, latency, configs] = await Promise.all([
        llmApi.getTodayStats(),
        llmApi.getModuleUsage(),
        llmApi.getProviderUsage(),
        llmApi.getLatencyStats(),
        llmApi.getProviderConfigs(),
      ]);
      setTodayStats(stats as unknown as LlmTodayStats);
      setModuleUsage((modules as unknown as LlmModuleUsage[]) || []);
      setProviderUsage((providers as unknown as LlmProviderUsage[]) || []);
      setLatencyStats(latency as unknown as LlmLatencyStats);
      setProviderConfigs((configs as unknown as LlmProviderConfig[]) || []);
    } catch {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleToggleEnabled = useCallback(async (record: LlmProviderConfig, checked: boolean) => {
    try {
      await llmApi.updateProviderConfig(record.provider, { enabled: checked });
      setProviderConfigs(prev =>
        prev.map(c => (c.provider === record.provider ? { ...c, enabled: checked } : c)),
      );
      message.success('状态更新成功');
    } catch {
      message.error('状态更新失败');
    }
  }, []);

  const handleEdit = useCallback((record: LlmProviderConfig) => {
    setEditingConfig(record);
    form.setFieldsValue({
      enabled: record.enabled,
      defaultModel: record.defaultModel,
      rpmLimit: record.rpmLimit,
      dailyBudget: record.dailyBudget,
    });
    setEditModalVisible(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!editingConfig) return;
    try {
      const values = await form.validateFields();
      setEditLoading(true);
      await llmApi.updateProviderConfig(editingConfig.provider, values);
      setProviderConfigs(prev =>
        prev.map(c => (c.provider === editingConfig.provider ? { ...c, ...values } : c)),
      );
      message.success('配置更新成功');
      setEditModalVisible(false);
      setEditingConfig(null);
    } catch {
      message.error('配置更新失败');
    } finally {
      setEditLoading(false);
    }
  }, [editingConfig, form]);

  const handleCreate = useCallback(async () => {
    try {
      const values = await createForm.validateFields();
      setCreateLoading(true);
      await llmApi.createProviderConfig(values);
      message.success('配置创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      fetchAllData();
    } catch {
      message.error('配置创建失败');
    } finally {
      setCreateLoading(false);
    }
  }, [createForm, fetchAllData]);

  const moduleColumns: ColumnsType<LlmModuleUsage> = [
    { title: '模块', dataIndex: 'module', key: 'module' },
    { title: 'Token 消耗', dataIndex: 'totalTokens', key: 'totalTokens', render: (v: number) => v?.toLocaleString() },
    { title: '请求数', dataIndex: 'totalRequests', key: 'totalRequests', render: (v: number) => v?.toLocaleString() },
    { title: '花费', dataIndex: 'totalCost', key: 'totalCost', render: (v: number) => formatCost(v) },
  ];

  const providerUsageColumns: ColumnsType<LlmProviderUsage> = [
    { title: 'Provider', dataIndex: 'provider', key: 'provider' },
    { title: '模型', dataIndex: 'model', key: 'model', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Token 消耗', dataIndex: 'totalTokens', key: 'totalTokens', render: (v: number) => v?.toLocaleString() },
    { title: '请求数', dataIndex: 'totalRequests', key: 'totalRequests', render: (v: number) => v?.toLocaleString() },
    { title: '花费', dataIndex: 'totalCost', key: 'totalCost', render: (v: number) => formatCost(v) },
  ];

  const configColumns: ColumnsType<LlmProviderConfig> = [
    { title: 'Provider', dataIndex: 'provider', key: 'provider' },
    {
      title: '启用状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (v: boolean, record: LlmProviderConfig) => (
        <Switch checked={v} onChange={(checked) => handleToggleEnabled(record, checked)} />
      ),
    },
    { title: '默认模型', dataIndex: 'defaultModel', key: 'defaultModel', render: (v: string | null) => v || '-' },
    { title: 'RPM 限制', dataIndex: 'rpmLimit', key: 'rpmLimit', render: (v: number | null) => v?.toLocaleString() || '-' },
    { title: '每日 Token 预算', dataIndex: 'dailyBudget', key: 'dailyBudget', render: (v: number | null) => v?.toLocaleString() || '-' },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: LlmProviderConfig) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>AI 运行中心</Title>
        <Button icon={<ReloadOutlined />} onClick={fetchAllData} loading={loading}>
          刷新
        </Button>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日 Token 消耗"
                value={todayStats?.totalTokens ?? 0}
                valueStyle={{ color: '#1890ff' }}
                prefix={<NumberOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日请求数"
                value={todayStats?.totalRequests ?? 0}
                valueStyle={{ color: '#52c41a' }}
                prefix={<ApiOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日错误数"
                value={todayStats?.totalErrors ?? 0}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日花费"
                value={todayStats?.totalCost ?? 0}
                precision={6}
                prefix={<DollarOutlined />}
                suffix="CNY"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card title="模块使用统计">
              <Table
                columns={moduleColumns}
                dataSource={moduleUsage}
                rowKey="module"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Provider 使用统计">
              <Table
                columns={providerUsageColumns}
                dataSource={providerUsage}
                rowKey={(r) => `${r.provider}-${r.model}`}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="平均响应时间"
                value={latencyStats?.avgLatencyMs ?? 0}
                suffix="ms"
                valueStyle={{ color: '#1890ff' }}
                prefix={<ThunderboltOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="重试率"
                value={latencyStats ? formatPercent(latencyStats.retryRate) : '0.00%'}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="超时率"
                value={latencyStats ? formatPercent(latencyStats.timeoutRate) : '0.00%'}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Provider 预算配置" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>新增配置</Button>}>
          <Table
            columns={configColumns}
            dataSource={providerConfigs}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      </Spin>

      <Modal
        title="编辑 Provider 配置"
        open={editModalVisible}
        onOk={handleSave}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingConfig(null);
        }}
        confirmLoading={editLoading}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="defaultModel" label="默认模型">
            <Input placeholder="请输入默认模型" />
          </Form.Item>
          <Form.Item name="rpmLimit" label="RPM 限制">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入 RPM 限制" />
          </Form.Item>
          <Form.Item name="dailyBudget" label="每日 Token 预算">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入每日 Token 预算" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增 Provider 配置"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        confirmLoading={createLoading}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="provider" label="Provider 名称" rules={[{ required: true, message: '请输入 Provider 名称' }]}>
            <Input placeholder="如：volcengine、deepseek、openrouter、ollama" />
          </Form.Item>
          <Form.Item name="enabled" label="启用状态" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key">
            <Input.Password placeholder="请输入 API Key" />
          </Form.Item>
          <Form.Item name="baseUrl" label="API 基础 URL" rules={[{ required: true, message: '请输入 API 基础 URL' }]}>
            <Input placeholder="如：https://api.deepseek.com/v1" />
          </Form.Item>
          <Form.Item name="defaultModel" label="默认模型" rules={[{ required: true, message: '请输入默认模型' }]}>
            <Input placeholder="如：deepseek-chat" />
          </Form.Item>
          <Form.Item name="rpmLimit" label="RPM 限制" initialValue={60}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入 RPM 限制" />
          </Form.Item>
          <Form.Item name="dailyBudget" label="每日 Token 预算" initialValue={1000000}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入每日 Token 预算" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LlmCenterPage;
