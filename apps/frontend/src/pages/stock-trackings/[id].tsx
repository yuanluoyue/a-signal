import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  Tag,
  Typography,
  Space,
  message,
  Spin,
  Empty,
  List,
  Divider,
  Modal,
  Table,
  Descriptions,
  Pagination,
  Popconfirm,
  Row,
  Col,
  Select,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  LineChartOutlined,
  FileTextOutlined,
  EyeOutlined,
  HistoryOutlined,
  DeleteOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'umi';
import * as LightweightCharts from 'lightweight-charts';
import type { CandlestickData, Time, IChartApi, ISeriesApi, SeriesMarker } from 'lightweight-charts';
import api from '@/services/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface StockTracking {
  id: string;
  stockCode: string;
  stockName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalNews: number;
  createdAt: string;
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  publishTime: string;
  source: string;
  analyzeStatus: string;
}

interface BacktestRecord {
  id: string;
  startTime: string;
  endTime: string;
  period: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: string;
  totalReturn: string;
  maxDrawdown: string;
  avgReturn: string;
  trades: Array<{
    signalId: string;
    stockCode: string;
    stockName: string;
    direction: string;
    entryPrice: number;
    exitPrice: number;
    return: number;
    exitReason: string;
    entryTime: string;
    exitTime: string;
  }>;
  createdAt: string;
}

interface Signal {
  id: string;
  stockCode: string;
  stockName: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  signalTime: string;
  reasoning: string;
}

