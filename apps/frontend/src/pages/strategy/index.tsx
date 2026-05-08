import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Modal,
  Typography,
  message,
  Select,
  Divider,
  Tag,
} from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import client from '@/services/client';
import { strategyApi } from '@/services/strategy';
import type {
  Strategy,
  CreateStrategyParams,
  UpdateStrategyParams,
  DirectionMode,
} from '@/services/types';

const { Title } = Typography;
const { TextArea } = Input;

const directionModeOptions = [
  { label: '仅做多', value: 'long_only' },
  { label: '仅做空', value: 'short_only' },
  { label: '双向', value: 'both' },
];

const categoryOptions = [
  { label: '宏观经济', value: 'macro' },
  { label: '政策', value: 'policy' },
  { label: '公司', value: 'company' },
  { label: '市场', value: 'market' },
  { label: '情绪', value: 'sentiment' },
];

const getDirectionModeLabel = (mode: DirectionMode) => {
  const option = directionModeOptions.find((o) => o.value === mode);
  return option?.label || mode;
};

const StrategyPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Strategy[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [form] = Form.useForm();
  const [webhooks, setWebhooks] = useState<Array<{ id: string; name: string; enabled: boolean }>>([]);

  const fetchData = useCallback(async (page: number, size: number) => {
    setLoading(true);
    try {
      const response = await strategyApi.getStrategiesList({
        page,
        pageSize: size,
      });
      setData(response.data);
      setTotal(response.total);
      setCurrent(page);
      setPageSize(size);
    } catch (error) {
      console.error('获取策略列表失败:', error);
      message.error('获取策略列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWebhooks = async () => {
    try {
      const response = await client.get<{ data: Array<{ id: string; name: string; enabled: boolean }> }>('/webhooks');
      const data = response.data?.data || response.data || [];
      setWebhooks((Array.isArray(data) ? data : []).filter((w: { enabled: boolean }) => w.enabled));
    } catch (error) {
      console.error('获取 Webhook 列表失败:', error);
    }
  };

  useEffect(() => {
    fetchData(1, 10);
    fetchWebhooks();
  }, [fetchData]);

  const handleAdd = () => {
    setEditingStrategy(null);
    form.resetFields();
    form.setFieldsValue({
      enabled: true,
      entryMode: 'next_open',
      directionMode: 'both',
      minScore: 0.2,
      holdPeriod: 5,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: Strategy) => {
    setEditingStrategy(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      enabled: record.enabled,
      minScore: parseFloat(record.minScore),
      maxScore: record.maxScore ? parseFloat(record.maxScore) : undefined,
      allowedCategories: record.allowedCategories || undefined,
      directionMode: record.directionMode,
      entryMode: record.entryMode,
      holdPeriod: record.holdPeriod,
      stopLossPct: record.stopLossPct ? parseFloat(record.stopLossPct) * 100 : undefined,
      takeProfitPct: record.takeProfitPct ? parseFloat(record.takeProfitPct) * 100 : undefined,
      maxSignalsPerDay: record.maxSignalsPerDay || undefined,
      maxPositions: record.maxPositions || undefined,
      webhookId: record.webhookId || undefined,
    });
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setModalLoading(true);

      const stopLossPct = values.stopLossPct ? values.stopLossPct / 100 : undefined;
      const takeProfitPct = values.takeProfitPct ? values.takeProfitPct / 100 : undefined;

      if (editingStrategy) {
        const params: UpdateStrategyParams = {
          name: values.name,
          description: values.description,
          enabled: values.enabled,
          minScore: values.minScore,
          maxScore: values.maxScore,
          allowedCategories: values.allowedCategories,
          directionMode: values.directionMode,
          entryMode: values.entryMode,
          holdPeriod: values.holdPeriod,
          stopLossPct,
          takeProfitPct,
          maxSignalsPerDay: values.maxSignalsPerDay,
          maxPositions: values.maxPositions,
          webhookId: values.webhookId,
        };
        await strategyApi.updateStrategy(editingStrategy.id, params);
        message.success('策略更新成功');
      } else {
        const params: CreateStrategyParams = {
          name: values.name,
          description: values.description,
          enabled: values.enabled,
          minScore: values.minScore,
          maxScore: values.maxScore,
          allowedCategories: values.allowedCategories,
          directionMode: values.directionMode,
          entryMode: values.entryMode,
          holdPeriod: values.holdPeriod,
          stopLossPct,
          takeProfitPct,
          maxSignalsPerDay: values.maxSignalsPerDay,
          maxPositions: values.maxPositions,
          webhookId: values.webhookId,
        };
        await strategyApi.createStrategy(params);
        message.success('策略创建成功');
      }

      setModalVisible(false);
      fetchData(current, pageSize);
    } catch (error) {
      console.error('保存策略失败:', error);
      message.error('保存策略失败');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleEnabled = async (record: Strategy, enabled: boolean) => {
    try {
      await strategyApi.updateStrategy(record.id, { enabled });
      message.success(`策略已${enabled ? '启用' : '禁用'}`);
      fetchData(current, pageSize);
    } catch (error) {
      console.error('更新策略状态失败:', error);
      message.error('更新策略状态失败');
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '启用状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      align: 'center' as const,
      render: (enabled: boolean, record: Strategy) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleEnabled(record, checked)}
        />
      ),
    },
    {
      title: '方向模式',
      dataIndex: 'directionMode',
      key: 'directionMode',
      width: 100,
      render: (mode: DirectionMode) => getDirectionModeLabel(mode),
    },
    {
      title: '绑定 Webhook',
      dataIndex: 'webhookId',
      key: 'webhookId',
      width: 120,
      render: (webhookId: string | null) => {
        if (!webhookId) return <Typography.Text type="secondary">未绑定</Typography.Text>;
        const webhook = webhooks.find(w => w.id === webhookId);
        return webhook ? <Tag color="green">{webhook.name}</Tag> : <Typography.Text type="secondary">未知</Typography.Text>;
      },
    },
    {
      title: '最低分数',
      dataIndex: 'minScore',
      key: 'minScore',
      width: 100,
      align: 'center' as const,
      render: (val: string) => parseFloat(val).toFixed(2),
    },
    {
      title: '持仓周期',
      dataIndex: 'holdPeriod',
      key: 'holdPeriod',
      width: 100,
      align: 'center' as const,
      render: (val: number) => `${val}根K线`,
    },
    {
      title: '止损/止盈',
      key: 'sl_tp',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: Strategy) => {
        const sl = record.stopLossPct ? `${(parseFloat(record.stopLossPct) * 100).toFixed(1)}%` : '-';
        const tp = record.takeProfitPct ? `${(parseFloat(record.takeProfitPct) * 100).toFixed(1)}%` : '-';
        return `${sl} / ${tp}`;
      },
    },
    {
      title: '每日信号上限',
      dataIndex: 'maxSignalsPerDay',
      key: 'maxSignalsPerDay',
      width: 110,
      align: 'center' as const,
      render: (val: number | null) => val ?? '-',
    },
    {
      title: '最大持仓',
      dataIndex: 'maxPositions',
      key: 'maxPositions',
      width: 100,
      align: 'center' as const,
      render: (val: number | null) => val ?? '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: Strategy) => (
        <Button
          type="primary"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>策略管理</Title>

      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加策略
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, size) => {
              const newSize = size || pageSize;
              setPageSize(newSize);
              fetchData(page, newSize);
            },
          }}
        />
      </Card>

      <Modal
        title={editingStrategy ? '编辑策略' : '添加策略'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        confirmLoading={modalLoading}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Divider orientation="left" plain>基本信息</Divider>
          <Form.Item
            name="name"
            label="策略名称"
            rules={[{ required: true, message: '请输入策略名称' }]}
          >
            <Input placeholder="请输入策略名称" />
          </Form.Item>
          <Form.Item name="description" label="策略描述">
            <TextArea rows={2} placeholder="请输入策略描述" />
          </Form.Item>
          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="webhookId" label="绑定 Webhook">
            <Select
              allowClear
              placeholder="选择绑定的 Webhook（可选）"
              options={webhooks.map(w => ({ label: w.name, value: w.id }))}
            />
          </Form.Item>

          <Divider orientation="left" plain>信号筛选</Divider>
          <Form.Item
            name="minScore"
            label="最低分数"
            rules={[{ required: true, message: '请输入最低分数' }]}
          >
            <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} placeholder="0 ~ 1" />
          </Form.Item>
          <Form.Item name="maxScore" label="最高分数">
            <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} placeholder="0 ~ 1" />
          </Form.Item>
          <Form.Item name="allowedCategories" label="允许的事件类别">
            <Select mode="multiple" options={categoryOptions} placeholder="不选则允许所有类别" />
          </Form.Item>
          <Form.Item
            name="directionMode"
            label="方向模式"
            rules={[{ required: true, message: '请选择方向模式' }]}
          >
            <Select options={directionModeOptions} />
          </Form.Item>

          <Divider orientation="left" plain>入场/出场</Divider>
          <Form.Item name="entryMode" label="入场模式">
            <Select disabled options={[{ label: '下一根开盘', value: 'next_open' }]} />
          </Form.Item>
          <Form.Item
            name="holdPeriod"
            label="持仓周期（K线根数）"
            rules={[{ required: true, message: '请输入持仓周期' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="stopLossPct" label="止损百分比">
            <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>
          <Form.Item name="takeProfitPct" label="止盈百分比">
            <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>

          <Divider orientation="left" plain>交易控制</Divider>
          <Form.Item name="maxSignalsPerDay" label="每日最大信号数">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="maxPositions" label="最大持仓数">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StrategyPage;
