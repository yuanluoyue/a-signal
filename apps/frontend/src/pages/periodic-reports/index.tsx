import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  message,
  Select,
  DatePicker,
  Modal,
  Descriptions,
  Statistic,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  RobotOutlined,
  SignalFilled,
  SendOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { periodicReportApi, type PeriodicReport, type PeriodicReportContent } from '@/services/periodic-report';
import client from '@/services/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface WebhookOption {
  id: string;
  name: string;
  enabled: boolean;
}

const PeriodicReportsPage: React.FC = () => {
  const [reports, setReports] = useState<PeriodicReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState<'daily' | 'weekly' | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<PeriodicReport | null>(null);
  const [generating, setGenerating] = useState(false);

  const [webhookOptions, setWebhookOptions] = useState<WebhookOption[]>([]);
  const [dailyWebhookIds, setDailyWebhookIds] = useState<string[]>([]);
  const [weeklyWebhookIds, setWeeklyWebhookIds] = useState<string[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof periodicReportApi.getReports>[0] = { page, pageSize };
      if (typeFilter) params.type = typeFilter;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].startOf('day').toISOString();
        params.endDate = dateRange[1].endOf('day').toISOString();
      }
      const result = await periodicReportApi.getReports(params);
      setReports(result.data || []);
      setTotal(result.total);
    } catch (error) {
      console.error('获取报告列表失败:', error);
      message.error('获取报告列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const response = await client.get<{ data: WebhookOption[] }>('/webhooks');
      const data = response.data?.data || response.data || [];
      setWebhookOptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('获取 Webhook 列表失败:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const config = await periodicReportApi.getConfig();
      setDailyWebhookIds(config.dailyWebhookIds || []);
      setWeeklyWebhookIds(config.weeklyWebhookIds || []);
    } catch (error) {
      console.error('获取推送配置失败:', error);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchWebhooks();
    fetchConfig();
  }, [page, pageSize, typeFilter]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await periodicReportApi.updateConfig({ dailyWebhookIds, weeklyWebhookIds });
      message.success('推送配置保存成功');
    } catch (error) {
      console.error('保存推送配置失败:', error);
      message.error('保存推送配置失败');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    try {
      await periodicReportApi.testPush();
      message.success('测试推送已发送');
    } catch (error) {
      console.error('测试推送失败:', error);
      message.error('测试推送失败');
    } finally {
      setTestingPush(false);
    }
  };

  const handleGenerateDaily = async () => {
    setGenerating(true);
    try {
      await periodicReportApi.generateDailyReport();
      message.success('日报生成成功');
      fetchReports();
    } catch (error) {
      console.error('生成日报失败:', error);
      message.error('生成日报失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateWeekly = async () => {
    setGenerating(true);
    try {
      await periodicReportApi.generateWeeklyReport();
      message.success('周报生成成功');
      fetchReports();
    } catch (error) {
      console.error('生成周报失败:', error);
      message.error('生成周报失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleViewDetail = (record: PeriodicReport) => {
    setSelectedReport(record);
    setDetailModalVisible(true);
  };

  const renderContentSummary = (content: PeriodicReportContent) => {
    const profitColor = content.overall.totalProfit >= 0 ? '#cf1322' : '#3f8600';
    return (
      <Space size="large">
        <Text>策略: <Text strong>{content.strategies.length}</Text> 个</Text>
        <Text>交易: <Text strong>{content.overall.totalTrades}</Text> 笔</Text>
        <Text>胜率: <Text strong>{(content.overall.totalWinRate * 100).toFixed(1)}%</Text></Text>
        <Text>盈利: <Text strong style={{ color: profitColor }}>{content.overall.totalProfit >= 0 ? '+' : ''}{content.overall.totalProfit.toFixed(2)}</Text></Text>
        <Text>信号: <Text strong>{content.signals.totalCount}</Text></Text>
      </Space>
    );
  };

  const renderDetailContent = (report: PeriodicReport) => {
    const content = report.content;
    const profitColor = content.overall.totalProfit >= 0 ? '#cf1322' : '#3f8600';
    const agentProfitColor = content.tradingAgent.totalProfit >= 0 ? '#cf1322' : '#3f8600';

    return (
      <div>
        <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="报告类型">
            <Tag color={report.type === 'daily' ? 'blue' : 'purple'}>{report.type === 'daily' ? '日报' : '周报'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={report.status === 'completed' ? 'green' : 'red'}>{report.status === 'completed' ? '已完成' : '失败'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="周期开始">{new Date(content.period.start).toLocaleString('zh-CN')}</Descriptions.Item>
          <Descriptions.Item label="周期结束">{new Date(content.period.end).toLocaleString('zh-CN')}</Descriptions.Item>
        </Descriptions>

        <Card title="📈 策略表现" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}><Statistic title="活跃策略" value={content.strategies.length} suffix="个" /></Col>
            <Col span={6}><Statistic title="总交易" value={content.overall.totalTrades} suffix="笔" /></Col>
            <Col span={6}><Statistic title="综合胜率" value={(content.overall.totalWinRate * 100).toFixed(1)} suffix="%" /></Col>
            <Col span={6}>
              <Statistic title="总盈利" value={content.overall.totalProfit} precision={2}
                prefix={content.overall.totalProfit >= 0 ? <RiseOutlined /> : <FallOutlined />} suffix="元" valueStyle={{ color: profitColor }} />
            </Col>
          </Row>
          {content.strategies.length > 0 && (
            <>
              <Divider orientation="left" style={{ fontSize: 12 }}>策略明细</Divider>
              <Table size="small" pagination={false} dataSource={content.strategies} rowKey="id"
                columns={[
                  { title: '策略名称', dataIndex: 'name', key: 'name' },
                  { title: '交易笔数', dataIndex: 'tradeCount', key: 'tradeCount', align: 'right' },
                  { title: '胜率', dataIndex: 'winRate', key: 'winRate', align: 'right', render: (v: number) => `${(v * 100).toFixed(1)}%` },
                  { title: '盈利', dataIndex: 'totalProfit', key: 'totalProfit', align: 'right', render: (v: number) => <Text style={{ color: v >= 0 ? '#cf1322' : '#3f8600' }}>{v >= 0 ? '+' : ''}{v.toFixed(2)}</Text> },
                  { title: '收益率', dataIndex: 'totalReturn', key: 'totalReturn', align: 'right', render: (v: number) => `${(v * 100).toFixed(2)}%` },
                ]}
              />
            </>
          )}
        </Card>

        <Card title={<><RobotOutlined /> 交易 Agent</>} size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}><Statistic title="总决策" value={content.tradingAgent.decisionCount} suffix="次" /></Col>
            <Col span={6}><Statistic title="批准" value={content.tradingAgent.approvedCount} suffix="次" /></Col>
            <Col span={6}><Statistic title="胜率" value={(content.tradingAgent.winRate * 100).toFixed(1)} suffix="%" /></Col>
            <Col span={6}>
              <Statistic title="盈利" value={content.tradingAgent.totalProfit} precision={2}
                prefix={content.tradingAgent.totalProfit >= 0 ? <RiseOutlined /> : <FallOutlined />} suffix="元" valueStyle={{ color: agentProfitColor }} />
            </Col>
          </Row>
        </Card>

        <Card title={<><SignalFilled /> 信号统计</>} size="small">
          <Row gutter={16}>
            <Col span={6}><Statistic title="总信号" value={content.signals.totalCount} /></Col>
            <Col span={6}><Statistic title="做多" value={content.signals.longCount} valueStyle={{ color: '#cf1322' }} /></Col>
            <Col span={6}><Statistic title="做空" value={content.signals.shortCount} valueStyle={{ color: '#3f8600' }} /></Col>
            <Col span={6}><Statistic title="观望" value={content.signals.holdCount} /></Col>
          </Row>
        </Card>
      </div>
    );
  };

  const columns = [
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 80,
      render: (type: string) => <Tag color={type === 'daily' ? 'blue' : 'purple'}>{type === 'daily' ? '日报' : '周报'}</Tag>,
    },
    {
      title: '周期', key: 'period', width: 200,
      render: (_: unknown, record: PeriodicReport) => (
        <Text>{new Date(record.periodStart).toLocaleDateString('zh-CN')} ~ {new Date(record.periodEnd).toLocaleDateString('zh-CN')}</Text>
      ),
    },
    {
      title: '摘要', key: 'summary',
      render: (_: unknown, record: PeriodicReport) => {
        if (record.status !== 'completed') return <Tag color="red">生成失败</Tag>;
        return renderContentSummary(record.content);
      },
    },
    {
      title: '推送', key: 'webhooks', width: 100,
      render: (_: unknown, record: PeriodicReport) => {
        if (!record.webhookIds || record.webhookIds.length === 0) return <Text type="secondary">未推送</Text>;
        return <Tag color="blue">{record.webhookIds.length} 个</Tag>;
      },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (status: string) => <Tag color={status === 'completed' ? 'green' : 'red'}>{status === 'completed' ? '完成' : '失败'}</Tag>,
    },
    {
      title: '生成时间', dataIndex: 'createdAt', key: 'createdAt', width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作', key: 'action', width: 100, align: 'center' as const,
      render: (_: unknown, record: PeriodicReport) => (
        <Button type="link" size="small" onClick={() => handleViewDetail(record)}>查看详情</Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        定期报告
      </Title>

      <Card title="推送配置" style={{ marginBottom: 16 }} extra={
        <Space>
          <Button icon={<SendOutlined />} onClick={handleTestPush} loading={testingPush}>
            测试推送
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveConfig} loading={savingConfig}>
            保存配置
          </Button>
        </Space>
      }>
        <Row gutter={24}>
          <Col span={12}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>日报推送 Webhook</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>每天 18:00 生成日报后推送到选中的 Webhook</Text>
            </div>
            <Select
              mode="multiple"
              placeholder="选择要接收日报推送的 Webhook"
              value={dailyWebhookIds}
              onChange={setDailyWebhookIds}
              style={{ width: '100%' }}
              options={webhookOptions.map(w => ({ label: w.name, value: w.id }))}
              allowClear
            />
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>周报推送 Webhook</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>每周六 10:00 生成周报后推送到选中的 Webhook</Text>
            </div>
            <Select
              mode="multiple"
              placeholder="选择要接收周报推送的 Webhook"
              value={weeklyWebhookIds}
              onChange={setWeeklyWebhookIds}
              style={{ width: '100%' }}
              options={webhookOptions.map(w => ({ label: w.name, value: w.id }))}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select placeholder="报告类型" allowClear style={{ width: 120 }} value={typeFilter}
            onChange={(value) => { setTypeFilter(value); setPage(1); }}>
            <Select.Option value="daily">日报</Select.Option>
            <Select.Option value="weekly">周报</Select.Option>
          </Select>
          <RangePicker value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
            placeholder={['开始日期', '结束日期']} />
          <Button icon={<ReloadOutlined />} onClick={fetchReports}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleGenerateDaily} loading={generating}>
            生成日报
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleGenerateWeekly} loading={generating}
            style={{ background: '#722ed1', borderColor: '#722ed1' }}>
            生成周报
          </Button>
        </Space>

        <Table columns={columns} dataSource={reports} rowKey="id" loading={loading}
          pagination={{
            current: page, pageSize, total, showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={selectedReport ? `${selectedReport.type === 'daily' ? '日报' : '周报'}详情` : '报告详情'}
        open={detailModalVisible} onCancel={() => setDetailModalVisible(false)} footer={null} width={900} destroyOnHidden
      >
        {selectedReport && renderDetailContent(selectedReport)}
      </Modal>
    </div>
  );
};

export default PeriodicReportsPage;
