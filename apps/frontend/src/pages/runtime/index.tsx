import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Switch, Select, Typography, message, Tooltip, Tag, Space, Alert } from 'antd';
import { ThunderboltOutlined, WarningOutlined, RobotOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client from '@/services/client';
import { tradingAgentApi } from '@/services/trading-agent';
import type { TradingAgentRuntime } from '@/services/trading-agent';

const { Title } = Typography;

interface StrategyRuntime {
  id: string;
  strategyId: string;
  webhookId: string | null;
  accountId: string | null;
  enableWebhook: boolean;
  enableSimulation: boolean;
  enableLiveTrading: boolean;
  enableAgent: boolean;
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

interface SimulationAccount {
  id: string;
  name: string | null;
  initialCapital: string;
  currentCapital: string;
  availableCash: string;
  totalProfit: string;
  totalReturn: string;
}

const directionModeMap: Record<string, string> = {
  long_only: '仅做多',
  short_only: '仅做空',
  both: '双向',
};

const formatMoney = (amount: number | string | null | undefined) => {
  if (amount === null || amount === undefined) return '¥0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '¥0.00';
  return `¥${num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const RuntimePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [simulationAccounts, setSimulationAccounts] = useState<SimulationAccount[]>([]);
  const [agentRuntime, setAgentRuntime] = useState<TradingAgentRuntime | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);

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

  const fetchSimulationAccounts = useCallback(async () => {
    try {
      const response = await client.get('/simulation/accounts');
      const data = response.data || [];
      setSimulationAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('获取模拟账户列表失败:', error);
    }
  }, []);

  const fetchAgentRuntime = useCallback(async () => {
    setAgentLoading(true);
    try {
      const data = await tradingAgentApi.getRuntime();
      setAgentRuntime(data);
    } catch (error) {
      console.error('获取交易 Agent 运行时配置失败:', error);
    } finally {
      setAgentLoading(false);
    }
  }, []);

  const handleAgentSwitchChange = async (checked: boolean) => {
    setAgentLoading(true);
    try {
      const data = await tradingAgentApi.updateRuntime({
        status: checked ? 'running' : 'stopped',
        accountId: agentRuntime?.accountId,
      });
      setAgentRuntime(data);
      message.success(checked ? '交易 Agent 已启动' : '交易 Agent 已停止');
    } catch (error) {
      console.error('更新交易 Agent 状态失败:', error);
      message.error('更新交易 Agent 状态失败');
    } finally {
      setAgentLoading(false);
    }
  };

  const handleAgentAccountChange = async (accountId: string | null) => {
    setAgentLoading(true);
    try {
      const data = await tradingAgentApi.updateRuntime({ accountId });
      setAgentRuntime(data);
      message.success('模拟账户已更新');
    } catch (error) {
      console.error('更新交易 Agent 账户失败:', error);
      message.error('更新模拟账户失败');
    } finally {
      setAgentLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchWebhooks();
    fetchSimulationAccounts();
    fetchAgentRuntime();
  }, [fetchData, fetchWebhooks, fetchSimulationAccounts, fetchAgentRuntime]);

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
      width: 280,
      align: 'center' as const,
      render: (_: unknown, record: Strategy) => {
        const enableSimulation = record.runtime?.enableSimulation ?? false;
        const accountId = record.runtime?.accountId || undefined;
        const showWarning = enableSimulation && !accountId;

        return (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Space size={8}>
              <Switch
                checked={enableSimulation}
                onChange={(checked) => handleRuntimeUpdate(record.id, 'enableSimulation', checked)}
              />
              {enableSimulation && (
                <Select
                  value={accountId}
                  placeholder="选择模拟账户"
                  allowClear
                  style={{ width: 160 }}
                  options={simulationAccounts.map((a) => ({
                    label: `${a.name || '未命名'} (${formatMoney(a.currentCapital)})`,
                    value: a.id,
                  }))}
                  onChange={(value) => handleRuntimeUpdate(record.id, 'accountId', value || null)}
                />
              )}
            </Space>
            {showWarning && (
              <Tooltip title="请选择模拟账户">
                <Tag color="warning" icon={<WarningOutlined />}>未选择账户</Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
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
      title: '触发 Agent',
      key: 'enableAgent',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: Strategy) => (
        <Tooltip title={agentEnabled ? '信号匹配此策略时触发交易 Agent' : '请先启用交易 Agent'}>
          <Switch
            checked={record.runtime?.enableAgent ?? false}
            disabled={!agentEnabled}
            onChange={(checked) => handleRuntimeUpdate(record.id, 'enableAgent', checked)}
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

  const agentEnabled = agentRuntime?.status === 'running';
  const agentNoAccount = agentEnabled && !agentRuntime?.accountId;

  return (
    <div>
      <Title level={2}><ThunderboltOutlined /> 运行管理</Title>
      <Card
        title={<Space><RobotOutlined />交易 Agent</Space>}
        style={{ marginBottom: 24 }}
        loading={agentLoading && !agentRuntime}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space size={16} align="center">
            <span>运行状态：</span>
            <Switch
              checked={agentEnabled}
              onChange={handleAgentSwitchChange}
              loading={agentLoading}
              checkedChildren="运行中"
              unCheckedChildren="已停止"
            />
            <span>模拟账户：</span>
            <Select
              value={agentRuntime?.accountId || undefined}
              placeholder="选择模拟账户"
              allowClear
              style={{ width: 240 }}
              options={simulationAccounts.map((a) => ({
                label: `${a.name || '未命名'} (${formatMoney(a.currentCapital)})`,
                value: a.id,
              }))}
              onChange={handleAgentAccountChange}
              loading={agentLoading}
            />
          </Space>
          <Space size={16} align="center">
            <span>上次运行时间：</span>
            <span>{agentRuntime?.lastRunAt ? dayjs(agentRuntime.lastRunAt).format('YYYY-MM-DD HH:mm:ss') : '暂无'}</span>
          </Space>
          {agentNoAccount && (
            <Alert
              message="交易 Agent 已启用但未选择模拟账户，请选择一个模拟账户后再运行"
              type="warning"
              showIcon
            />
          )}
        </Space>
      </Card>
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
