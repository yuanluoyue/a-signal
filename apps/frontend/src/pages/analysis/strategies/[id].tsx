import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Typography, Tag, Statistic, Row, Col, Table, Descriptions, Empty, Button, Spin, Space } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'umi';
import * as LightweightCharts from 'lightweight-charts';
import type { IChartApi, Time } from 'lightweight-charts';
import { getStrategyDetailAnalytics, type StrategyDetailAnalytics } from '@/services/strategy-analytics';

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

const StrategyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StrategyDetailAnalytics | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await getStrategyDetailAnalytics(id);
      setData(result);
    } catch (error) {
      console.error('Failed to fetch strategy detail analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.equityCurve.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = LightweightCharts.createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#d9d9d9' },
      timeScale: {
        borderColor: '#d9d9d9',
        timeVisible: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
    });

    chartRef.current = chart;

    const lineSeries = chart.addSeries(LightweightCharts.LineSeries, {
      color: '#1890ff',
      lineWidth: 2,
    });

    const chartData = data.equityCurve
      .map((point) => ({
        time: Math.floor(new Date(point.time).getTime() / 1000) as Time,
        value: point.cumulativeProfit,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    const seen = new Map<number, number>();
    for (const point of chartData) {
      seen.set(point.time as number, point.value);
    }

    lineSeries.setData(
      Array.from(seen.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([time, value]) => ({ time: time as Time, value })),
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/analysis/strategies')} style={{ marginBottom: 16 }}>
          返回策略总览
        </Button>
        <Empty description="策略分析数据不存在" />
      </div>
    );
  }

  const { strategy, runtime, metrics, recentTrades, recentPositions } = data;

  const tradeColumns = [
    { title: '股票代码', dataIndex: 'stockCode', key: 'stockCode', width: 100 },
    { title: '股票名称', dataIndex: 'stockName', key: 'stockName', width: 100 },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 70,
      render: (type: string) => (
        <Tag color={type === 'buy' ? 'green' : 'red'}>{type === 'buy' ? '买入' : '卖出'}</Tag>
      ),
    },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 70 },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 90,
      render: (v: string) => `¥${Number(v).toFixed(2)}`,
    },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      width: 100,
      render: (v: string | null) => {
        if (v === null) return '-';
        const val = Number(v);
        return (
          <span style={{ color: val >= 0 ? '#3f8600' : '#cf1322' }}>
            {val >= 0 ? '+' : ''}{val.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '时间',
      dataIndex: 'tradeTime',
      key: 'tradeTime',
      width: 160,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
  ];

  const positionColumns = [
    { title: '股票代码', dataIndex: 'stockCode', key: 'stockCode', width: 100 },
    { title: '股票名称', dataIndex: 'stockName', key: 'stockName', width: 100 },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 70 },
    {
      title: '成本',
      dataIndex: 'avgCost',
      key: 'avgCost',
      width: 90,
      render: (v: string) => `¥${Number(v).toFixed(2)}`,
    },
    {
      title: '市值',
      dataIndex: 'marketValue',
      key: 'marketValue',
      width: 100,
      render: (v: string | null) => v ? `¥${Number(v).toFixed(2)}` : '-',
    },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      width: 100,
      render: (v: string) => {
        const val = Number(v);
        return (
          <span style={{ color: val >= 0 ? '#3f8600' : '#cf1322' }}>
            {val >= 0 ? '+' : ''}{val.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '收益率',
      dataIndex: 'return',
      key: 'return',
      width: 90,
      render: (v: string) => {
        const val = Number(v);
        return (
          <span style={{ color: val >= 0 ? '#3f8600' : '#cf1322' }}>
            {val >= 0 ? '+' : ''}{val.toFixed(2)}%
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/analysis/strategies')}>
          返回策略总览
        </Button>
      </Space>

      <Title level={2} style={{ marginTop: 0 }}>
        {strategy.name}
        <Tag color={strategy.enabled ? 'success' : 'default'} style={{ marginLeft: 12 }}>
          {strategy.enabled ? '启用' : '禁用'}
        </Tag>
        <Tag color={DIRECTION_MAP[strategy.directionMode]?.color || 'default'}>
          {DIRECTION_MAP[strategy.directionMode]?.label || strategy.directionMode}
        </Tag>
      </Title>

      <Card title="策略参数" style={{ marginBottom: 16 }} size="small">
        <Descriptions column={4} size="small">
          <Descriptions.Item label="最低分数">{Number(strategy.minScore).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="最高分数">{strategy.maxScore ? Number(strategy.maxScore).toFixed(2) : '-'}</Descriptions.Item>
          <Descriptions.Item label="持仓周期">{strategy.holdPeriod} 根K线</Descriptions.Item>
          <Descriptions.Item label="止损">{strategy.stopLossPct ? `${Number(strategy.stopLossPct).toFixed(2)}%` : '-'}</Descriptions.Item>
          <Descriptions.Item label="止盈">{strategy.takeProfitPct ? `${Number(strategy.takeProfitPct).toFixed(2)}%` : '-'}</Descriptions.Item>
          <Descriptions.Item label="每日最大信号">{strategy.maxSignalsPerDay || '-'}</Descriptions.Item>
          <Descriptions.Item label="最大持仓">{strategy.maxPositions || '-'}</Descriptions.Item>
          <Descriptions.Item label="描述">{strategy.description || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {runtime && (
        <Card title="Runtime 配置" style={{ marginBottom: 16 }} size="small">
          <Descriptions column={4} size="small">
            <Descriptions.Item label="关联账户">
              {runtime.accountName || runtime.accountId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Webhook">
              {runtime.webhookName || runtime.webhookId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Webhook通知">
              {runtime.enableWebhook ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#d9d9d9' }} />}
            </Descriptions.Item>
            <Descriptions.Item label="模拟交易">
              {runtime.enableSimulation ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#d9d9d9' }} />}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="总收益"
              value={metrics.totalProfit}
              precision={2}
              prefix={metrics.totalProfit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              suffix="¥"
              valueStyle={{ color: metrics.totalProfit >= 0 ? '#3f8600' : '#cf1322', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="总收益率"
              value={metrics.totalReturn}
              precision={2}
              suffix="%"
              valueStyle={{ color: metrics.totalReturn >= 0 ? '#3f8600' : '#cf1322', fontSize: 18 }}
              prefix={metrics.totalReturn >= 0 ? '+' : ''}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="胜率"
              value={metrics.winRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: metrics.winRate >= 50 ? '#3f8600' : '#cf1322', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="最大回撤"
              value={metrics.maxDrawdown}
              precision={2}
              suffix="%"
              prefix="-"
              valueStyle={{ color: '#cf1322', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="夏普比率"
              value={metrics.sharpeRatio}
              precision={2}
              valueStyle={{ color: metrics.sharpeRatio >= 1 ? '#3f8600' : metrics.sharpeRatio >= 0 ? '#faad14' : '#cf1322', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="平均持仓"
              value={formatHoldingTime(metrics.avgHoldingTime)}
              valueStyle={{ fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="资金曲线" style={{ marginBottom: 16 }}>
        {data.equityCurve.length > 0 ? (
          <div ref={chartContainerRef} />
        ) : (
          <Empty description="暂无资金曲线数据" />
        )}
      </Card>

      <Card title={`最近交易 (${recentTrades.length})`} style={{ marginBottom: 16 }}>
        <Table
          columns={tradeColumns}
          dataSource={recentTrades}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 700 }}
          locale={{ emptyText: <Empty description="暂无交易记录" /> }}
        />
      </Card>

      <Card title={`当前持仓 (${recentPositions.length})`}>
        <Table
          columns={positionColumns}
          dataSource={recentPositions}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 700 }}
          locale={{ emptyText: <Empty description="暂无持仓" /> }}
        />
      </Card>
    </div>
  );
};

export default StrategyDetailPage;
