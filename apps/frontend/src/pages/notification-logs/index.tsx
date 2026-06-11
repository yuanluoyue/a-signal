import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Space, Select, DatePicker, Button, Modal, Descriptions, message } from 'antd';
import { ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client from '@/services/client';

const { RangePicker } = DatePicker;

const typeMap: Record<string, { label: string; color: string }> = {
  signal: { label: '信号通知', color: 'blue' },
  signal_test: { label: '信号测试', color: 'cyan' },
  test: { label: '测试通知', color: 'geekblue' },
  daily_report: { label: '日报', color: 'green' },
  weekly_report: { label: '周报', color: 'purple' },
};

const statusMap: Record<string, { label: string; color: string }> = {
  sending: { label: '发送中', color: 'processing' },
  success: { label: '成功', color: 'success' },
  failed: { label: '失败', color: 'warning' },
  error: { label: '错误', color: 'error' },
};

const NotificationLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentLog, setCurrentLog] = useState<any>(null);

  // 筛选条件
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterWebhookId, setFilterWebhookId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await client.get('/webhooks');
      const result = response as any;
      setWebhooks(result?.data || []);
    } catch (error) {
      console.error('Fetch webhooks error:', error);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterWebhookId) params.webhookId = filterWebhookId;
      if (dateRange && dateRange[0]) params.startDate = dateRange[0].startOf('day').toISOString();
      if (dateRange && dateRange[1]) params.endDate = dateRange[1].endOf('day').toISOString();

      const response = await client.get('/notification-logs', { params });
      const result = response as any;
      setLogs(result?.data || []);
      setTotal(result?.total || 0);
    } catch (error) {
      console.error('Fetch notification logs error:', error);
      message.error('获取通知记录失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterType, filterStatus, filterWebhookId, dateRange]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleViewDetail = (record: any) => {
    setCurrentLog(record);
    setDetailModalVisible(true);
  };

  const handleReset = () => {
    setFilterType(undefined);
    setFilterStatus(undefined);
    setFilterWebhookId(undefined);
    setDateRange(null);
    setPage(1);
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (v: string) => {
        const info = typeMap[v] || { label: v, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Webhook',
      dataIndex: 'webhookName',
      key: 'webhookName',
      width: 160,
      render: (name: string, record: any) => name || record.webhookUrl || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => {
        const info = statusMap[v] || { label: v, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: any) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <span>类型：</span>
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: 140 }}
            allowClear
            placeholder="全部类型"
          >
            {Object.entries(typeMap).map(([key, { label }]) => (
              <Select.Option key={key} value={key}>{label}</Select.Option>
            ))}
          </Select>

          <span>状态：</span>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 120 }}
            allowClear
            placeholder="全部状态"
          >
            {Object.entries(statusMap).map(([key, { label }]) => (
              <Select.Option key={key} value={key}>{label}</Select.Option>
            ))}
          </Select>

          <span>Webhook：</span>
          <Select
            value={filterWebhookId}
            onChange={setFilterWebhookId}
            style={{ width: 180 }}
            allowClear
            placeholder="全部 Webhook"
          >
            {webhooks.map((w: any) => (
              <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>
            ))}
          </Select>

          <span>时间范围：</span>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              setDateRange(dates);
              setPage(1);
            }}
          />

          <Button icon={<ReloadOutlined />} onClick={fetchLogs} loading={loading}>
            刷新
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      <Modal
        title="通知详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {currentLog && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{currentLog.id}</Descriptions.Item>
            <Descriptions.Item label="时间">
              {dayjs(currentLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="类型">
              <Tag color={typeMap[currentLog.type]?.color || 'default'}>
                {typeMap[currentLog.type]?.label || currentLog.type}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="标题">{currentLog.title || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[currentLog.status]?.color || 'default'}>
                {statusMap[currentLog.status]?.label || currentLog.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Webhook 名称">{currentLog.webhookName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Webhook URL">{currentLog.webhookUrl || '-'}</Descriptions.Item>
            {currentLog.content && (
              <Descriptions.Item label="内容">
                <div style={{ whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
                  {currentLog.content}
                </div>
              </Descriptions.Item>
            )}
            {currentLog.response && (
              <Descriptions.Item label="响应">
                <div style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto', fontSize: 12, color: '#666' }}>
                  {currentLog.response}
                </div>
              </Descriptions.Item>
            )}
            {currentLog.signalId && (
              <Descriptions.Item label="信号 ID">{currentLog.signalId}</Descriptions.Item>
            )}
            {currentLog.strategyId && (
              <Descriptions.Item label="策略 ID">{currentLog.strategyId}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default NotificationLogs;
