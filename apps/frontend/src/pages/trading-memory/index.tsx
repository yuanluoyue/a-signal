import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Badge,
  Progress,
  Statistic,
  Row,
  Col,
  Select,
  Input,
  Button,
  Modal,
  Descriptions,
  Space,
  Typography,
  message,
} from 'antd';
import {
  FileSearchOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { tradingMemoryApi } from '@/services/trading-memory';
import type {
  TradingMemory,
  TradingMemoryType,
  TradingMemoryStatus,
  TradingMemoryStatsResponse,
} from '@/services/types';
import styles from './index.module.scss';

const { Title } = Typography;

const TYPE_OPTIONS: { value: TradingMemoryType; label: string; color: string }[] = [
  { value: 'event_pattern', label: '事件模式', color: 'blue' },
  { value: 'signal_pattern', label: '信号模式', color: 'green' },
  { value: 'strategy_pattern', label: '策略模式', color: 'purple' },
  { value: 'market_regime_pattern', label: '市场环境模式', color: 'orange' },
  { value: 'risk_pattern', label: '风险模式', color: 'red' },
];

const STATUS_OPTIONS: { value: TradingMemoryStatus; label: string; color: string }[] = [
  { value: 'testing', label: '测试中', color: 'processing' },
  { value: 'active', label: '活跃', color: 'success' },
  { value: 'dormant', label: '休眠', color: 'warning' },
  { value: 'invalidated', label: '已失效', color: 'error' },
];

const getTypeLabel = (type: TradingMemoryType) =>
  TYPE_OPTIONS.find((o) => o.value === type) || { label: type, color: 'default' };

const getStatusOption = (status: TradingMemoryStatus) =>
  STATUS_OPTIONS.find((o) => o.value === status) || { label: status, color: 'default' };

const formatPercent = (val: number | undefined | null) => {
  if (val == null) return '-';
  return `${(val * 100).toFixed(2)}%`;
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const TradingMemoryPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TradingMemory[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [stats, setStats] = useState<TradingMemoryStatsResponse | null>(null);

  const [filterType, setFilterType] = useState<TradingMemoryType | undefined>();
  const [filterStatus, setFilterStatus] = useState<TradingMemoryStatus | undefined>();
  const [keyword, setKeyword] = useState('');

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<TradingMemory | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await tradingMemoryApi.getStats();
      setStats(res);
    } catch {
      message.error('获取统计数据失败');
    }
  }, []);

  const fetchData = useCallback(
    async (page = current, size = pageSize) => {
      setLoading(true);
      try {
        const res = await tradingMemoryApi.getList({
          page,
          pageSize: size,
          type: filterType,
          status: filterStatus,
          keyword: keyword || undefined,
        });
        setData(res.data);
        setTotal(res.total);
        setCurrent(page);
        setPageSize(size);
      } catch {
        message.error('获取经验列表失败');
      } finally {
        setLoading(false);
      }
    },
    [current, pageSize, filterType, filterStatus, keyword],
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchData(1);
  }, [filterType, filterStatus]);

  const handleSearch = () => {
    fetchData(1);
  };

  const handleViewDetail = async (record: TradingMemory) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const detail = await tradingMemoryApi.getById(record.id);
      setDetailData(detail);
    } catch {
      message.error('获取经验详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: ColumnsType<TradingMemory> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 240,
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: TradingMemoryType) => {
        const opt = getTypeLabel(type);
        return <Tag color={opt.color}>{opt.label}</Tag>;
      },
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 120,
      render: (val: string) => {
        const num = parseFloat(val);
        const percent = Math.round(num * 100);
        const color = num >= 0.8 ? '#52c41a' : num >= 0.5 ? '#faad14' : '#ff4d4f';
        return <Progress percent={percent} size="small" strokeColor={color} />;
      },
    },
    {
      title: '胜率',
      key: 'winRate',
      width: 90,
      render: (_: unknown, record: TradingMemory) => formatPercent(record.stats?.winRate),
    },
    {
      title: '平均收益',
      key: 'avgReturn',
      width: 100,
      render: (_: unknown, record: TradingMemory) => {
        const val = record.stats?.avgReturn;
        if (val == null) return '-';
        const num = val * 100;
        return (
          <span style={{ color: num >= 0 ? '#52c41a' : '#ff4d4f' }}>
            {num >= 0 ? '+' : ''}{num.toFixed(2)}%
          </span>
        );
      },
    },
    {
      title: '样本量',
      key: 'sampleSize',
      width: 80,
      render: (_: unknown, record: TradingMemory) => record.stats?.sampleSize ?? '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: TradingMemoryStatus) => {
        const opt = getStatusOption(status);
        return <Badge status={opt.color as 'success'} text={opt.label} />;
      },
    },
    {
      title: '最近验证',
      dataIndex: 'lastValidatedAt',
      key: 'lastValidatedAt',
      width: 160,
      render: (val: string | null) => formatDate(val),
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      fixed: 'right',
      render: (_: unknown, record: TradingMemory) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Title level={2}>交易经验</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总经验数"
              value={stats?.total ?? 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<FileSearchOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="高置信经验"
              value={stats?.highConfidence ?? 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<SafetyCertificateOutlined />}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              置信度 ≥ 0.8
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="有用经验"
              value={stats?.active ?? 0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<CheckCircleOutlined />}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              状态为活跃
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已失效经验"
              value={stats?.invalidated ?? 0}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              状态为已失效
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="经验类型"
            allowClear
            style={{ width: 150 }}
            value={filterType}
            onChange={(val) => setFilterType(val)}
            options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <Input.Search
            placeholder="搜索标题或摘要"
            allowClear
            style={{ width: 250 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={handleSearch}
            enterButton={<SearchOutlined />}
          />
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
          onChange={(pagination) => {
            fetchData(pagination.current || 1, pagination.pageSize || 20);
          }}
        />
      </Card>

      <Modal
        title={detailData?.title || '经验详情'}
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setDetailData(null);
        }}
        footer={null}
        width={720}
        loading={detailLoading}
      >
        {detailData && (
          <div className={styles.detailContent}>
            <Descriptions title="基本信息" bordered size="small" column={2}>
              <Descriptions.Item label="类型">
                <Tag color={getTypeLabel(detailData.type).color}>
                  {getTypeLabel(detailData.type).label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Badge
                  status={getStatusOption(detailData.status).color as 'success'}
                  text={getStatusOption(detailData.status).label}
                />
              </Descriptions.Item>
              <Descriptions.Item label="置信度">
                <Progress
                  percent={Math.round(parseFloat(detailData.confidence) * 100)}
                  size="small"
                  style={{ width: 120 }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="标签">
                <Space wrap>
                  {detailData.tags?.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="摘要" span={2}>
                {detailData.summary}
              </Descriptions.Item>
              {detailData.rationale && (
                <Descriptions.Item label="依据说明" span={2}>
                  {detailData.rationale}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Descriptions title="模式匹配" bordered size="small" column={2} style={{ marginTop: 16 }}>
              {detailData.pattern?.eventType && (
                <Descriptions.Item label="事件类型">{detailData.pattern.eventType}</Descriptions.Item>
              )}
              {detailData.pattern?.eventSubcategory && (
                <Descriptions.Item label="事件子类">{detailData.pattern.eventSubcategory}</Descriptions.Item>
              )}
              {detailData.pattern?.marketRegime && (
                <Descriptions.Item label="市场环境">{detailData.pattern.marketRegime}</Descriptions.Item>
              )}
              {detailData.pattern?.strategyId && (
                <Descriptions.Item label="策略ID">{detailData.pattern.strategyId}</Descriptions.Item>
              )}
              {detailData.pattern?.signalDirection && (
                <Descriptions.Item label="信号方向">
                  {detailData.pattern.signalDirection === 'long' ? '做多' : '做空'}
                </Descriptions.Item>
              )}
              {detailData.pattern?.scoreRange && (
                <Descriptions.Item label="分数范围">
                  [{detailData.pattern.scoreRange[0]}, {detailData.pattern.scoreRange[1]}]
                </Descriptions.Item>
              )}
            </Descriptions>

            <Descriptions title="统计数据" bordered size="small" column={2} style={{ marginTop: 16 }}>
              <Descriptions.Item label="样本量">{detailData.stats?.sampleSize ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="平均收益">{formatPercent(detailData.stats?.avgReturn)}</Descriptions.Item>
              <Descriptions.Item label="期望值">{formatPercent(detailData.stats?.expectancy)}</Descriptions.Item>
              <Descriptions.Item label="胜率">{formatPercent(detailData.stats?.winRate)}</Descriptions.Item>
              <Descriptions.Item label="夏普比率">{detailData.stats?.sharpeRatio?.toFixed(2) ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="最大回撤">{formatPercent(detailData.stats?.maxDrawdown)}</Descriptions.Item>
              <Descriptions.Item label="平均持有天数">{detailData.stats?.avgHoldDays ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="盈亏因子">{detailData.stats?.profitFactor?.toFixed(2) ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="PnL标准差">{detailData.stats?.pnlStdDev?.toFixed(4) ?? '-'}</Descriptions.Item>
            </Descriptions>

            <Descriptions title="时间信息" bordered size="small" column={2} style={{ marginTop: 16 }}>
              <Descriptions.Item label="首次观察">{formatDate(detailData.firstObservedAt)}</Descriptions.Item>
              <Descriptions.Item label="最近验证">{formatDate(detailData.lastValidatedAt)}</Descriptions.Item>
              <Descriptions.Item label="失效时间">{formatDate(detailData.invalidatedAt)}</Descriptions.Item>
              <Descriptions.Item label="最近计算">{formatDate(detailData.lastComputedAt)}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TradingMemoryPage;
