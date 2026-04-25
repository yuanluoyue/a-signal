import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  FileTextOutlined,
  BellOutlined,
  AlertOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { Link } from 'umi';
import client from '@/services/client';
import type { SignalStats, RecentSignal } from '@/services/types';

const { Title, Text } = Typography;

interface DashboardStats {
  news: {
    total: number;
    today: number;
  };
  signals: SignalStats;
}

const formatTime = (time: string): string => {
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

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSignals, setRecentSignals] = useState<RecentSignal[]>([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, signalsRes] = await Promise.all([
        client.get('/dashboard/stats'),
        client.get('/dashboard/recent-signals'),
      ]);

      const statsData = statsRes?.data || statsRes || {};
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

      const signalsData = Array.isArray(signalsRes) ? signalsRes : (signalsRes?.data?.data || signalsRes?.data || []);
      const formattedSignals = signalsData.map((item: Record<string, unknown>) => {
        const action = item.action || item.direction;
        let actionText = '观望';
        if (action === 'long' || action === 'bullish') {
          actionText = '做多';
        } else if (action === 'short' || action === 'bearish') {
          actionText = '做空';
        }

        return {
          id: item.id as string,
          symbol: (item.symbol || item.stockCode) as string,
          stockCode: item.stockCode as string,
          stockName: (item.stockName || item.name) as string,
          action: actionText,
          direction: item.direction as string,
          score: item.score as number,
          confidence: item.confidence as number,
          generatedAt: (item.generatedAt || item.signalTime || item.createdAt) as string,
          signalTime: item.signalTime as string,
          createdAt: item.createdAt as string,
        };
      });
      setRecentSignals(formattedSignals);
    } catch (error) {
      message.error('获取仪表盘数据失败');
      setStats({
        news: { total: 0, today: 0 },
        signals: { total: 0, today: 0, pending: 0 },
      });
      setRecentSignals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const renderSignalItem = useCallback((item: RecentSignal) => {
    const displaySymbol = item.symbol || item.stockCode || '-';
    const displayStockName = item.stockName || item.name || '';
    const displayAction = item.action || '观望';
    const displayScore = item.score !== undefined && item.score !== null
      ? item.score.toFixed(2)
      : item.confidence !== undefined && item.confidence !== null
        ? item.confidence.toFixed(2)
        : '-';
    const displayTime = item.generatedAt || item.signalTime || item.createdAt;

    const actionColor = displayAction === '做多' ? 'success' : displayAction === '做空' ? 'error' : 'default';

    return (
      <List.Item
        key={item.id}
        actions={[
          <Tag key="action" color={actionColor}>
            {displayAction}
          </Tag>,
        ]}
      >
        <List.Item.Meta
          title={
            <Space>
              <Text strong>{displaySymbol}</Text>
              {displayStockName && (
                <Text type="secondary">{displayStockName}</Text>
              )}
            </Space>
          }
          description={
            <Space split={<Divider type="vertical" />}>
              <Text>分数: {displayScore}</Text>
              <Text type="secondary">
                {formatTime(displayTime)}
              </Text>
            </Space>
          }
        />
      </List.Item>
    );
  }, []);

  const statsCards = useMemo(() => {
    if (!stats) return null;
    
    return (
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="新闻总数"
              value={stats.news.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<FileTextOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              今日新增 {stats.news.today} 条
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="信号总数"
              value={stats.signals.total}
              valueStyle={{ color: '#722ed1' }}
              prefix={<BarChartOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              今日新增 {stats.signals.today} 条
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="待分析信号"
              value={stats.signals.pending}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<BellOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              等待 AI 分析处理
            </Text>
          </Card>
        </Col>
      </Row>
    );
  }, [stats]);

  const recentSignalsCard = useMemo(() => (
    <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
      <Col xs={24} lg={24}>
        <Card
          title={
            <Space>
              <AlertOutlined />
              <span>最近信号</span>
            </Space>
          }
          extra={<Link to="/signals">查看全部</Link>}
        >
          {recentSignals.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无信号数据"
            />
          ) : (
            <List
              dataSource={recentSignals}
              renderItem={renderSignalItem}
            />
          )}
        </Card>
      </Col>
    </Row>
  ), [recentSignals, renderSignalItem]);

  return (
    <div>
      <Title level={2}>仪表盘</Title>
      <Text type="secondary">欢迎回来，以下是系统数据概览</Text>

      <Spin spinning={loading}>
        {statsCards}
        {recentSignalsCard}
      </Spin>
    </div>
  );
};

export default DashboardPage;
