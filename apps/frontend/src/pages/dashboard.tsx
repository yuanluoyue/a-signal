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
  Divider,
  Empty,
  Spin,
  message,
} from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  FileTextOutlined,
  BellOutlined,
  AlertOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import api from '@/services/api';
import type { SignalStats, RecentSignal } from '@/types/signal';
import type { SignalType } from '@/types/signal';

const { Title, Text } = Typography;

interface DashboardStats {
  news: {
    total: number;
    today: number;
  };
  signals: SignalStats;
}

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSignals, setRecentSignals] = useState<RecentSignal[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 并行获取统计数据和最近信号
      const [statsRes, signalsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-signals'),
      ]);

      // 确保正确解析响应数据
      const statsData = statsRes?.data || statsRes || {};
      console.log('[Dashboard] statsData:', statsData);
      setStats({
        news: {
          total: statsData.totalNews || 0,
          today: statsData.todayNews || 0,
        },
        signals: {
          total: statsData.totalSignals || 0,
          today: statsData.todaySignals || 0,
          pending: statsData.pendingAnalysis || 0,
        },
      });

      // 确保数据是数组
      const signalsData = Array.isArray(signalsRes) ? signalsRes : (signalsRes?.data?.data || signalsRes?.data || []);
      console.log('[Dashboard] recentSignals:', signalsData);
      // 转换后端数据格式到前端格式
      const formattedSignals = signalsData.map((item: Record<string, unknown>) => ({
        id: item.id,
        symbol: item.stockCode,
        name: item.stockName,
        type: item.direction === 'bullish' ? 'buy' : item.direction === 'bearish' ? 'sell' : 'buy',
        price: item.price,
        confidence: item.confidence,
        createdAt: item.createdAt,
      }));
      setRecentSignals(formattedSignals);
    } catch (error) {
      message.error('获取仪表盘数据失败');
      // 使用空数据
      setStats({
        news: { total: 0, today: 0 },
        signals: { total: 0, today: 0, pending: 0 },
      });
      setRecentSignals([]);
    } finally {
      setLoading(false);
    }
  };

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

  const formatTime = (time: string) => {
    try {
      const date = new Date(time);
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return time;
    }
  };

  return (
    <div>
      <Title level={2}>仪表盘</Title>
      <Text type="secondary">欢迎回来，以下是系统数据概览</Text>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="新闻总数"
                value={stats?.news.total || 0}
                valueStyle={{ color: '#1890ff' }}
                prefix={<FileTextOutlined />}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                今日新增 {stats?.news.today || 0} 条
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="信号总数"
                value={stats?.signals.total || 0}
                valueStyle={{ color: '#722ed1' }}
                prefix={<BarChartOutlined />}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                今日新增 {stats?.signals.today || 0} 条
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="待分析信号"
                value={stats?.signals.pending || 0}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<ClockCircleOutlined />}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                等待 AI 分析处理
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="活跃信号"
                value={(stats?.signals.total || 0) - (stats?.signals.pending || 0)}
                valueStyle={{ color: '#52c41a' }}
                prefix={<BellOutlined />}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                已分析完成的信号
              </Text>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={16}>
            <Card
              title={
                <Space>
                  <AlertOutlined />
                  <span>最近信号</span>
                </Space>
              }
              extra={<a href="/signals">查看全部</a>}
            >
              {recentSignals.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无信号数据"
                />
              ) : (
                <List
                  dataSource={recentSignals}
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
                            {item.name && (
                              <Text type="secondary">{item.name}</Text>
                            )}
                          </Space>
                        }
                        description={
                          <Space split={<Divider type="vertical" />}>
                            {item.price !== undefined && item.price !== null && (
                              <Text>${item.price.toFixed(2)}</Text>
                            )}
                            <Text type="secondary">
                              {formatTime(item.createdAt)}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <BarChartOutlined />
                  <span>数据概览</span>
                </Space>
              }
            >
              <List
                size="small"
                dataSource={[
                  {
                    label: '新闻采集率',
                    value: '98.5%',
                    trend: 'up',
                  },
                  {
                    label: '信号分析准确率',
                    value: '85.2%',
                    trend: 'up',
                  },
                  {
                    label: '系统运行时间',
                    value: '99.9%',
                    trend: 'stable',
                  },
                  {
                    label: '平均响应时间',
                    value: '120ms',
                    trend: 'down',
                  },
                ]}
                renderItem={(item) => (
                  <List.Item
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Text>{item.label}</Text>
                    <Space>
                      <Text strong>{item.value}</Text>
                      {item.trend === 'up' && (
                        <RiseOutlined style={{ color: '#52c41a' }} />
                      )}
                      {item.trend === 'down' && (
                        <FallOutlined style={{ color: '#f5222d' }} />
                      )}
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default DashboardPage;
