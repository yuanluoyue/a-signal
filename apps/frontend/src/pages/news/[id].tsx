import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Tag,
  Space,
  Typography,
  Descriptions,
  Divider,
  List,
  Spin,
  message,
  Row,
  Col,
  Badge,
  Empty,
  Table,
  Progress,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'umi';
import client from '@/services/client';
import { getEventTypeName } from '@/utils/event.utils';
import type { NewsItem, NewsSignal, AnalysisStatus, VectorizedStatus, EventItem } from '@/services/types';

const { Title, Text, Paragraph } = Typography;

const getAnalysisStatusColor = (status: AnalysisStatus): string => {
  const colorMap: Record<AnalysisStatus, string> = {
    pending: 'default',
    analyzing: 'processing',
    analyzed: 'success',
    failed: 'error',
  };
  return colorMap[status];
};

const getAnalysisStatusText = (status: AnalysisStatus): string => {
  const textMap: Record<AnalysisStatus, string> = {
    pending: '待分析',
    analyzing: '分析中',
    analyzed: '已分析',
    failed: '失败',
  };
  return textMap[status];
};

const getVectorizedStatusColor = (status: VectorizedStatus): string => {
  const colorMap: Record<VectorizedStatus, string> = {
    pending: 'default',
    vectorized: 'success',
    failed: 'error',
  };
  return colorMap[status];
};

const getVectorizedStatusText = (status: VectorizedStatus): string => {
  const textMap: Record<VectorizedStatus, string> = {
    pending: '待处理',
    vectorized: '已向量化',
    failed: '失败',
  };
  return textMap[status];
};

const getSentimentColor = (sentiment: string): string => {
  const colorMap: Record<string, string> = {
    positive: 'success',
    negative: 'error',
    neutral: 'default',
  };
  return colorMap[sentiment] || 'default';
};

const getSentimentText = (sentiment: string): string => {
  const textMap: Record<string, string> = {
    positive: '正面',
    negative: '负面',
    neutral: '中性',
  };
  return textMap[sentiment] || sentiment;
};

const getSignalTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    bullish: 'success',
    bearish: 'error',
    neutral: 'warning',
    buy: 'success',
    sell: 'error',
    hold: 'warning',
  };
  return colorMap[type] || 'default';
};

