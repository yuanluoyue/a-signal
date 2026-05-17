import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Tag, Typography, Space, Select, Button } from 'antd';
import { ReloadOutlined, AuditOutlined } from '@ant-design/icons';
import { getAuditLogs, type AuditLog, type AuditLogQueryParams } from '@/services/audit-log';

const { Title } = Typography;

const ACTION_OPTIONS = [
  { label: '全部操作', value: '' },
  { label: '用户登录', value: 'user.login' },
  { label: '用户注册', value: 'user.register' },
  { label: '修改密码', value: 'user.change_password' },
  { label: '修改资料', value: 'user.update_profile' },
  { label: 'API Key 创建', value: 'api_key.create' },
  { label: 'API Key 删除', value: 'api_key.delete' },
  { label: '策略创建', value: 'strategy.create' },
  { label: '策略更新', value: 'strategy.update' },
  { label: 'Webhook 创建', value: 'webhook.create' },
  { label: 'Webhook 更新', value: 'webhook.update' },
  { label: 'Webhook 删除', value: 'webhook.delete' },
  { label: '模拟账户创建', value: 'simulation.account_create' },
  { label: '模拟交易执行', value: 'simulation.trade_execute' },
  { label: '信号规则更新', value: 'signal_rule' },
  { label: '黑名单操作', value: 'blacklist' },
  { label: '定时任务更新', value: 'scheduler' },
];

const RESOURCE_OPTIONS = [
  { label: '全部资源', value: '' },
  { label: '用户', value: 'user' },
  { label: 'API Key', value: 'api_key' },
  { label: '策略', value: 'strategy' },
  { label: 'Webhook', value: 'webhook' },
  { label: '模拟账户', value: 'simulation_account' },
  { label: '模拟交易', value: 'simulation_trade' },
  { label: '信号规则', value: 'signal_rule' },
  { label: '黑名单', value: 'blacklist' },
  { label: '定时任务', value: 'scheduler_task' },
];

const ACTION_LABEL_MAP: Record<string, string> = {
  'user.login': '用户登录',
  'user.register': '用户注册',
  'user.change_password': '修改密码',
  'user.update_profile': '修改资料',
  'api_key.create': 'API Key 创建',
  'api_key.delete': 'API Key 删除',
  'strategy.create': '策略创建',
  'strategy.update': '策略更新',
  'webhook.create': 'Webhook 创建',
  'webhook.update': 'Webhook 更新',
  'webhook.delete': 'Webhook 删除',
  'simulation.account_create': '模拟账户创建',
  'simulation.trade_execute': '模拟交易执行',
  'signal_rule.create': '信号规则创建',
  'signal_rule.update': '信号规则更新',
  'blacklist.create': '黑名单添加',
  'blacklist.delete': '黑名单删除',
  'scheduler.update': '定时任务更新',
};

const AuditLogsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [filters, setFilters] = useState<AuditLogQueryParams>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAuditLogs({
        ...filters,
        page: pagination.current,
        pageSize: pagination.pageSize,
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pag: any) => {
    setPagination({
      current: pag.current,
      pageSize: pag.pageSize,
    });
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 160,
      render: (action: string) => (
        <Tag color="blue">{ACTION_LABEL_MAP[action] || action}</Tag>
      ),
    },
    {
      title: '资源类型',
      dataIndex: 'resource',
      key: 'resource',
      width: 120,
      render: (resource: string) => {
        const colorMap: Record<string, string> = {
          user: 'geekblue',
          api_key: 'orange',
          strategy: 'green',
          webhook: 'purple',
          simulation_account: 'cyan',
          simulation_trade: 'cyan',
          signal_rule: 'gold',
          blacklist: 'red',
          scheduler_task: 'magenta',
        };
        const labelMap: Record<string, string> = {
          user: '用户',
          api_key: 'API Key',
          strategy: '策略',
          webhook: 'Webhook',
          simulation_account: '模拟账户',
          simulation_trade: '模拟交易',
          signal_rule: '信号规则',
          blacklist: '黑名单',
          scheduler_task: '定时任务',
        };
        return <Tag color={colorMap[resource] || 'default'}>{labelMap[resource] || resource}</Tag>;
      },
    },
    {
      title: '资源ID',
      dataIndex: 'resourceId',
      key: 'resourceId',
      width: 160,
      ellipsis: true,
      render: (text: string | null) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'success' ? 'success' : 'error'}>
          {status === 'success' ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: 'IP 地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (text: string | null) => text || '-',
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      width: 200,
      ellipsis: true,
      render: (detail: Record<string, unknown> | null) => {
        if (!detail) return '-';
        const entries = Object.entries(detail);
        if (entries.length === 0) return '-';
        return (
          <span style={{ fontSize: 12, color: '#666' }}>
            {entries.map(([k, v]) => `${k}: ${String(v)}`).join(', ')}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <Title level={2}>
        <AuditOutlined style={{ marginRight: 8 }} />
        审计日志
      </Title>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            style={{ width: 160 }}
            placeholder="操作类型"
            options={ACTION_OPTIONS}
            value={filters.action || ''}
            onChange={(value) => handleFilterChange('action', value)}
          />
          <Select
            style={{ width: 140 }}
            placeholder="资源类型"
            options={RESOURCE_OPTIONS}
            value={filters.resource || ''}
            onChange={(value) => handleFilterChange('resource', value)}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
        </Space>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
};

export default AuditLogsPage;
