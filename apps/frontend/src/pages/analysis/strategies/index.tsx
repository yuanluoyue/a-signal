import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Typography, Tag, Statistic, Row, Col, Empty, Button, Space } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, PieChartOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'umi';
import { getStrategiesAnalytics, type StrategyAnalytics } from '@/services/strategy-analytics';

const { Title } = Typography;

const DIRECTION_MAP: Record<string, { label: string; color: string }> = {
  long_only: { label: '仅做多', color: 'green' },
  short_only: { label: '仅做空', color: 'red' },
  both: { label: '双向', color: 'blue' },
};

const formatHoldingTime = (hours: number | null): string => {
  if (hours === null) return '-';
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  if (days < 30) return `${days.toFixed(1)}d`;
  const months = days / 30;
  return `${months.toFixed(1)}m`;
};

const StrategyAnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StrategyAnalytics[]>([]);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStrategiesAnalytics();
      setData(result || []);
    } catch (error) {
      console.error('Failed to fetch strategy analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = [
    {
      title: '策略名称',
      dataIndex: 'strategyName',
      key: 'strategyName',
      width: 160,
      fixed: 'left' as const,
      render: (name: string, record: StrategyAnalytics) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{name}</span>
          <Tag color={record.enabled ? 'success' : 'default'}>{record.enabled ? '启用' : '禁用'}</Tag>
        </Space>
      ),
    },
    {
      title: '方向',
      dataIndex: 'directionMode',
      key: 'directionMode',
      width: 90,
      render: (mode: string) => {
        const info = DIRECTION_MAP[mode] || { label: mode, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '交易次数',
      dataIndex: 'totalTrades',
      key: 'totalTrades',
      width: 90,
      sorter: (a: StrategyAnalytics, b: StrategyAnalytics) => a.totalTrades - b.totalTrades,
    },
    {
      title: '总收益',
      dataIndex: 'totalProfit',
      key: 'totalProfit',
      width: 130,
      sorter: (a: StrategyAnalytics, b: StrategyAnalytics) => a.totalProfit - b.totalProfit,
      render: (val: number) => (
        <Statistic
          value={val}
          precision={2}
          prefix={val >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          suffix="¥"
          valueStyle={{ color: val >= 0 ? '#3f8600' : '#cf1322', fontSize: 14 }}
        />
      ),
    },
    {
      title: '总收益率',
      dataIndex: 'totalReturn',
      key: 'totalReturn',
      width: 110,
      sorter: (a: StrategyAnalytics, b: StrategyAnalytics) => a.totalReturn - b.totalReturn,
      render: (val: number) => (
        <span style={{ color: val >= 0 ? '#3f8600' : '#cf1322', fontWeight: 500 }}>
          {val >= 0 ? '+' : ''}{val.toFixed(2)}%
        </span>
      ),
    },
    {
      title: '胜率',
      dataIndex: 'winRate',
      key: 'winRate',
      width: 90,
      sorter: (a: StrategyAnalytics, b: StrategyAnalytics) => a.winRate - b.winRate,
      render: (val: number) => (
        <span style={{ color: val >= 50 ? '#3f8600' : '#cf1322' }}>
          {val.toFixed(1)}%
        </span>
      ),
    },
    {
      title: '最大回撤',
      dataIndex: 'maxDrawdown',
      key: 'maxDrawdown',
      width: 100,
      sorter: (a: StrategyAnalytics, b: StrategyAnalytics) => a.maxDrawdown - b.maxDrawdown,
      render: (val: number) => (
        <span style={{ color: '#cf1322' }}>-{val.toFixed(2)}%</span>
      ),
    },
    {
      title: '夏普比率',
      dataIndex: 'sharpeRatio',
      key: 'sharpeRatio',
      width: 100,
      sorter: (a: StrategyAnalytics, b: StrategyAnalytics) => a.sharpeRatio - b.sharpeRatio,
      render: (val: number) => (
        <span style={{ color: val >= 1 ? '#3f8600' : val >= 0 ? '#faad14' : '#cf1322' }}>
          {val.toFixed(2)}
        </span>
      ),
    },
    {
      title: '平均收益率',
      dataIndex: 'avgReturn',
      key: 'avgReturn',
      width: 110,
      sorter: (a: StrategyAnalytics, b: StrategyAnalytics) => a.avgReturn - b.avgReturn,
      render: (val: number) => (
        <span style={{ color: val >= 0 ? '#3f8600' : '#cf1322' }}>
          {val >= 0 ? '+' : ''}{val.toFixed(2)}%
        </span>
      ),
    },
    {
      title: '平均持仓',
      dataIndex: 'avgHoldingTime',
      key: 'avgHoldingTime',
      width: 100,
      render: (val: number | null) => formatHoldingTime(val),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: StrategyAnalytics) => (
        <Button type="link" onClick={() => navigate(`/analysis/strategies/${record.strategyId}`)}>
          详情
        </Button>
      ),
    },
  ];

  const summaryCards = () => {
    if (data.length === 0) return null;
    const totalProfit = data.reduce((sum, s) => sum + s.totalProfit, 0);
    const avgWinRate = data.reduce((sum, s) => sum + s.winRate, 0) / data.length;
    const bestStrategy = data.reduce((best, s) => s.totalReturn > best.totalReturn ? s : best, data[0]);
    const totalTradeCount = data.reduce((sum, s) => sum + s.totalTrades, 0);

    return (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="策略总数" value={data.length} suffix="个" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="总收益"
              value={totalProfit}
              precision={2}
              prefix={totalProfit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              suffix="¥"
              valueStyle={{ color: totalProfit >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="平均胜率" value={avgWinRate} precision={1} suffix="%" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="最佳策略"
              value={bestStrategy.strategyName}
              valueStyle={{ fontSize: 16 }}
            />
            <span style={{ fontSize: 12, color: bestStrategy.totalReturn >= 0 ? '#3f8600' : '#cf1322' }}>
              收益率 {bestStrategy.totalReturn >= 0 ? '+' : ''}{bestStrategy.totalReturn.toFixed(2)}% · {totalTradeCount} 笔交易
            </span>
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <div>
      <Title level={2}>
        <PieChartOutlined style={{ marginRight: 8 }} />
        策略总览
      </Title>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            刷新
          </Button>
        </div>
        {summaryCards()}
        <Table
          columns={columns}
          dataSource={data}
          rowKey="strategyId"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <Empty description="暂无策略分析数据">
                <Button type="primary" onClick={() => navigate('/strategies')}>
                  前往创建策略
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default StrategyAnalyticsPage;
