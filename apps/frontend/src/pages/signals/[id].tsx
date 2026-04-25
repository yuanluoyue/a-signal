import { useEffect, useRef, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Typography,
  Row,
  Col,
  List,
  Skeleton,
  message,
  Select,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  CalendarOutlined,
  FileTextOutlined,
  LinkOutlined,
  PercentageOutlined,
  BarChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, Link } from 'umi';
import * as LightweightCharts from 'lightweight-charts';
import type { CandlestickData, Time, IChartApi, ISeriesApi, SeriesMarker, ISeriesMarkersPluginApi } from 'lightweight-charts';
import client from '@/services/client';
import type { Signal, KlineData, NewsItem } from '@/services/types';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface Signal {
  id: string;
  newsId?: string;
  stockCode?: string;
  stockName?: string;
  direction?: 'bullish' | 'bearish' | 'neutral';
  confidence?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  reasoning?: string;
  keyFactors?: string[];
  timeWindow?: string;
  signalTime?: string;
  
  eventId?: string;
  symbol?: string;
  action?: 'long' | 'short' | 'hold';
  score?: string;
  generatedAt?: string;
  validFrom?: string;
  validTo?: string;
  reason?: string;
  ruleId?: string;
  ruleSnapshot?: {
    multiplier: string;
    threshold: string;
    enableSurprise: boolean;
    enableConfidence: boolean;
  };
  weight?: string;
  
  createdAt: string;
}

interface KlineData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishTime: string;
}

interface EventItem {
  id: string;
  category: string;
  subcategory: string;
  categoryName: string;
  subcategoryName: string;
  sentimentDirection: number;
  sentimentConfidence: number;
  sentimentRationale: string;
  importanceScore: string;
  detectedAt: string;
  occurredAt: string;
}

const SignalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  const [loading, setLoading] = useState(true);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [klines, setKlines] = useState<KlineData[]>([]);
  const [news, setNews] = useState<NewsItem | null>(null);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [period, setPeriod] = useState<'1d' | '4h'>('4h');
  const [fetchingKlines, setFetchingKlines] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  // 获取信号详情
  const fetchSignalDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await client.get<{ data: Signal }>(`/signals/${id}`);
      setSignal(response.data);
    } catch (error) {
      console.error('获取信号详情失败:', error);
      message.error('获取信号详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取K线数据
  const fetchKlines = async () => {
    if (!id) return;
    try {
      console.log('[SignalDetail] Fetching klines for period:', period);
      const response = await client.get<{
        data: KlineData[];
        stockCode: string;
        stockName: string;
      }>(`/signals/${id}/klines`, {
        params: { period },
      });
      console.log('[SignalDetail] Klines response:', response);
      // 后端返回 { data: [...], total: ..., stockCode: ... }
      const klinesData = response.data || [];
      console.log('[SignalDetail] Klines data:', klinesData);
      setKlines(klinesData);
    } catch (error) {
      console.error('获取K线数据失败:', error);
      message.error('获取K线数据失败');
    }
  };

  // 手动获取K线
  const handleFetchKlines = async () => {
    if (!id) return;
    try {
      setFetchingKlines(true);
      await client.post(`/signals/${id}/fetch-klines`, { period });
      message.success('K线获取任务已提交到队列');
      // 延迟刷新
      setTimeout(() => {
        fetchKlines();
      }, 3000);
    } catch (error) {
      console.error('提交K线获取任务失败:', error);
      message.error('提交K线获取任务失败');
    } finally {
      setFetchingKlines(false);
    }
  };

  // 获取关联新闻
  const fetchRelatedNews = async (newsId: string) => {
    try {
      const response = await client.get<{ data: NewsItem }>(`/news/${newsId}`);
      setNews(response.data);
    } catch (error) {
      console.error('获取关联新闻失败:', error);
    }
  };

  // 获取关联事件
  const fetchRelatedEvent = async (eventId: string) => {
    try {
      const response = await client.get<{ data: EventItem }>(`/events/${eventId}`);
      setEvent(response.data);
    } catch (error) {
      console.error('获取关联事件失败:', error);
    }
  };

  // 初始化图表
  useEffect(() => {
    // 等待信号数据加载完成且图表容器准备好
    if (loading || !signal || !chartContainerRef.current) {
      console.log('[SignalDetail] Chart init waiting: loading=', loading, 'signal=', !!signal, 'ref=', !!chartContainerRef.current);
      return;
    }

    console.log('[SignalDetail] Creating chart...');
    console.log('[SignalDetail] LightweightCharts:', LightweightCharts);
    const chart = LightweightCharts.createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#d9d9d9',
      },
      timeScale: {
        borderColor: '#d9d9d9',
        timeVisible: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    chartRef.current = chart;

    // lightweight-charts v5: 使用 addSeries 方法
    const candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
      upColor: '#52c41a',
      downColor: '#f5222d',
      borderVisible: false,
      wickUpColor: '#52c41a',
      wickDownColor: '#f5222d',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // 创建 markers 插件
    const markers = LightweightCharts.createSeriesMarkers(candlestickSeries);
    markersRef.current = markers;

    console.log('[SignalDetail] Chart initialized, candlestickSeries:', candlestickSeries);
    setChartReady(true);

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [loading, signal]);

  // 更新图表数据
  useEffect(() => {
    console.log('[SignalDetail] Klines data:', klines.length, 'chartReady:', chartReady);
    
    if (!chartReady || !candlestickSeriesRef.current) {
      console.log('[SignalDetail] Chart not ready yet, chartReady:', chartReady, 'ref:', candlestickSeriesRef.current);
      return;
    }
    
    if (klines.length === 0) {
      console.log('[SignalDetail] No klines data');
      return;
    }

    const chartData: CandlestickData<Time>[] = klines.map((k) => ({
      time: Math.floor(new Date(k.timestamp).getTime() / 1000) as Time,
      open: Number(k.open),
      high: Number(k.high),
      low: Number(k.low),
      close: Number(k.close),
    }));

    console.log('[SignalDetail] Setting chart data:', chartData.length, 'items');
    candlestickSeriesRef.current.setData(chartData);
    console.log('[SignalDetail] Chart data set successfully');

    // 如果有信号时间，添加标记点
    const signalTimeStr = signal?.generatedAt || signal?.signalTime || signal?.createdAt;
    
    if (signalTimeStr && markersRef.current) {
      const signalTime = Math.floor(new Date(signalTimeStr).getTime() / 1000) as Time;
      const action = signal?.action || (signal?.direction === 'bullish' ? 'long' : signal?.direction === 'bearish' ? 'short' : 'hold');

      // 调试：显示信号时间和K线时间范围
      console.log('[SignalDetail] Signal time:', signalTime, new Date(signalTime * 1000).toISOString());
      console.log('[SignalDetail] Chart time range:', chartData[0]?.time, chartData[chartData.length - 1]?.time);
      console.log('[SignalDetail] Sample chart times:', chartData.slice(0, 5).map(d => d.time));

      // 找到最接近信号时间的K线数据
      const closestData = chartData.reduce((closest, current) => {
        const currentDiff = Math.abs(Number(current.time) - Number(signalTime));
        const closestDiff = Math.abs(Number(closest.time) - Number(signalTime));
        return currentDiff < closestDiff ? current : closest;
      }, chartData[0]);

      console.log('[SignalDetail] Closest data:', closestData);

      if (closestData) {
        try {
          // lightweight-charts v5: 使用 createSeriesMarkers 添加标记
          const markerColor = action === 'long' ? '#52c41a' : action === 'short' ? '#f5222d' : '#faad14';
          const markerShape: SeriesMarker<Time>['shape'] = action === 'long' ? 'arrowUp' : action === 'short' ? 'arrowDown' : 'circle';
          const markerPosition: SeriesMarker<Time>['position'] = action === 'long' ? 'belowBar' : action === 'short' ? 'aboveBar' : 'inBar';

          const marker: SeriesMarker<Time> = {
            time: closestData.time,
            position: markerPosition,
            shape: markerShape,
            color: markerColor,
            size: 2,
            text: action === 'long' ? '买入' : action === 'short' ? '卖出' : '观望',
          };

          markersRef.current.setMarkers([marker]);

          console.log('[SignalDetail] Signal marker added at time', closestData.time, 'with color', markerColor, 'shape', markerShape);
        } catch (error) {
          console.error('[SignalDetail] Failed to add signal marker:', error);
        }
      }
    }

    chartRef.current?.timeScale().fitContent();
  }, [klines, signal, chartReady]);

  // 初始加载
  useEffect(() => {
    fetchSignalDetail();
  }, [id]);

  // 信号和图表都准备好后获取K线和新闻/事件
  useEffect(() => {
    if (signal && chartReady) {
      console.log('[SignalDetail] Signal and chart ready, fetching klines for period:', period);
      // 清空旧markers
      if (markersRef.current) {
        markersRef.current.setMarkers([]);
      }
      // 清空旧数据，避免显示错误的K线
      setKlines([]);
      fetchKlines();
      
      // 优先获取关联事件
      if (signal.eventId) {
        fetchRelatedEvent(signal.eventId);
      }
      // 如果没有事件，尝试获取关联新闻
      if (!signal.eventId && signal.newsId) {
        fetchRelatedNews(signal.newsId);
      }
    }
  }, [signal, period, chartReady]);

  const getDirectionTag = (direction?: string, action?: string) => {
    const effectiveAction = action || (direction === 'bullish' ? 'long' : direction === 'bearish' ? 'short' : 'hold');
    
    switch (effectiveAction) {
      case 'long':
        return (
          <Tag color="success" icon={<ArrowUpOutlined />} style={{ fontSize: 14, padding: '4px 8px' }}>
            做多
          </Tag>
        );
      case 'short':
        return (
          <Tag color="error" icon={<ArrowDownOutlined />} style={{ fontSize: 14, padding: '4px 8px' }}>
            做空
          </Tag>
        );
      default:
        return (
          <Tag color="default" icon={<MinusOutlined />} style={{ fontSize: 14, padding: '4px 8px' }}>
            观望
          </Tag>
        );
    }
  };

  const getSentimentTag = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <Tag color="success">积极</Tag>;
      case 'negative':
        return <Tag color="error">消极</Tag>;
      default:
        return <Tag color="default">中性</Tag>;
    }
  };

  const getScoreColor = (score?: string, confidence?: number) => {
    const scoreValue = score ? parseFloat(score) : (confidence ? confidence / 100 : 0);
    if (scoreValue >= 0.7) return '#52c41a';
    if (scoreValue >= 0.3) return '#faad14';
    if (scoreValue <= -0.7) return '#f5222d';
    if (scoreValue <= -0.3) return '#faad14';
    return '#999';
  };

  if (loading) {
    return (
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/signals')} style={{ marginBottom: 16 }}>
          返回列表
        </Button>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  if (!signal) {
    return (
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/signals')} style={{ marginBottom: 16 }}>
          返回列表
        </Button>
        <Card>
          <Text type="secondary">信号不存在或已被删除</Text>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/signals')}>
          返回列表
        </Button>
      </Space>

      <Title level={2}>
        {signal.symbol || signal.stockCode} - {signal.stockName || '未知股票'}
      </Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <BarChartOutlined />
                K线图
              </Space>
            }
            extra={
              <Space>
                <Select value={period} onChange={setPeriod} style={{ width: 100 }}>
                  <Option value="1d">日线</Option>
                  <Option value="4h">4小时</Option>
                </Select>
                <Button
                  icon={<ReloadOutlined />}
                  loading={fetchingKlines}
                  onClick={handleFetchKlines}
                >
                  获取K线
                </Button>
              </Space>
            }
          >
            <div ref={chartContainerRef} style={{ width: '100%', height: 400 }} />
          </Card>

          <Card
            title={
              <Space>
                <FileTextOutlined />
                分析理由
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8 }}>
              {signal.reason || signal.reasoning || '暂无分析理由'}
            </Paragraph>
          </Card>

          {event && (
            <Card
              title={
                <Space>
                  <LinkOutlined />
                  关联事件
                </Space>
              }
              style={{ marginTop: 16 }}
              extra={<Link to={`/events/${event.id}`}>查看详情</Link>}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="事件类型">
                  <Tag color="blue">{event.categoryName}</Tag>
                  <Tag color="geekblue">{event.subcategoryName}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="情感方向">
                  <Tag color={event.sentimentDirection > 0 ? 'success' : event.sentimentDirection < 0 ? 'error' : 'default'}>
                    {event.sentimentDirection > 0 ? '利好' : event.sentimentDirection < 0 ? '利空' : '中性'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="重要性">
                  {(parseFloat(event.importanceScore) * 100).toFixed(0)}%
                </Descriptions.Item>
                <Descriptions.Item label="发生时间">
                  {new Date(event.occurredAt).toLocaleString('zh-CN')}
                </Descriptions.Item>
                <Descriptions.Item label="事件说明">
                  {event.sentimentRationale}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {news && !event && (
            <Card
              title={
                <Space>
                  <LinkOutlined />
                  关联新闻
                </Space>
              }
              style={{ marginTop: 16 }}
              extra={<Link to={`/news/${news.id}`}>查看详情</Link>}
            >
              <List.Item>
                <List.Item.Meta
                  title={news.title}
                  description={
                    <Space>
                      <Text type="secondary">来源: {news.source}</Text>
                      <Text type="secondary">
                发布时间: {new Date(news.publishTime).toLocaleString('zh-CN')}
              </Text>
                    </Space>
                  }
                />
              </List.Item>
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          <Card title="信号信息">
            <Descriptions column={1} styles={{ label: { fontWeight: 'bold' } }}>
              <Descriptions.Item label="动作">{getDirectionTag(signal.direction, signal.action)}</Descriptions.Item>
              <Descriptions.Item label="分数">
                <Space>
                  <Text strong style={{ fontSize: 18, color: getScoreColor(signal.score, signal.confidence) }}>
                    {signal.score ? parseFloat(signal.score).toFixed(2) : (signal.confidence ? `${signal.confidence}%` : '-')}
                  </Text>
                  <Tooltip title="分数范围 -1 到 1，正值表示看多，负值表示看空">
                    <PercentageOutlined style={{ color: '#999' }} />
                  </Tooltip>
                </Space>
              </Descriptions.Item>
              {signal.sentiment && (
                <Descriptions.Item label="情绪">{getSentimentTag(signal.sentiment)}</Descriptions.Item>
              )}
              {signal.timeWindow && (
                <Descriptions.Item label="时间窗口">{signal.timeWindow}</Descriptions.Item>
              )}
              <Descriptions.Item label="生成时间">
                <Space>
                  <CalendarOutlined />
                  {new Date(signal.generatedAt || signal.signalTime || signal.createdAt).toLocaleString('zh-CN')}
                </Space>
              </Descriptions.Item>
              {signal.ruleSnapshot && (
                <Descriptions.Item label="规则快照">
                  <Space direction="vertical" size="small">
                    <Text>系数: {signal.ruleSnapshot.multiplier}</Text>
                    <Text>阈值: {signal.ruleSnapshot.threshold}</Text>
                    <Text>启用惊喜: {signal.ruleSnapshot.enableSurprise ? '是' : '否'}</Text>
                    <Text>启用置信度: {signal.ruleSnapshot.enableConfidence ? '是' : '否'}</Text>
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {signal.keyFactors && signal.keyFactors.length > 0 && (
            <Card title="关键因子" style={{ marginTop: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {signal.keyFactors.map((factor, index) => (
                  <Tag key={index} style={{ fontSize: 13, padding: '4px 8px' }}>
                    {factor}
                  </Tag>
                ))}
              </Space>
            </Card>
          )}

          <Card title="操作" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" block onClick={() => navigate(`/stocks/${signal.symbol || signal.stockCode}`)}>
                查看股票详情
              </Button>
              {signal.eventId && (
                <Button block onClick={() => navigate(`/events/${signal.eventId}`)}>
                  查看关联事件
                </Button>
              )}
              {signal.newsId && !signal.eventId && (
                <Button block onClick={() => navigate(`/news/${signal.newsId}`)}>
                  查看关联新闻
                </Button>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SignalDetailPage;
