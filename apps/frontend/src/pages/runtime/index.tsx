import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Switch, Select, Typography, message, Tooltip, Tag } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import client from '@/services/client';

const { Title } = Typography;

interface StrategyRuntime {
  id: string;
  strategyId: string;
  webhookId: string | null;
  enableWebhook: boolean;
  enableSimulation: boolean;
  enableLiveTrading: boolean;
}

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  directionMode: string;
  minScore: string;
  maxScore: string | null;
  holdPeriod: number;
  stopLossPct: string | null;
  takeProfitPct: string | null;
  runtime: StrategyRuntime | null;
}

interface Webhook {
  id: string;
  name: string;
  enabled: boolean;
}

const directionModeMap: Record<string, string> = {
  long_only: '仅做多',
  short_only: '仅做空',
  both: '双向',
};

const RuntimePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await client.get('/strategies', { params: { enabled: true, pageSize: 100 } });
      const data = response.data || [];
      setStrategies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('获取策略列表失败:', error);
      message.error('获取策略列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await client.get('/webhooks');
      const data = response.data || response;
      setWebhooks((Array.isArray(data) ? data : []).filter((w: Webhook) => w.enabled));
    } catch (error) {
      console.error('获取 Webhook 列表失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchWebhooks();
  }, [fetchData, fetchWebhooks]);

  const handleRuntimeUpdate = async (strategyId: string, field: string, value: boolean | string | null) => {
    try {
      await client.put(`/strategies/${strategyId}/runtime`, { [field]: value });
      message.success('更新成功');
      fetchData();
    } catch (error) {
      console.error('更新运行时配置失败:', error);
      message.error('更新失败');
    }
  };

  const columns = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '方向模式',
      dataIndex: 'directionMode',
      key: 'directionMode',
      width: 100,
      render: (mode: string) => <Tag color="blue">{directionModeMap[mode] || mode}</Tag>,
    },
    {
      title: 'Webhook 通知',
      key: 'enableWebhook',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: Strategy) => (
        <Switch
          checked={record.runtime?.enableWebhook ?? true}
          onChange={(checked) => handleRuntimeUpdate(record.id, 'enableWebhook', checked)}
        />
      ),
    },
    {
      title: '模拟交易',
      key: 'enableSimulation',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: Strategy) => (
        <Switch
          checked={record.runtime?.enableSimulation ?? false}
          onChange={(checked) => handleRuntimeUpdate(record.id, 'enableSimulation', checked)}
        />
      ),
    },
    {
      title: '实盘交易',
      key: 'enableLiveTrading',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: Strategy) => (
        <Tooltip title="暂未开放">
          <Switch
            checked={record.runtime?.enableLiveTrading ?? false}
            disabled
          />
        </Tooltip>
      ),
    },
    {
      title: '绑定 Webhook',
      key: 'webhookId',
      width: 180,
      render: (_: unknown, record: Strategy) => (
        <Select
          value={record.runtime?.webhookId || undefined}
          placeholder="选择 Webhook"
          allowClear
          style={{ width: '100%' }}
          options={webhooks.map((w) => ({ label: w.name, value: w.id }))}
          onChange={(value) => handleRuntimeUpdate(record.id, 'webhookId', value || null)}
        />
      ),
    },
  ];

  return (
    <div>
      <Title level={2}><ThunderboltOutlined /> 运行管理</Title>
      <Card>
        <Table
          columns={columns}
          dataSource={strategies}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: '暂无已启用的策略' }}
        />
      </Card>
    </div>
  );
};

export default RuntimePage;