interface KlineData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const StockTrackingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState<StockTracking | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsPagination, setNewsPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [report, setReport] = useState<string>('');
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestRecords, setBacktestRecords] = useState<BacktestRecord[]>([]);
  const [backtestModalVisible, setBacktestModalVisible] = useState(false);
  const [selectedBacktest, setSelectedBacktest] = useState<BacktestRecord | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [klines, setKlines] = useState<KlineData[]>([]);
  const [period, setPeriod] = useState<'1d' | '4h'>('1d');
  const [chartReady, setChartReady] = useState(false);

  const fetchTrackingDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/stock-trackings/${id}`);
      setTracking(response.data);
    } catch (error) {
      message.error('获取追踪详情失败');
      console.error('Fetch tracking detail error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/stock-trackings/${id}/report`);
      const reportData = response.data?.report;
      if (reportData) {
        setReport(reportData);
      }
    } catch (error) {
      console.error('Fetch report error:', error);
    }
  };

  const fetchNews = async (page = 1, pageSize = 10) => {
    if (!id) return;
    try {
      const response = await api.get(`/stock-trackings/${id}/news`);
      const newsList = response.data || [];
      setNews(newsList);
      setNewsPagination({
        current: page,
        pageSize,
        total: newsList.length,
      });
    } catch (error) {
      console.error('Fetch news error:', error);
    }
  };

  const fetchBacktestRecords = async () => {
    if (!tracking?.stockCode) return;
    try {
      const response = await api.get(`/backtest/records?stockCode=${tracking.stockCode}`);
      const records = response.data || [];
      setBacktestRecords(records);
    } catch (error) {
      console.error('Fetch backtest records error:', error);
    }
  };

  const fetchSignals = async () => {
    if (!tracking?.stockCode) return;
    try {
      const response = await api.get(`/signals?stockCode=${tracking.stockCode}`);
      setSignals(response.data || []);
    } catch (error) {
      console.error('Fetch signals error:', error);
    }
  };

  const fetchKlines = async () => {
    if (!tracking?.stockCode) return;
    try {
      const response = await api.get(`/klines/${tracking.stockCode}`, {
        params: { period },
      });
      setKlines(response.data || []);
    } catch (error) {
      console.error('Fetch klines error:', error);
    }
  };

  useEffect(() => {
    fetchTrackingDetail();
    fetchNews(1, 10);
    fetchReport();
  }, [id]);

  useEffect(() => {
    if (tracking?.stockCode) {
      fetchBacktestRecords();
      fetchSignals();
      fetchKlines();

      const interval = setInterval(() => {
        fetchBacktestRecords();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [tracking?.stockCode]);

  // 初始化图表
  useEffect(() => {
    if (!chartContainerRef.current || !tracking) return;

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
      timeScale: { borderColor: '#d9d9d9', timeVisible: true },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
      upColor: '#52c41a',
      downColor: '#f5222d',
      borderVisible: false,
      wickUpColor: '#52c41a',
      wickDownColor: '#f5222d',
    });

    candlestickSeriesRef.current = candlestickSeries;

    const markers = LightweightCharts.createSeriesMarkers(candlestickSeries);
    markersRef.current = markers;

    setChartReady(true);

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [tracking]);

  // 更新图表数据和信号标记
  useEffect(() => {
    if (!chartReady || !candlestickSeriesRef.current || klines.length === 0) return;

    const chartData: CandlestickData<Time>[] = klines.map((k) => ({
      time: Math.floor(new Date(k.timestamp).getTime() / 1000) as Time,
      open: Number(k.open),
      high: Number(k.high),
      low: Number(k.low),
      close: Number(k.close),
    }));

    candlestickSeriesRef.current.setData(chartData);

    // 添加信号标记
    if (signals.length > 0 && markersRef.current) {
      const markers: SeriesMarker<Time>[] = signals.map((signal) => {
        const signalTime = Math.floor(new Date(signal.signalTime).getTime() / 1000) as Time;
        const closestData = chartData.reduce((closest, current) => {
          const currentDiff = Math.abs(Number(current.time) - Number(signalTime));
          const closestDiff = Math.abs(Number(closest.time) - Number(signalTime));
          return currentDiff < closestDiff ? current : closest;
        }, chartData[0]);

        return {
          time: closestData?.time || signalTime,
          position: signal.direction === 'bullish' ? 'belowBar' : 'aboveBar',
          shape: signal.direction === 'bullish' ? 'arrowUp' : 'arrowDown',
          color: signal.direction === 'bullish' ? '#52c41a' : '#f5222d',
          size: 2,
          text: `${signal.direction === 'bullish' ? '买入' : '卖出'} ${signal.confidence}%`,
        };
      });

      markersRef.current.setMarkers(markers);
    }

    chartRef.current?.timeScale().fitContent();
  }, [klines, signals, chartReady]);

  const handleFetchNews = async () => {
    if (!id) return;
    try {
      await api.post(`/stock-trackings/${id}/fetch-news`);
      message.success('历史新闻获取任务已启动');
      setTimeout(() => {
        fetchTrackingDetail();
        fetchNews(1, 10);
      }, 5000);
    } catch (error) {
      message.error('获取历史新闻失败');
      console.error('Fetch news error:', error);
    }
  };

  const handleGenerateSignals = async () => {
    if (!id) return;
    try {
      const response = await api.post(`/stock-trackings/${id}/generate-signals`);
      message.success(response.data?.message || '信号生成任务已启动');
    } catch (error) {
      message.error('生成信号失败');
      console.error('Generate signals error:', error);
    }
  };

  const handleBacktest = async () => {
    if (!id) return;
    setBacktestLoading(true);
    try {
      await api.post(`/stock-trackings/${id}/backtest`);
      message.success('回测执行成功');
      await fetchBacktestRecords();
    } catch (error) {
      message.error('回测失败');
      console.error('Backtest error:', error);
    } finally {
      setBacktestLoading(false);
    }
  };

  const handleViewBacktestDetail = (record: BacktestRecord) => {
    setSelectedBacktest(record);
    setBacktestModalVisible(true);
  };

  const handleDeleteBacktest = async (backtestId: string) => {
    try {
      await api.delete(`/backtest/records/${backtestId}`);
      message.success('删除成功');
      fetchBacktestRecords();
    } catch (error) {
      message.error('删除失败');
      console.error('Delete backtest record error:', error);
    }
  };

  const handleGenerateReport = async () => {
    if (!id) return;
    try {
      const response = await api.post(`/stock-trackings/${id}/generate-report`);
      setReport(response.data?.report || '');
      message.success('研投报告生成成功');
    } catch (error) {
      message.error('生成研投报告失败');
      console.error('Generate report error:', error);
    }
  };

  const handleNewsPageChange = (page: number, pageSize?: number) => {
    setNewsPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize,
    }));
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'default',
      processing: 'processing',
      completed: 'success',
      failed: 'error',
    };
    return colorMap[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      pending: '待处理',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
    };
    return textMap[status] || status;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  const formatPercent = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${(num * 100).toFixed(2)}%`;
  };

  const getCurrentPageNews = () => {
    const { current, pageSize } = newsPagination;
    const start = (current - 1) * pageSize;
    const end = start + pageSize;
    return news.slice(start, end);
  };

  const backtestColumns = [
    {
      title: '回测时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => formatDate(time),
    },
    {
      title: '交易次数',
      dataIndex: 'totalTrades',
      key: 'totalTrades',
      render: (count: number) => <Tag color="blue">{count} 笔</Tag>,
    },
    {
      title: '胜率',
      dataIndex: 'winRate',
      key: 'winRate',
      render: (rate: string) => {
        const num = parseFloat(rate);
        const color = num >= 0.5 ? 'success' : num >= 0.3 ? 'warning' : 'error';
        return <Tag color={color}>{formatPercent(rate)}</Tag>;
      },
    },
    {
      title: '总收益率',
      dataIndex: 'totalReturn',
      key: 'totalReturn',
      render: (ret: string) => {
        const num = parseFloat(ret);
        const color = num > 0 ? 'red' : num < 0 ? 'green' : 'default';
        return <Tag color={color}>{formatPercent(ret)}</Tag>;
      },
    },
    {
      title: '最大回撤',
      dataIndex: 'maxDrawdown',
      key: 'maxDrawdown',
      render: (dd: string) => <Text type="danger">{formatPercent(dd)}</Text>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: BacktestRecord) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewBacktestDetail(record)}
          >
            查看详情
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条回测记录吗？"
            onConfirm={() => handleDeleteBacktest(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />} size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const signalColumns = [
    {
      title: '时间',
      dataIndex: 'signalTime',
      key: 'signalTime',
      render: (time: string) => formatDate(time),
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      render: (direction: string) => {
        const color = direction === 'bullish' ? 'red' : 'green';
        const text = direction === 'bullish' ? '买入' : '卖出';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (confidence: number) => `${confidence}%`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Signal) => (
        <Button type="link" onClick={() => navigate(`/signals/${record.id}`)}>查看</Button>
      ),
    },
  ];

  const tradeColumns = [
    {
      title: '股票代码',
      dataIndex: 'stockCode',
      key: 'stockCode',
    },
    {
      title: '股票名称',
      dataIndex: 'stockName',
      key: 'stockName',
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      render: (direction: string) => {
        const color = direction === 'buy' || direction === 'bullish' ? 'red' : 'green';
        const text = direction === 'buy' || direction === 'bullish' ? '买入' : '卖出';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '入场价',
      dataIndex: 'entryPrice',
      key: 'entryPrice',
      render: (price: number) => price?.toFixed(2) || '-',
    },
    {
      title: '出场价',
      dataIndex: 'exitPrice',
      key: 'exitPrice',
      render: (price: number) => price?.toFixed(2) || '-',
    },
    {
      title: '收益率',
      dataIndex: 'return',
      key: 'return',
      render: (ret: number) => {
        const color = ret > 0 ? 'red' : ret < 0 ? 'green' : 'default';
        const text = ret > 0 ? `+${(ret * 100).toFixed(2)}%` : `${(ret * 100).toFixed(2)}%`;
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '出场原因',
      dataIndex: 'exitReason',
      key: 'exitReason',
      render: (reason: string) => {
        const reasonMap: Record<string, string> = { takeProfit: '止盈', stopLoss: '止损', timeExpired: '到期' };
        return reasonMap[reason] || reason;
      },
    },
    {
      title: '入场时间',
      dataIndex: 'entryTime',
      key: 'entryTime',
      render: (time: string) => formatDate(time),
    },
    {
      title: '出场时间',
      dataIndex: 'exitTime',
      key: 'exitTime',
      render: (time: string) => formatDate(time),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stock-trackings')}>返回</Button>
        <Button icon={<ReloadOutlined />} onClick={fetchTrackingDetail}>刷新</Button>
      </Space>

      <Spin spinning={loading}>
        {tracking ? (
          <>
            {/* 基本信息 */}
            <Card style={{ marginBottom: 24 }}>
              <Title level={3}>{tracking.stockName} ({tracking.stockCode})</Title>
              <Space size="large">
                <Text>状态: <Tag color={getStatusColor(tracking.status)}>{getStatusText(tracking.status)}</Tag></Text>
                <Text>新闻数量: <Tag color="blue">{tracking.totalNews} 条</Tag></Text>
                <Text>创建时间: {formatDate(tracking.createdAt)}</Text>
              </Space>
            </Card>

            {/* 操作按钮 */}
            <Card style={{ marginBottom: 24 }}>
              <Space wrap>
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleFetchNews}>获取历史新闻</Button>
                <Button icon={<LineChartOutlined />} onClick={handleGenerateSignals}>生成历史信号</Button>
                <Button icon={<HistoryOutlined />} onClick={handleBacktest} loading={backtestLoading}>执行回测</Button>
                <Button icon={<FileTextOutlined />} onClick={handleGenerateReport}>生成研投报告</Button>
              </Space>
            </Card>

            {/* 回测记录 - 最上 */}
            <Card title="回测记录" style={{ marginBottom: 24 }}>
              {backtestRecords.length === 0 ? (
                <Empty description="暂无回测记录，请点击「执行回测」按钮" />
              ) : (
                <Table dataSource={backtestRecords} columns={backtestColumns} rowKey="id" pagination={{ pageSize: 5 }} size="small" />
              )}
            </Card>

            {/* 研投报告 - 第二 */}
            <Card title="研投报告" style={{ marginBottom: 24 }}>
              {report ? (
                <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{report}</Text>
                </div>
              ) : (
                <Empty description="暂无研投报告，请点击「生成研投报告」按钮" />
              )}
            </Card>

            {/* K线 + 信号列表 - 左右分栏 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={16}>
                <Card
                  title={<Space><BarChartOutlined />K线图</Space>}
                  extra={
                    <Select value={period} onChange={setPeriod} style={{ width: 100 }}>
                      <Option value="1d">日线</Option>
                      <Option value="4h">4小时</Option>
                    </Select>
                  }
                >
                  <div ref={chartContainerRef} style={{ width: '100%', height: 400 }} />
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card title="信号列表">
                  {signals.length === 0 ? (
                    <Empty description="暂无信号" />
                  ) : (
                    <Table dataSource={signals} columns={signalColumns} rowKey="id" pagination={{ pageSize: 5 }} size="small" scroll={{ y: 340 }} />
                  )}
                </Card>
              </Col>
            </Row>

            {/* 历史新闻 - 最下 */}
            <Card title="历史新闻">
              {news.length === 0 ? (
                <Empty description="暂无新闻数据，请点击「获取历史新闻」按钮" />
              ) : (
                <>
                  <List
                    dataSource={getCurrentPageNews()}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={<Link to={`/news/${item.id}`} style={{ color: '#1890ff' }}>{item.title}</Link>}
                          description={
                            <Space split={<Divider type="vertical" />}>
                              <Text type="secondary">{item.source}</Text>
                              <Text type="secondary">{formatDate(item.publishTime)}</Text>
                              <Tag color={item.analyzeStatus === 'analyzed' ? 'success' : 'default'}>
                                {item.analyzeStatus === 'analyzed' ? '已分析' : '待分析'}
                              </Tag>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Pagination
                      current={newsPagination.current}
                      pageSize={newsPagination.pageSize}
                      total={newsPagination.total}
                      onChange={handleNewsPageChange}
                      showSizeChanger
                      showQuickJumper
                      showTotal={(total) => `共 ${total} 条`}
                    />
                  </div>
                </>
              )}
            </Card>
          </>
        ) : (
          <Empty description="追踪记录不存在" />
        )}
      </Spin>

      {/* 回测详情弹窗 */}
      <Modal
        title="回测详情"
        open={backtestModalVisible}
        onCancel={() => setBacktestModalVisible(false)}
        width={1400}
        footer={[<Button key="close" onClick={() => setBacktestModalVisible(false)}>关闭</Button>]}
      >
        {selectedBacktest ? (
          <>
            <Descriptions bordered column={3} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="回测时间">{formatDate(selectedBacktest.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="回测区间">{formatDate(selectedBacktest.startTime)} ~ {formatDate(selectedBacktest.endTime)}</Descriptions.Item>
              <Descriptions.Item label="K线周期">{selectedBacktest.period}</Descriptions.Item>
              <Descriptions.Item label="总交易次数">{selectedBacktest.totalTrades} 笔</Descriptions.Item>
              <Descriptions.Item label="盈利次数" style={{ color: '#52c41a' }}>{selectedBacktest.winningTrades} 笔</Descriptions.Item>
              <Descriptions.Item label="亏损次数" style={{ color: '#ff4d4f' }}>{selectedBacktest.losingTrades} 笔</Descriptions.Item>
              <Descriptions.Item label="胜率">{formatPercent(selectedBacktest.winRate)}</Descriptions.Item>
              <Descriptions.Item label="总收益率">
                <Tag color={parseFloat(selectedBacktest.totalReturn) > 0 ? 'red' : 'green'}>{formatPercent(selectedBacktest.totalReturn)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="平均收益率">{formatPercent(selectedBacktest.avgReturn)}</Descriptions.Item>
              <Descriptions.Item label="最大回撤" span={3}><Text type="danger">{formatPercent(selectedBacktest.maxDrawdown)}</Text></Descriptions.Item>
            </Descriptions>
            <Title level={5}>交易明细</Title>
            <Table dataSource={selectedBacktest.trades} columns={tradeColumns} rowKey="signalId" pagination={{ pageSize: 10 }} size="small" scroll={{ x: 1200 }} />
          </>
        ) : (
          <Empty description="暂无数据" />
        )}
      </Modal>
    </div>
  );
};

export default StockTrackingDetailPage;
