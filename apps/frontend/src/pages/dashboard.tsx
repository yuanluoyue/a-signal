import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  List, 
  Tag, 
  Typography, 
  Badge,
  Space,
  Divider
} from 'antd';
import { 
  RiseOutlined, 
  FallOutlined, 
  DollarOutlined, 
  BellOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface Signal {
  id: string;
  symbol: string;
  name: string;
  type: 'buy' | 'sell';
  price: number;
  change: number;
  changePercent: number;
  time: string;
  confidence: number;
}

const mockSignals: Signal[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', type: 'buy', price: 178.35, change: 2.45, changePercent: 1.39, time: '2024-01-15 09:30', confidence: 85 },
  { id: '2', symbol: 'MSFT', name: 'Microsoft Corp.', type: 'buy', price: 420.55, change: 5.20, changePercent: 1.25, time: '2024-01-15 09:25', confidence: 78 },
  { id: '3', symbol: 'TSLA', name: 'Tesla Inc.', type: 'sell', price: 215.30, change: -8.45, changePercent: -3.78, time: '2024-01-15 09:20', confidence: 72 },
  { id: '4', symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'buy', price: 550.80, change: 12.30, changePercent: 2.28, time: '2024-01-15 09:15', confidence: 92 },
  { id: '5', symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'buy', price: 155.40, change: 3.15, changePercent: 2.07, time: '2024-01-15 09:10', confidence: 68 },
];

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'default';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 80) return '高';
    if (confidence >= 60) return '中';
    return '低';
  };

  return (
    <div>
      <Title level={2}>仪表盘</Title>
      <Text type="secondary">欢迎回来，以下是今日市场概览</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="总资产"
              value={125680.50}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#3f8600' }}
              suffix={<RiseOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              +2.5% 较昨日
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="今日收益"
              value={3245.80}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#3f8600' }}
              suffix={<ArrowUpOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              +2.65% 今日涨幅
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="活跃信号"
              value={12}
              valueStyle={{ color: '#1890ff' }}
              suffix={<BellOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              5个买入信号，7个卖出信号
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="持仓数量"
              value={8}
              valueStyle={{ color: '#722ed1' }}
              suffix={<DollarOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              3个盈利，2个亏损
            </Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card 
            title="最新信号" 
            loading={loading}
            extra={<a href="#">查看全部</a>}
          >
            <List
              dataSource={mockSignals}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  actions={[
                    <Tag color={item.type === 'buy' ? 'success' : 'error'}>
                      {item.type === 'buy' ? '买入' : '卖出'}
                    </Tag>,
                    <Badge 
                      status={getConfidenceColor(item.confidence) as any} 
                      text={`${getConfidenceText(item.confidence)}置信度`}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong>{item.symbol}</Text>
                        <Text type="secondary">{item.name}</Text>
                      </Space>
                    }
                    description={
                      <Space split={<Divider type="vertical" />}>
                        <Text>${item.price.toFixed(2)}</Text>
                        <Text style={{ color: item.change >= 0 ? '#3f8600' : '#cf1322' }}>
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%)
                        </Text>
                        <Text type="secondary">{item.time}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card 
            title="市场概览" 
            loading={loading}
          >
            <List
              size="small"
              dataSource={[
                { name: '上证指数', value: 3050.23, change: 0.85 },
                { name: '深证成指', value: 9876.54, change: 1.12 },
                { name: '创业板指', value: 1987.65, change: -0.35 },
                { name: '纳斯达克', value: 14567.89, change: 1.56 },
                { name: '标普500', value: 4567.12, change: 0.92 },
              ]}
              renderItem={(item) => (
                <List.Item
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <Text>{item.name}</Text>
                  <Space>
                    <Text strong>{item.value.toFixed(2)}</Text>
                    <Text style={{ color: item.change >= 0 ? '#3f8600' : '#cf1322' }}>
                      {item.change >= 0 ? <RiseOutlined /> : <FallOutlined />}
                      {Math.abs(item.change).toFixed(2)}%
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