const getSignalTypeText = (type: string): string => {
  const textMap: Record<string, string> = {
    bullish: '买入',
    bearish: '卖出',
    neutral: '观望',
    buy: '买入',
    sell: '卖出',
    hold: '持有',
  };
  return textMap[type] || type;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const NewsDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [revectorizing, setRevectorizing] = useState(false);
  const [news, setNews] = useState<NewsItem | null>(null);
  const [signals, setSignals] = useState<NewsSignal[]>([]);
  const [relatedEvents, setRelatedEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchNewsDetail(id);
      fetchNewsSignals(id);
      fetchRelatedEvents();
    }
  }, [id]);

  const fetchNewsDetail = async (newsId: string) => {
    setLoading(true);
    try {
      const response = await client.get(`/news/${newsId}`);
      const newsData = response?.data || response;
      
      if (newsData) {
        const formattedNews: NewsItem = {
          id: newsData.id,
          title: newsData.title,
          content: newsData.content,
          source: newsData.source,
          url: newsData.originalUrl,
          analysisStatus: newsData.analyzeStatus,
          vectorizedStatus: newsData.vectorizeStatus,
          relatedStocks: newsData.relatedStocks || [],
          publishedAt: newsData.publishTime,
          createdAt: newsData.createdAt,
          updatedAt: newsData.updatedAt,
          embeddingModel: newsData.embeddingModel,
        };
        setNews(formattedNews);
      } else {
        message.error('新闻不存在');
        navigate('/news');
      }
    } catch (error) {
      message.error('获取新闻详情失败');
      console.error('Fetch news detail error:', error);
      navigate('/news');
    } finally {
      setLoading(false);
    }
  };

  const fetchNewsSignals = async (newsId: string) => {
    try {
      const response = await client.get(`/news/${newsId}/signals`);
      const signalsData = response?.data || response || [];
      
      // 转换后端信号数据格式
      const formattedSignals: NewsSignal[] = (Array.isArray(signalsData) ? signalsData : []).map((item: Record<string, unknown>) => ({
        id: item.id,
        symbol: item.stockCode,
        name: item.stockName,
        type: item.direction,
        confidence: item.confidence,
        createdAt: item.createdAt,
      }));
      
      setSignals(formattedSignals);
    } catch (error) {
      console.error('Fetch news signals error:', error);
    }
  };

  const fetchRelatedEvents = async () => {
    if (!id) return;
    setEventsLoading(true);
    try {
      const response = await client.get(`/news/${id}/events`);
      const data = (response as any)?.data || [];
      setRelatedEvents(data);
    } catch (error) {
      console.error('获取关联事件失败:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!id || !news) return;

    setAnalyzing(true);
    try {
      await client.post(`/news/${id}/analyze`);
      message.success('分析任务已提交，请稍后刷新查看结果');
      setTimeout(() => {
        fetchNewsDetail(id);
        fetchNewsSignals(id);
      }, 3000);
    } catch (error) {
      message.error('提交分析任务失败');
      console.error('Analyze error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRevectorize = async () => {
    if (!id || !news) return;

    setRevectorizing(true);
    try {
      await client.post(`/news/${id}/re-vectorize`);
      message.success('重新向量化任务已提交，请稍后刷新查看结果');
      setTimeout(() => {
        fetchNewsDetail(id);
      }, 3000);
    } catch (error) {
      message.error('提交重新向量化任务失败');
      console.error('Revectorize error:', error);
    } finally {
      setRevectorizing(false);
    }
  };

  const handleViewOriginal = () => {
    if (news?.url) {
      window.open(news.url, '_blank');
    }
  };

  const handleViewSignal = (signalId: string) => {
    navigate(`/signals/${signalId}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>加载中...</p>
      </div>
    );
  }

  if (!news) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Empty description="新闻不存在" />
        <Button type="primary" onClick={() => navigate('/news')} style={{ marginTop: 16 }}>
          返回列表
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/news')}>
          返回列表
        </Button>
      </div>

      <Row gutter={16}>
        <Col span={16}>
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Space size="middle">
                <Tag color={getAnalysisStatusColor(news.analysisStatus)}>
                  {getAnalysisStatusText(news.analysisStatus)}
                </Tag>
                <Tag color={getVectorizedStatusColor(news.vectorizedStatus)}>
                  {getVectorizedStatusText(news.vectorizedStatus)}
                </Tag>
              </Space>
            </div>

            <Title level={3}>{news.title}</Title>

            <Space style={{ marginBottom: 16 }}>
              <Text type="secondary">
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {formatDate(news.publishedAt)}
              </Text>
              <Text type="secondary">来源: {news.source}</Text>
            </Space>

            <Divider />

            <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>{news.content}</Paragraph>

            <Divider />

            <Space>
              <Button type="primary" icon={<LinkOutlined />} onClick={handleViewOriginal}>
                查看原始链接
              </Button>
              {news.analysisStatus !== 'analyzing' && (
                <Button
                  icon={analyzing ? <LoadingOutlined /> : <PlayCircleOutlined />}
                  onClick={handleAnalyze}
                  loading={analyzing}
                >
                  {analyzing ? '分析中...' : '手动分析'}
                </Button>
              )}
              {news.vectorizedStatus === 'vectorized' && (
                <Button
                  icon={revectorizing ? <LoadingOutlined /> : <ReloadOutlined />}
                  onClick={handleRevectorize}
                  loading={revectorizing}
                >
                  {revectorizing ? '向量化中...' : '重新向量化'}
                </Button>
              )}
            </Space>
          </Card>

          {signals.length > 0 && (
            <Card title="关联交易信号" style={{ marginTop: 16 }}>
              <List
                dataSource={signals}
                renderItem={(signal) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        onClick={() => handleViewSignal(signal.id)}
                      >
                        查看详情
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>{signal.symbol}</Text>
                          <Tag color={getSignalTypeColor(signal.type)}>
                            {getSignalTypeText(signal.type)}
                          </Tag>
                          <Badge count={`${signal.confidence}%`} style={{ backgroundColor: '#1890ff' }} />
                        </Space>
                      }
                      description={`生成时间: ${formatDate(signal.createdAt)}`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}

          <Card title="关联事件" style={{ marginTop: 16 }}>
            <Table
              dataSource={relatedEvents}
              rowKey="id"
              loading={eventsLoading}
              pagination={false}
              locale={{ emptyText: '暂无关联事件' }}
              onRow={(record) => ({
                onClick: () => navigate(`/events/${record.id}`),
                style: { cursor: 'pointer' },
              })}
              columns={[
                {
                  title: '分类',
                  dataIndex: 'category',
                  key: 'category',
                  width: 100,
                  render: (category: string) => {
                    const categoryColorMap: Record<string, string> = {
                      macro: 'blue',
                      policy: 'purple',
                      company: 'green',
                      market: 'orange',
                      sentiment: 'cyan',
                    };
                    const categoryTextMap: Record<string, string> = {
                      macro: '宏观',
                      policy: '政策',
                      company: '公司',
                      market: '市场',
                      sentiment: '情绪',
                    };
                    return (
                      <Tag color={categoryColorMap[category] || 'default'}>
                        {categoryTextMap[category] || category}
                      </Tag>
                    );
                  },
                },
                {
                  title: '子分类',
                  dataIndex: 'subcategory',
                  key: 'subcategory',
                  width: 120,
                  render: (subcategory: string) => getEventTypeName(subcategory),
                },
                {
                  title: '情绪方向',
                  dataIndex: 'sentimentDirection',
                  key: 'sentimentDirection',
                  width: 100,
                  render: (val: number) => {
                    if (val === 1) return <Tag color="green">利好</Tag>;
                    if (val === -1) return <Tag color="red">利空</Tag>;
                    return <Tag>中性</Tag>;
                  },
                },
                {
                  title: '重要性',
                  dataIndex: 'importanceScore',
                  key: 'importanceScore',
                  width: 120,
                  render: (score: number) => {
                    const percent = Math.round(score * 100);
                    let status: 'success' | 'normal' | 'exception' = 'normal';
                    if (percent >= 80) status = 'success';
                    else if (percent >= 50) status = 'normal';
                    else status = 'exception';
                    return (
                      <Tooltip title={`${percent}%`}>
                        <Progress
                          percent={percent}
                          size="small"
                          status={status}
                          style={{ width: 80 }}
                          showInfo={false}
                        />
                      </Tooltip>
                    );
                  },
                },
                {
                  title: '发生时间',
                  dataIndex: 'occurredAt',
                  key: 'occurredAt',
                  width: 180,
                  render: (time: string) => formatDate(time),
                },
                {
                  title: '处理状态',
                  dataIndex: 'processed',
                  key: 'processed',
                  width: 100,
                  render: (processed: boolean) =>
                    processed ? (
                      <Tag color="green">已处理</Tag>
                    ) : (
                      <Tag color="orange">未处理</Tag>
                    ),
                },
              ]}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card title="新闻信息">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="ID">{news.id}</Descriptions.Item>
              <Descriptions.Item label="来源">{news.source}</Descriptions.Item>
              <Descriptions.Item label="发布时间">{formatDate(news.publishedAt)}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatDate(news.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{formatDate(news.updatedAt)}</Descriptions.Item>
              <Descriptions.Item label="分析状态">
                <Tag color={getAnalysisStatusColor(news.analysisStatus)}>
                  {getAnalysisStatusText(news.analysisStatus)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="向量化状态">
                <Tag color={getVectorizedStatusColor(news.vectorizedStatus)}>
                  {getVectorizedStatusText(news.vectorizedStatus)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="向量化模型">
                {news.embeddingModel || '未记录'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {news.relatedStocks.length > 0 && (
            <Card title="相关股票" style={{ marginTop: 16 }}>
              <Space wrap>
                {news.relatedStocks.map((stock) => (
                  <Tag key={stock} icon={<BellOutlined />}>
                    {stock}
                  </Tag>
                ))}
              </Space>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default NewsDetailPage;
