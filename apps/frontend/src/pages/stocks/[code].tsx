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
  Select,
  Result,
} from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, BarChartOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'umi';
import * as LightweightCharts from 'lightweight-charts';
import type { CandlestickData, Time, IChartApi, ISeriesApi } from 'lightweight-charts';
import client from '@/services/client';
import type { Signal, KlineData } from '@/services/types';

const { Title, Text } = Typography;
const { Option } = Select;

interface StockDetail {
  stockCode: string;
  stockName: string;
  signalCount: number;
  latestSignalTime: string | null;
  signals: Signal[];
}

const StockDetailPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersRef = useRef<LightweightCharts.ISeriesMarkersPluginApi<Time> | null>(null);

  const [loading, setLoading] = useState(true);
  const [stockDetail, setStockDetail] = useState<StockDetail | null>(null);
  const [klines, setKlines] = useState<KlineData[]>([]);
  const [period, setPeriod] = useState<'1d' | '4h'>('4h');
  const [fetchingKlines, setFetchingKlines] = useState(false);
  const [syncingStock, setSyncingStock] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchStockDetail = async () => {
    if (!code) return;
    setLoading(true);
    setNotFound(false);
    try {
      const response = await client.get(`/stocks/${code}`);
      setStockDetail(response.data);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setNotFound(true);
      } else {
        message.error('获取股票详情失败');
        console.error('Fetch stock detail error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchKlines = async (p: '1d' | '4h' = period) => {
    if (!code) return;
    try {
      setFetchingKlines(true);
      const response = await client.get(`/stocks/${code}/klines`, {
        params: { period: p, limit: 100 },
      });
      setKlines(response.data || []);
    } catch (error) {
      console.error('Fetch klines error:', error);
    } finally {
      setFetchingKlines(false);
    }
  };

  const handleFetchKlines = async () => {
    if (!code) return;
    try {
      setFetchingKlines(true);
      await client.post(`/stocks/${code}/fetch-klines`, { period });
      message.success('K线获取任务已提交到队列');
      setTimeout(() => {
        fetchKlines(period);
      }, 3000);
    } catch (error) {
      console.error('提交K线获取任务失败:', error);
      message.error('提交K线获取任务失败');
    } finally {
      setFetchingKlines(false);
    }
  };

  const handleSyncStock = async () => {
    if (!code) return;
    try {
      setSyncingStock(true);
      message.loading({ content: '正在获取K线数据...', key: 'syncStock' });
      await client.post(`/stocks/${code}/fetch-klines`, { period: '4h' });
      message.success({ 
        content: 'K线数据获取任务已提交，请稍后刷新页面', 
        key: 'syncStock' 
      });
      setTimeout(() => {
        fetchStockDetail();
      }, 3000);
    } catch (error) {
      console.error('获取K线数据失败:', error);
      message.error({ content: '获取K线数据失败', key: 'syncStock' });
    } finally {
      setSyncingStock(false);
    }
  };

  useEffect(() => {
    fetchStockDetail();
  }, [code]);

  // 初始化时获取K线数据
  useEffect(() => {
    if (stockDetail && !loading) {
      fetchKlines(period);
    }
  }, [stockDetail, loading]);

  // 切换周期时重新获取K线
  useEffect(() => {
    if (stockDetail && !loading) {
      // 清空旧markers
      if (markersRef.current) {
        markersRef.current.setMarkers([]);
      }
      setKlines([]);
      fetchKlines(period);
    }
  }, [period]);

  // 初始化图表
  useEffect(() => {
    if (loading || !stockDetail || !chartContainerRef.current) {
      return;
    }

    console.log('[StockDetail] Creating chart...');
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
    const markersPlugin = LightweightCharts.createSeriesMarkers(candlestickSeries);
    markersRef.current = markersPlugin;

    console.log('[StockDetail] Chart initialized');

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
  }, [loading, stockDetail]);

  // 更新图表数据
  useEffect(() => {
    if (!candlestickSeriesRef.current) {
      return;
    }

    if (klines.length === 0) {
      return;
    }

    const chartData: CandlestickData<Time>[] = klines
      .map((k) => ({
        time: Math.floor(new Date(k.timestamp).getTime() / 1000) as Time,
        open: Number(k.open),
        high: Number(k.high),
        low: Number(k.low),
        close: Number(k.close),
      }))
      .sort((a, b) => {
        const timeA = typeof a.time === 'number' ? a.time : 0;
        const timeB = typeof b.time === 'number' ? b.time : 0;
        return timeA - timeB;
      });

    console.log('[StockDetail] Setting chart data:', chartData.length, 'items');
    candlestickSeriesRef.current.setData(chartData);

    // 添加信号标记点
    if (stockDetail?.signals && stockDetail.signals.length > 0) {
      const markers: LightweightCharts.SeriesMarker<Time>[] = [];

      stockDetail.signals.forEach((signal) => {
        const signalTimeStr = signal.generatedAt || signal.signalTime || signal.createdAt;
        const action = signal.action || (signal.direction === 'bullish' ? 'long' : signal.direction === 'bearish' ? 'short' : 'hold');
        
        if (signalTimeStr) {
          const signalTime = new Date(signalTimeStr).getTime();
          let bestKline: KlineData | null = null;
          let minDiff = Infinity;

          klines.forEach((k) => {
            const klineTime = new Date(k.timestamp).getTime();
            const diff = Math.abs(klineTime - signalTime);
            if (diff < minDiff) {
              minDiff = diff;
              bestKline = k;
            }
          });

          // 只添加时间差在合理范围内的标记（1年内）
          if (bestKline && minDiff < 365 * 24 * 60 * 60 * 1000) {
            let markerConfig: {
              position: LightweightCharts.SeriesMarker<Time>['position'];
              color: string;
              shape: LightweightCharts.SeriesMarker<Time>['shape'];
              text: string;
            };

            if (action === 'long') {
              markerConfig = {
                position: 'belowBar',
                color: '#52c41a',
                shape: 'arrowUp',
                text: '买入',
              };
            } else if (action === 'short') {
              markerConfig = {
                position: 'aboveBar',
                color: '#f5222d',
                shape: 'arrowDown',
                text: '卖出',
              };
            } else {
              // 观望信号使用圆圈标记
              markerConfig = {
                position: 'inBar',
                color: '#faad14',
                shape: 'circle',
                text: '观望',
              };
            }

            markers.push({
              time: Math.floor(new Date(bestKline.timestamp).getTime() / 1000) as Time,
              position: markerConfig.position,
              color: markerConfig.color,
              shape: markerConfig.shape,
              text: markerConfig.text,
            });
          }
        }
      });

      if (markers.length > 0 && markersRef.current) {
        // 按时间排序
        markers.sort((a, b) => (a.time as number) - (b.time as number));
        markersRef.current.setMarkers(markers);
        console.log('[StockDetail] Added', markers.length, 'signal markers');
      }
    }

    chartRef.current?.timeScale().fitContent();
  }, [klines, stockDetail]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  const getDirectionColor = (direction: string) => {
    if (direction === 'bullish') return 'success';
    if (direction === 'bearish') return 'error';
    return 'default';
  };

  const getDirectionText = (direction: string) => {
    if (direction === 'bullish') return '买入';
    if (direction === 'bearish') return '卖出';
    return '观望';
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stocks')}>
          返回
        </Button>
        <Button icon={<ReloadOutlined />} onClick={fetchStockDetail}>
          刷新
        </Button>
      </Space>

      <Spin spinning={loading}>
        {notFound ? (
          <Result
            status="404"
            title="股票数据不存在"
            subTitle="该股票暂无信号或K线数据，您可以尝试获取K线数据"
            extra={[
              <Button 
                type="primary" 
                key="fetch" 
                loading={syncingStock}
                onClick={handleSyncStock}
              >
                获取K线数据
              </Button>,
              <Button 
                key="back" 
                onClick={() => navigate('/stocks')}
              >
                返回列表
              </Button>,
            ]}
          />
        ) : stockDetail ? (
          <>
            <Card style={{ marginBottom: 24 }}>
              <Title level={3}>
                {stockDetail.stockName} ({stockDetail.stockCode})
              </Title>
              <Space size="large">
                <Text>信号数量: <Tag color="blue">{stockDetail.signalCount} 条</Tag></Text>
                <Text>最新信号: {formatDate(stockDetail.latestSignalTime)}</Text>
              </Space>
            </Card>

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
                    <Option value="4h">4小时</Option>
                    <Option value="1d">日线</Option>
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
              style={{ marginBottom: 24 }}
            >
              <div ref={chartContainerRef} style={{ width: '100%', height: 400 }} />
            </Card>

            <Card title="历史信号">
              {stockDetail.signals.length === 0 ? (
                <Empty description="暂无信号数据" />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {stockDetail.signals.map((signal) => {
                    const action = signal.action || (signal.direction === 'bullish' ? 'long' : signal.direction === 'bearish' ? 'short' : 'hold');
                    const score = signal.score ? parseFloat(signal.score) : (signal.confidence ? signal.confidence / 100 : 0);
                    const time = signal.generatedAt || signal.signalTime || signal.createdAt;
                    
                    return (
                      <Card key={signal.id} size="small" style={{ marginBottom: 8 }}>
                        <Space>
                          <Tag color={getDirectionColor(action === 'long' ? 'bullish' : action === 'short' ? 'bearish' : 'neutral')}>
                            {getDirectionText(action === 'long' ? 'bullish' : action === 'short' ? 'bearish' : 'neutral')}
                          </Tag>
                          <Text>分数: {score.toFixed(2)}</Text>
                          <Text type="secondary">{formatDate(time)}</Text>
                        </Space>
                      </Card>
                    );
                  })}
                </Space>
              )}
            </Card>
          </>
        ) : (
          <Empty description="股票不存在" />
        )}
      </Spin>
    </div>
  );
};

export default StockDetailPage;
