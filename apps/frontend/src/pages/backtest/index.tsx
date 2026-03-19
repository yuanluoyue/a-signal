import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  DatePicker,
  Slider,
  Checkbox,
  InputNumber,
  Button,
  Statistic,
  Table,
  Typography,
  Space,
  Tag,
  Empty,
  Spin,
  message,
  Divider,
} from 'antd';
import {
  PlayCircleOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  PercentageOutlined,
  BarChartOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { BacktestFilter, BacktestResult, BacktestTrade } from '@/types/backtest';
import type { SignalType } from '@/types/signal';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const BacktestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [resultLoading, setResultLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);

  const [filter, setFilter] = useState<BacktestFilter>({
    dateRange: [dayjs().subtract(30, 'days').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')],
    confidenceRange: [60, 100],
    signalTypes: ['buy', 'sell'],
    takeProfitPercent: 10,
    stopLossPercent: 5,
  });

  const [result, setResult] = useState<BacktestResult | null>(null);

  const signalTypeOptions = [
    { label: '买入', value: 'buy' },
    { label: '卖出', value: 'sell' },
  ];

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setFilter({
        ...filter,
        dateRange: [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')],
      });
    }
  };

  const handleConfidenceChange = (value: number[]) => {
    setFilter({
      ...filter,
      confidenceRange: [value[0], value[1]],
    });
  };

  const handleSignalTypeChange = (checkedValues: SignalType[]) => {
    setFilter({
      ...filter,
      signalTypes: checkedValues,
    });
  };

  const handleRunBacktest = async () => {
    if (filter.signalTypes.length === 0) {
      message.warning('请至少选择一种信号类型');
      return;
    }

    setLoading(true);
    setResultLoading(true);

    try {
      // TODO: 替换为实际的 API 调用
      // const response = await backtestApi.runBacktest({
      //   startDate: filter.dateRange[0],
      //   endDate: filter.dateRange[1],
      //   minConfidence: filter.confidenceRange[0],
      //   maxConfidence: filter.confidenceRange[1],
      //   signalTypes: filter.signalTypes,
      //   takeProfitPercent: filter.takeProfitPercent,
      //   stopLossPercent: filter.stopLossPercent,
      // });

      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 模拟数据
      const mockResult: BacktestResult = {
        totalTrades: 45,
        winCount: 28,
        lossCount: 17,
        winRate: 62.22,
        totalReturn: 12580.5,
        totalReturnPercent: 12.58,
        maxDrawdown: -3200.0,
        maxDrawdownPercent: -3.2,
        avgWin: 580.25,
        avgLoss: -320.18,
        profitFactor: 2.15,
        trades: [
          {
            id: '1',
            symbol: 'AAPL',
            type: 'buy',
            entryPrice: 178.35,
            exitPrice: 196.19,
            entryTime: '2024-01-15 09:30:00',
            exitTime: '2024-01-20 14:30:00',
            quantity: 100,
            pnl: 1784.0,
            pnlPercent: 10.0,
            exitReason: 'take_profit',
          },
          {
            id: '2',
            symbol: 'TSLA',
            type: 'sell',
            entryPrice: 215.3,
            exitPrice: 204.54,
            entryTime: '2024-01-16 10:00:00',
            exitTime: '2024-01-18 11:20:00',
            quantity: 50,
            pnl: 538.0,
            pnlPercent: 5.0,
            exitReason: 'take_profit',
          },
          {
            id: '3',
            symbol: 'NVDA',
            type: 'buy',
            entryPrice: 550.8,
            exitPrice: 523.26,
            entryTime: '2024-01-17 09:45:00',
            exitTime: '2024-01-19 15:00:00',
            quantity: 20,
            pnl: -550.8,
            pnlPercent: -5.0,
            exitReason: 'stop_loss',
          },
        ],
      };

      setResult(mockResult);
      setHasResult(true);
      message.success('回测完成');
    } catch (error) {
      message.error('回测执行失败');
    } finally {
      setLoading(false);
      setResultLoading(false);
    }
  };

  const handleReset = () => {
    setFilter({
      dateRange: [dayjs().subtract(30, 'days').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')],
      confidenceRange: [60, 100],
      signalTypes: ['buy', 'sell'],
      takeProfitPercent: 10,
      stopLossPercent: 5,
    });
    setResult(null);
    setHasResult(false);
  };

  const tradeColumns = [
    {
      title: '股票代码',
      dataIndex: 'symbol',
      key: 'symbol',
      render: (symbol: string) => <Text strong>{symbol}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: SignalType) => (
        <Tag color={type === 'buy' ? 'success' : 'error'}>
          {type === 'buy' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    {
      title: '入场价',
      dataIndex: 'entryPrice',
      key: 'entryPrice',
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: '出场价',
      dataIndex: 'exitPrice',
      key: 'exitPrice',
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '盈亏',
      dataIndex: 'pnl',
      key: 'pnl',
      render: (pnl: number) => (
        <Text style={{ color: pnl >= 0 ? '#3f8600' : '#cf1322' }}>
          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
        </Text>
      ),
    },
    {
      title: '盈亏%',
      dataIndex: 'pnlPercent',
      key: 'pnlPercent',
      render: (percent: number) => (
        <Text style={{ color: percent >= 0 ? '#3f8600' : '#cf1322' }}>
          {percent >= 0 ? '+' : ''}{percent.toFixed(2)}%
        </Text>
      ),
    },
    {
      title: '出场原因',
      dataIndex: 'exitReason',
      key: 'exitReason',
      render: (reason: string) => {
        const reasonMap: Record<string, { text: string; color: string }> = {
          take_profit: { text: '止盈', color: 'success' },
          stop_loss: { text: '止损', color: 'error' },
          signal: { text: '信号', color: 'processing' },
        };
        const { text, color } = reasonMap[reason] || { text: reason, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '入场时间',
      dataIndex: 'entryTime',
      key: 'entryTime',
    },
  ];

  return (
    <div>
      <Title level={2}>回测分析</Title>
      <Text type="secondary">基于历史信号数据验证交易策略的有效性</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={8}>
          <Card title="筛选条件" loading={loading}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Text strong>时间范围</Text>
                <div style={{ marginTop: 8 }}>
                  <RangePicker
                    style={{ width: '100%' }}
                    value={[
                      dayjs(filter.dateRange[0]),
                      dayjs(filter.dateRange[1]),
                    ]}
                    onChange={handleDateRangeChange}
                  />
                </div>
              </div>

              <div>
                <Text strong>置信度范围</Text>
                <div style={{ marginTop: 8, padding: '0 8px' }}>
                  <Slider
                    range
                    min={0}
                    max={100}
                    value={[filter.confidenceRange[0], filter.confidenceRange[1]]}
                    onChange={handleConfidenceChange}
                    marks={{
                      0: '0%',
                      50: '50%',
                      100: '100%',
                    }}
                  />
                  <div style={{ textAlign: 'center', marginTop: 4 }}>
                    <Text type="secondary">
                      {filter.confidenceRange[0]}% - {filter.confidenceRange[1]}%
                    </Text>
                  </div>
                </div>
              </div>

              <div>
                <Text strong>信号类型</Text>
                <div style={{ marginTop: 8 }}>
                  <Checkbox.Group
                    options={signalTypeOptions}
                    value={filter.signalTypes}
                    onChange={handleSignalTypeChange}
                  />
                </div>
              </div>

              <div>
                <Text strong>止盈比例 (%)</Text>
                <div style={{ marginTop: 8 }}>
                  <Space.Compact style={{ width: '100%' }}>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                      max={100}
                      value={filter.takeProfitPercent}
                      onChange={(value) =>
                        setFilter({ ...filter, takeProfitPercent: value || 10 })
                      }
                    />
                    <Button disabled>%</Button>
                  </Space.Compact>
                </div>
              </div>

              <div>
                <Text strong>止损比例 (%)</Text>
                <div style={{ marginTop: 8 }}>
                  <Space.Compact style={{ width: '100%' }}>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                      max={100}
                      value={filter.stopLossPercent}
                      onChange={(value) =>
                        setFilter({ ...filter, stopLossPercent: value || 5 })
                      }
                    />
                    <Button disabled>%</Button>
                  </Space.Compact>
                </div>
              </div>

              <Divider />

              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  disabled={loading}
                >
                  重置
                </Button>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleRunBacktest}
                  loading={loading}
                >
                  一键回测
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          {!hasResult ? (
            <Card style={{ height: '100%', minHeight: 500 }}>
              <Empty
                image={<BarChartOutlined style={{ fontSize: 80, color: '#d9d9d9' }} />}
                description="暂无回测结果，请先设置筛选条件并点击一键回测"
              />
            </Card>
          ) : (
            <Spin spinning={resultLoading}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} lg={6}>
                    <Card>
                      <Statistic
                        title="总交易次数"
                        value={result?.totalTrades || 0}
                        valueStyle={{ color: '#1890ff' }}
                        prefix={<LineChartOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card>
                      <Statistic
                        title="胜率"
                        value={result?.winRate || 0}
                        precision={2}
                        valueStyle={{ color: '#3f8600' }}
                        suffix="%"
                        prefix={<RiseOutlined />}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {result?.winCount || 0} 胜 / {result?.lossCount || 0} 负
                      </Text>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card>
                      <Statistic
                        title="总收益率"
                        value={result?.totalReturnPercent || 0}
                        precision={2}
                        valueStyle={{
                          color: (result?.totalReturnPercent || 0) >= 0 ? '#3f8600' : '#cf1322',
                        }}
                        suffix="%"
                        prefix={(result?.totalReturnPercent || 0) >= 0 ? <RiseOutlined /> : <FallOutlined />}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ${result?.totalReturn?.toFixed(2) || '0.00'}
                      </Text>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card>
                      <Statistic
                        title="最大回撤"
                        value={result?.maxDrawdownPercent || 0}
                        precision={2}
                        valueStyle={{ color: '#cf1322' }}
                        suffix="%"
                        prefix={<PercentageOutlined />}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ${result?.maxDrawdown?.toFixed(2) || '0.00'}
                      </Text>
                    </Card>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} lg={8}>
                    <Card>
                      <Statistic
                        title="平均盈利"
                        value={result?.avgWin || 0}
                        precision={2}
                        valueStyle={{ color: '#3f8600' }}
                        prefix="$"
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Card>
                      <Statistic
                        title="平均亏损"
                        value={result?.avgLoss || 0}
                        precision={2}
                        valueStyle={{ color: '#cf1322' }}
                        prefix="$"
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Card>
                      <Statistic
                        title="盈亏比"
                        value={result?.profitFactor || 0}
                        precision={2}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                </Row>

                <Card title="交易详情">
                  <Table
                    dataSource={result?.trades || []}
                    columns={tradeColumns}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条记录`,
                    }}
                    scroll={{ x: 800 }}
                  />
                </Card>
              </Space>
            </Spin>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default BacktestPage;
