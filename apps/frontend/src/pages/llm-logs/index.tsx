import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Row, Col, Select, Button, Tag, Drawer, Descriptions, DatePicker, Space, message } from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { llmApi } from '@/services/llm';
import type { LlmLogQueryDto, LlmLog } from '@/services/llm';

const { RangePicker } = DatePicker;

const MODULE_OPTIONS = [
  { label: '全部模块', value: '' },
  { label: '研究 Agent', value: 'agent-research' },
  { label: '交易 Agent', value: 'agent-trading' },
  { label: '新闻分析', value: 'news-analysis' },
];

const PROVIDER_OPTIONS = [
  { label: '全部 Provider', value: '' },
  { label: 'Volcengine', value: 'volcengine' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: 'OpenRouter', value: 'openrouter' },
  { label: 'Ollama', value: 'ollama' },
];

const SUCCESS_OPTIONS = [
  { label: '全部状态', value: '' },
  { label: '成功', value: 'true' },
  { label: '失败', value: 'false' },
];

const MODULE_DISPLAY_MAP: Record<string, string> = {
  'agent-research': '研究 Agent',
  'agent-trading': '交易 Agent',
  'news-analysis': '新闻分析',
};

const MODULE_COLOR_MAP: Record<string, string> = {
  'agent-research': 'blue',
  'agent-trading': 'orange',
  'news-analysis': 'green',
};

const PROVIDER_COLOR_MAP: Record<string, string> = {
  volcengine: 'purple',
  deepseek: 'cyan',
  openrouter: 'geekblue',
  ollama: 'lime',
};

const formatDateTime = (text: string) => {
  if (!text) return '-';
  const d = new Date(text);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const LlmLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LlmLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<LlmLogQueryDto>({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LlmLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await llmApi.getLogList({
        ...filters,
        page: pagination.current,
        pageSize: pagination.pageSize,
      });
      setLogs(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('[LlmLogsPage] Failed to fetch logs:', error);
      message.error('获取日志列表失败');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleDateRangeChange = (_: any, dateStrings: [string, string]) => {
    setFilters((prev) => ({
      ...prev,
      startDate: dateStrings[0] || undefined,
      endDate: dateStrings[1] || undefined,
    }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleReset = () => {
    setFilters({});
    setPagination({ current: 1, pageSize: 20 });
  };

  const handleTableChange = (pag: any) => {
    setPagination({
      current: pag.current,
      pageSize: pag.pageSize,
    });
  };

  const handleViewDetail = async (id: string) => {
    setDrawerVisible(true);
    setDetailLoading(true);
    try {
      const detail = await llmApi.getLogDetail(id);
      setSelectedLog(detail);
    } catch (error) {
      console.error('[LlmLogsPage] Failed to fetch log detail:', error);
      message.error('获取日志详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (module: string) => (
        <Tag color={MODULE_COLOR_MAP[module] || 'default'}>
          {MODULE_DISPLAY_MAP[module] || module}
        </Tag>
      ),
    },
    {
      title: '任务',
      dataIndex: 'task',
      key: 'task',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
      render: (provider: string) => (
        <Tag color={PROVIDER_COLOR_MAP[provider] || 'default'}>{provider}</Tag>
      ),
    },
    {
      title: '模型',
      dataIndex: 'model',
      key: 'model',
      width: 160,
      ellipsis: true,
    },
    {
      title: 'Token 用量',
      dataIndex: 'totalTokens',
      key: 'totalTokens',
      width: 120,
      render: (val: number) => val?.toLocaleString() ?? '-',
    },
    {
      title: '耗时',
      dataIndex: 'latencyMs',
      key: 'latencyMs',
      width: 100,
      render: (val: number) => (val != null ? `${val}ms` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      width: 80,
      render: (success: boolean) => (
        <Tag color={success ? 'success' : 'error'}>{success ? '成功' : '失败'}</Tag>
      ),
    },
    {
      title: '缓存',
      dataIndex: 'cacheHit',
      key: 'cacheHit',
      width: 80,
      render: (cacheHit: boolean) => (
        <Tag color={cacheHit ? 'blue' : 'default'}>{cacheHit ? '命中' : '未命中'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: LlmLog) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record.id)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Select
              style={{ width: 140 }}
              placeholder="模块"
              options={MODULE_OPTIONS}
              value={filters.module || ''}
              onChange={(value) => handleFilterChange('module', value)}
            />
          </Col>
          <Col>
            <Select
              style={{ width: 150 }}
              placeholder="Provider"
              options={PROVIDER_OPTIONS}
              value={filters.provider || ''}
              onChange={(value) => handleFilterChange('provider', value)}
            />
          </Col>
          <Col>
            <Select
              style={{ width: 120 }}
              placeholder="状态"
              options={SUCCESS_OPTIONS}
              value={filters.success || ''}
              onChange={(value) => handleFilterChange('success', value)}
            />
          </Col>
          <Col>
            <RangePicker onChange={handleDateRangeChange} />
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={fetchLogs}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={logs}
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
          scroll={{ x: 1200 }}
        />
      </Card>

      <Drawer
        title="LLM 请求详情"
        width={640}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedLog(null);
        }}
        loading={detailLoading}
      >
        {selectedLog && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="模块">
              <Tag color={MODULE_COLOR_MAP[selectedLog.module] || 'default'}>
                {MODULE_DISPLAY_MAP[selectedLog.module] || selectedLog.module}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="任务">{selectedLog.task}</Descriptions.Item>
            <Descriptions.Item label="Provider">
              <Tag color={PROVIDER_COLOR_MAP[selectedLog.provider] || 'default'}>
                {selectedLog.provider}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="模型">{selectedLog.model}</Descriptions.Item>
            <Descriptions.Item label="Request ID">{selectedLog.requestId}</Descriptions.Item>
            <Descriptions.Item label="Trace ID">{selectedLog.traceId}</Descriptions.Item>
            <Descriptions.Item label="Prompt Tokens">
              {selectedLog.promptTokens?.toLocaleString() ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Completion Tokens">
              {selectedLog.completionTokens?.toLocaleString() ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Total Tokens">
              {selectedLog.totalTokens?.toLocaleString() ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="预估成本">
              {selectedLog.estimatedCost ? `¥${selectedLog.estimatedCost}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="耗时">
              {selectedLog.latencyMs != null ? `${selectedLog.latencyMs}ms` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="重试次数">{selectedLog.retryCount ?? 0}</Descriptions.Item>
            <Descriptions.Item label="缓存命中">
              <Tag color={selectedLog.cacheHit ? 'blue' : 'default'}>
                {selectedLog.cacheHit ? '命中' : '未命中'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selectedLog.success ? 'success' : 'error'}>
                {selectedLog.success ? '成功' : '失败'}
              </Tag>
            </Descriptions.Item>
            {!selectedLog.success && selectedLog.errorMessage && (
              <Descriptions.Item label="错误信息">
                <span style={{ color: '#ff4d4f' }}>{selectedLog.errorMessage}</span>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="时间">{formatDateTime(selectedLog.createdAt)}</Descriptions.Item>
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <Descriptions.Item label="Metadata">
                <pre style={{ margin: 0, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
                  <code>{JSON.stringify(selectedLog.metadata, null, 2)}</code>
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default LlmLogsPage;
