import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  Tag,
  Typography,
  Space,
  Table,
  Form,
  InputNumber,
  Input,
  Select,
  message,
  Modal,
  Statistic,
  Row,
  Col,
  Empty,
  Popconfirm,
  Spin,
} from 'antd';
import {
  ReloadOutlined,
  PlusOutlined,
  WalletOutlined,
  ShoppingCartOutlined,
  HistoryOutlined,
  EditOutlined,
  DeleteOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import * as LightweightCharts from 'lightweight-charts';
import type { IChartApi, Time } from 'lightweight-charts';
import client from '@/services/client';
import { klinesApi } from '@/services/klines';

const { Title, Text } = Typography;
const { Option } = Select;

interface SimulationAccount {
  id: string;
  initialCapital: number;
  currentCapital: number;
  availableCash: number;
  totalProfit: number;
  totalReturn: number;
}

interface SimulationPosition {
  id: string;
  stockCode: string;
  stockName: string;
  quantity: number;
  avgCost: number;
  currentPrice?: number;
  marketValue?: number;
  profit: number;
  return: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  tradeSource?: string;
  strategyId?: string;
}

interface SimulationTrade {
  id: string;
  stockCode: string;
  stockName: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalAmount: number;
  profit?: number;
  closeReason?: string;
  tradeSource?: string;
  strategyId?: string;
  tradeTime: string;
}

interface StockOption {
  value: string;
  label: string;
  code: string;
  name: string;
}

interface EquityCurvePoint {
  id: string;
  accountId: string;
  totalEquity: string;
  availableCash: string;
  positionValue: string;
  totalProfit: string;
  totalReturn: string;
  recordedAt: string;
  createdAt: string;
}

interface StrategyInfo {
  id: string;
  name: string;
}

const SimulationPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [account, setAccount] = useState<SimulationAccount | null>(null);
  const [positions, setPositions] = useState<SimulationPosition[]>([]);
  const [trades, setTrades] = useState<SimulationTrade[]>([]);
  const [equityCurveData, setEquityCurveData] = useState<EquityCurvePoint[]>([]);
  const [isTradeModalVisible, setIsTradeModalVisible] = useState(false);
  const [isBalanceModalVisible, setIsBalanceModalVisible] = useState(false);
  const [isPositionModalVisible, setIsPositionModalVisible] = useState(false);
  const [tradeForm] = Form.useForm();
  const [balanceForm] = Form.useForm();
  const [positionForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'positions' | 'trades' | 'equity-curve'>('positions');

  const [tradeStockOptions, setTradeStockOptions] = useState<StockOption[]>([]);
  const [tradeSearchLoading, setTradeSearchLoading] = useState(false);
  const tradeDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [positionStockOptions, setPositionStockOptions] = useState<StockOption[]>([]);
  const [positionSearchLoading, setPositionSearchLoading] = useState(false);
  const positionDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);

  const [tradePrice, setTradePrice] = useState<number | null>(null);
  const [tradePriceLoading, setTradePriceLoading] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const fetchAccount = async () => {
    try {
      const response = await client.get('/simulation/account');
      setAccount(response.data);
    } catch (error) {
      console.error('Fetch account error:', error);
      setAccount(null);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await client.get('/simulation/positions');
      setPositions(response.data || []);
    } catch (error) {
      console.error('Fetch positions error:', error);
      setPositions([]);
    }
  };

  const fetchTrades = async () => {
    try {
      const response = await client.get('/simulation/trades');
      setTrades(response.data || []);
    } catch (error) {
      console.error('Fetch trades error:', error);
      setTrades([]);
    }
  };

  const fetchEquityCurve = async () => {
    try {
      const response = await client.get('/simulation/equity-curve');
      setEquityCurveData(response.data || []);
    } catch (error) {
      console.error('Fetch equity curve error:', error);
      setEquityCurveData([]);
    }
  };

  const fetchStrategies = async () => {
    try {
      const response = await client.get('/strategies', { params: { pageSize: 100 } });
      const data = response.data || [];
      setStrategies(Array.isArray(data) ? data.map((s: StrategyInfo) => ({ id: s.id, name: s.name })) : []);
    } catch (error) {
      console.error('Fetch strategies error:', error);
      setStrategies([]);
    }
  };

  const refreshPositions = async () => {
    setRefreshLoading(true);
    try {
      const response = await client.get('/simulation/refresh');
      const { account: refreshedAccount, positions: refreshedPositions } = response.data;
      if (refreshedAccount) setAccount(refreshedAccount);
      if (refreshedPositions) setPositions(refreshedPositions);
    } catch (error) {
      console.error('Refresh positions error:', error);
    } finally {
      setRefreshLoading(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchAccount(), fetchPositions(), fetchTrades()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshPositions();
    fetchAllData();
    fetchStrategies();
  }, []);

  useEffect(() => {
    if (activeTab === 'equity-curve') {
      fetchEquityCurve();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!chartContainerRef.current || equityCurveData.length === 0) return;

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

    const lineSeries = chart.addSeries(LightweightCharts.LineSeries, {
      color: '#1890ff',
      lineWidth: 2,
    });

    const sortedData = [...equityCurveData].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    const seen = new Map<number, number>();
    for (const point of sortedData) {
      const timeKey = Math.floor(new Date(point.recordedAt).getTime() / 1000);
      seen.set(timeKey, parseFloat(point.totalEquity));
    }

    const chartData = Array.from(seen.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([time, value]) => ({
        time: time as Time,
        value,
      }));

    lineSeries.setData(chartData);

    chart.timeScale().fitContent();

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
      chartRef.current = null;
    };
  }, [equityCurveData]);

  useEffect(() => {
    return () => {
      if (tradeDebounceTimerRef.current) {
        clearTimeout(tradeDebounceTimerRef.current);
      }
      if (positionDebounceTimerRef.current) {
        clearTimeout(positionDebounceTimerRef.current);
      }
    };
  }, []);

  const searchStocks = async (keyword: string, type: 'trade' | 'position') => {
    if (!keyword || keyword.trim().length === 0) {
      if (type === 'trade') setTradeStockOptions([]);
      else setPositionStockOptions([]);
      return;
    }
    if (type === 'trade') setTradeSearchLoading(true);
    else setPositionSearchLoading(true);
    try {
      const response = await client.get('/stock/search', {
        params: { keyword: keyword.trim() },
      });
      const stocks = response.data || [];
      const options: StockOption[] = stocks.map((stock: { code: string; name: string }) => ({
        value: stock.code,
        label: `${stock.code} - ${stock.name}`,
        code: stock.code,
        name: stock.name,
      }));
      if (type === 'trade') setTradeStockOptions(options);
      else setPositionStockOptions(options);
    } catch (error) {
      console.error('Search stocks error:', error);
      if (type === 'trade') setTradeStockOptions([]);
      else setPositionStockOptions([]);
    } finally {
      if (type === 'trade') setTradeSearchLoading(false);
      else setPositionSearchLoading(false);
    }
  };

  const handleTradeStockSearch = (value: string) => {
    if (tradeDebounceTimerRef.current) {
      clearTimeout(tradeDebounceTimerRef.current);
    }
    tradeDebounceTimerRef.current = setTimeout(() => {
      searchStocks(value, 'trade');
    }, 300);
  };

  const handlePositionStockSearch = (value: string) => {
    if (positionDebounceTimerRef.current) {
      clearTimeout(positionDebounceTimerRef.current);
    }
    positionDebounceTimerRef.current = setTimeout(() => {
      searchStocks(value, 'position');
    }, 300);
  };

  const handleTradeStockChange = async (value: string) => {
    const selectedOption = tradeStockOptions.find(opt => opt.value === value);
    if (selectedOption) {
      tradeForm.setFieldsValue({
        stockCode: selectedOption.code,
        stockName: selectedOption.name,
      });
      setTradePrice(null);
      setTradePriceLoading(true);
      try {
        await klinesApi.checkAndUpdate(selectedOption.code, '4h');
        const klineResponse = await client.get(`/klines/${selectedOption.code}`, {
          params: { period: '4h' },
        });
        const klineData = klineResponse.data?.data || klineResponse.data || [];
        if (Array.isArray(klineData) && klineData.length > 0) {
          const lastItem = klineData[klineData.length - 1];
          const closePrice = lastItem.close || lastItem.c;
          if (closePrice) {
            setTradePrice(parseFloat(String(closePrice)));
          }
        }
      } catch (error) {
        console.error('Fetch trade price error:', error);
      } finally {
        setTradePriceLoading(false);
      }
    }
  };

  const handlePositionStockChange = (value: string) => {
    const selectedOption = positionStockOptions.find(opt => opt.value === value);
    if (selectedOption) {
      positionForm.setFieldsValue({
        stockCode: selectedOption.code,
        stockName: selectedOption.name,
      });
    }
  };

  const handleUpdateBalance = async (values: { currentCapital: number; availableCash: number }) => {
    try {
      await client.put('/simulation/account', values);
      message.success('余额更新成功');
      setIsBalanceModalVisible(false);
      balanceForm.resetFields();
      fetchAccount();
    } catch (error) {
      message.error('余额更新失败');
      console.error('Update balance error:', error);
    }
  };

  const handleAddPosition = async (values: {
    stockCode: string;
    stockName: string;
    quantity: number;
    avgCost: number;
    takeProfitPrice?: number;
    stopLossPrice?: number;
  }) => {
    try {
      await client.post('/simulation/position', values);
      message.success('持仓添加成功');
      setIsPositionModalVisible(false);
      positionForm.resetFields();
      setPositionStockOptions([]);
      fetchPositions();
    } catch (error) {
      message.error('持仓添加失败');
      console.error('Add position error:', error);
    }
  };

  const handleDeletePosition = async (positionId: string) => {
    try {
      await client.delete(`/simulation/position/${positionId}`);
      message.success('持仓删除成功');
      fetchPositions();
    } catch (error) {
      message.error('持仓删除失败');
      console.error('Delete position error:', error);
    }
  };

  const handleTrade = async (values: {
    stockCode: string;
    stockName: string;
    type: 'buy' | 'sell';
    quantity: number;
    takeProfitPrice?: number;
    stopLossPrice?: number;
  }) => {
    try {
      const payload: Record<string, unknown> = {
        stockCode: values.stockCode,
        stockName: values.stockName,
        type: values.type,
        quantity: values.quantity,
      };
      if (values.type === 'buy') {
        if (values.takeProfitPrice !== undefined && values.takeProfitPrice !== null) {
          payload.takeProfitPrice = values.takeProfitPrice;
        }
        if (values.stopLossPrice !== undefined && values.stopLossPrice !== null) {
          payload.stopLossPrice = values.stopLossPrice;
        }
      }
      await client.post('/simulation/trade', payload);
      message.success('交易成功');
      setIsTradeModalVisible(false);
      tradeForm.resetFields();
      setTradeStockOptions([]);
      setTradePrice(null);
      fetchAllData();
    } catch (error) {
      message.error('交易失败');
      console.error('Trade error:', error);
    }
  };

  const formatMoney = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined) return '¥0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '¥0.00';
    return `¥${num.toFixed(2)}`;
  };

  const closeReasonMap: Record<string, { text: string; color: string }> = {
    manual: { text: '手动平仓', color: 'blue' },
    take_profit: { text: '止盈平仓', color: 'green' },
    stop_loss: { text: '止损平仓', color: 'red' },
    agent: { text: 'Agent平仓', color: 'purple' },
  };

  const tradeType = Form.useWatch('type', tradeForm);

  const positionColumns = [
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
      title: '持仓数量（股）',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '平均成本',
      dataIndex: 'avgCost',
      key: 'avgCost',
      render: (value: number) => formatMoney(value),
    },
    {
      title: '当前市值',
      dataIndex: 'marketValue',
      key: 'marketValue',
      render: (value?: number) => (value ? formatMoney(value) : '-'),
    },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      render: (value: number) => (
        <Tag color={value >= 0 ? 'success' : 'error'}>
          {value >= 0 ? '+' : ''}{formatMoney(value)}
        </Tag>
      ),
    },
    {
      title: '止盈价',
      dataIndex: 'takeProfitPrice',
      key: 'takeProfitPrice',
      render: (value?: number) => (value ? formatMoney(value) : '-'),
    },
    {
      title: '止损价',
      dataIndex: 'stopLossPrice',
      key: 'stopLossPrice',
      render: (value?: number) => (value ? formatMoney(value) : '-'),
    },
    {
      title: '来源',
      dataIndex: 'tradeSource',
      key: 'tradeSource',
      width: 100,
      render: (value?: string, record?: SimulationPosition) => {
        if (value === 'strategy' && record?.strategyId) {
          const strategy = strategies.find(s => s.id === record.strategyId);
          return <Tag color="purple">{strategy?.name || '策略'}</Tag>;
        }
        if (value === 'system') return <Tag color="orange">系统</Tag>;
        return <Tag>手动</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: SimulationPosition) => (
        <Popconfirm
          title="确认删除"
          description="确定要删除这条持仓吗？"
          onConfirm={() => handleDeletePosition(record.id)}
          okText="确认"
          cancelText="取消"
        >
          <Button danger icon={<DeleteOutlined />} size="small">
            删除
          </Button>
        </Popconfirm>
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
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'buy' ? 'success' : 'error'}>
          {type === 'buy' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    {
      title: '数量（股）',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (value: number) => formatMoney(value),
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (value: number) => formatMoney(value),
    },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      render: (value?: number) =>
        value !== undefined ? (
          <Tag color={value >= 0 ? 'success' : 'error'}>
            {value >= 0 ? '+' : ''}{formatMoney(value)}
          </Tag>
        ) : '-',
    },
    {
      title: '平仓理由',
      dataIndex: 'closeReason',
      key: 'closeReason',
      render: (value?: string, record?: SimulationTrade) => {
        if (record?.type !== 'sell' || !value) return '-';
        const mapping = closeReasonMap[value];
        if (!mapping) return '-';
        return <Tag color={mapping.color}>{mapping.text}</Tag>;
      },
    },
    {
      title: '来源',
      dataIndex: 'tradeSource',
      key: 'tradeSource',
      width: 100,
      render: (value?: string, record?: SimulationTrade) => {
        if (value === 'strategy' && record?.strategyId) {
          const strategy = strategies.find(s => s.id === record.strategyId);
          return <Tag color="purple">{strategy?.name || '策略'}</Tag>;
        }
        if (value === 'system') return <Tag color="orange">系统</Tag>;
        return <Tag>手动</Tag>;
      },
    },
    {
      title: '时间',
      dataIndex: 'tradeTime',
      key: 'tradeTime',
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
  ];

  if (!account) {
    return (
      <div>
        <Title level={2}>账户模拟</Title>
        <Card>
          <Empty description="加载中..." />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>账户模拟</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="初始资金"
              value={account.initialCapital}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="当前资金"
              value={account.currentCapital}
              precision={2}
              prefix="¥"
              valueStyle={{ color: account.currentCapital >= account.initialCapital ? '#52c41a' : '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="可用现金"
              value={account.availableCash}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总收益率"
              value={account.totalReturn * 100}
              precision={2}
              suffix="%"
              valueStyle={{ color: account.totalReturn >= 0 ? '#52c41a' : '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchAllData} loading={loading}>
            刷新
          </Button>
          <Button icon={<ReloadOutlined />} onClick={refreshPositions} loading={refreshLoading}>
            更新行情
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              balanceForm.setFieldsValue({
                currentCapital: account.currentCapital,
                availableCash: account.availableCash,
              });
              setIsBalanceModalVisible(true);
            }}
          >
            修改余额
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsPositionModalVisible(true)}
          >
            添加持仓
          </Button>
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={() => {
              setTradePrice(null);
              setIsTradeModalVisible(true);
            }}
          >
            模拟交易
          </Button>
        </Space>
      </Card>

      <Card
        tabList={[
          { key: 'positions', tab: <><WalletOutlined /> 持仓</> },
          { key: 'trades', tab: <><HistoryOutlined /> 交易记录</> },
          { key: 'equity-curve', tab: <><LineChartOutlined /> 资金曲线</> },
        ]}
        activeTabKey={activeTab}
        onTabChange={(key) => setActiveTab(key as 'positions' | 'trades' | 'equity-curve')}
      >
        {activeTab === 'positions' && (
          <Table
            columns={positionColumns}
            dataSource={positions}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: '暂无持仓' }}
          />
        )}
        {activeTab === 'trades' && (
          <Table
            columns={tradeColumns}
            dataSource={trades}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
        {activeTab === 'equity-curve' && (
          equityCurveData.length > 0 ? (
            <div ref={chartContainerRef} />
          ) : (
            <Empty description="暂无资金曲线数据" />
          )
        )}
      </Card>

      <Modal
        title="修改余额"
        open={isBalanceModalVisible}
        onCancel={() => setIsBalanceModalVisible(false)}
        onOk={() => balanceForm.submit()}
        width={400}
      >
        <Form form={balanceForm} onFinish={handleUpdateBalance} layout="vertical">
          <Form.Item
            name="currentCapital"
            label="当前资金"
            rules={[{ required: true, message: '请输入当前资金' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={1000}
              precision={2}
              formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>
          <Form.Item
            name="availableCash"
            label="可用现金"
            rules={[{ required: true, message: '请输入可用现金' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={1000}
              precision={2}
              formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加持仓"
        open={isPositionModalVisible}
        onCancel={() => {
          setIsPositionModalVisible(false);
          setPositionStockOptions([]);
        }}
        onOk={() => positionForm.submit()}
        width={400}
      >
        <Form form={positionForm} onFinish={handleAddPosition} layout="vertical">
          <Form.Item
            name="stockCode"
            label="股票代码"
            rules={[{ required: true, message: '请选择股票' }]}
          >
            <Select
              showSearch
              placeholder="输入股票代码或名称搜索"
              filterOption={false}
              onSearch={handlePositionStockSearch}
              onChange={handlePositionStockChange}
              loading={positionSearchLoading}
              options={positionStockOptions}
              allowClear
              notFoundContent={positionSearchLoading ? '搜索中...' : '请输入股票代码或名称搜索'}
            />
          </Form.Item>
          <Form.Item
            name="stockName"
            label="股票名称"
            rules={[{ required: true, message: '请选择股票' }]}
          >
            <Input disabled placeholder="选择股票后自动填充" />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="持仓数量（股）"
            rules={[{ required: true, message: '请输入持仓数量' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} placeholder="请输入股数" />
          </Form.Item>
          <Form.Item
            name="avgCost"
            label="平均成本"
            rules={[{ required: true, message: '请输入平均成本' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              step={0.01}
              precision={2}
              placeholder="请输入平均成本"
            />
          </Form.Item>
          <Form.Item
            name="takeProfitPrice"
            label="止盈价（可选）"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              step={0.01}
              precision={2}
              placeholder="请输入止盈价"
            />
          </Form.Item>
          <Form.Item
            name="stopLossPrice"
            label="止损价（可选）"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              step={0.01}
              precision={2}
              placeholder="请输入止损价"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="模拟交易"
        open={isTradeModalVisible}
        onCancel={() => {
          setIsTradeModalVisible(false);
          setTradeStockOptions([]);
          setTradePrice(null);
        }}
        onOk={() => tradeForm.submit()}
        width={500}
      >
        <Form form={tradeForm} onFinish={handleTrade} layout="vertical">
          <Form.Item
            name="stockCode"
            label="股票代码"
            rules={[{ required: true, message: '请选择股票' }]}
          >
            <Select
              showSearch
              placeholder="输入股票代码或名称搜索"
              filterOption={false}
              onSearch={handleTradeStockSearch}
              onChange={handleTradeStockChange}
              loading={tradeSearchLoading}
              options={tradeStockOptions}
              allowClear
              notFoundContent={tradeSearchLoading ? '搜索中...' : '请输入股票代码或名称搜索'}
            />
          </Form.Item>
          <Form.Item
            name="stockName"
            label="股票名称"
            rules={[{ required: true, message: '请选择股票' }]}
          >
            <Input disabled placeholder="选择股票后自动填充" />
          </Form.Item>
          <Form.Item
            name="type"
            label="交易类型"
            rules={[{ required: true, message: '请选择交易类型' }]}
            initialValue="buy"
          >
            <Select>
              <Option value="buy">买入</Option>
              <Option value="sell">卖出</Option>
            </Select>
          </Form.Item>
          <Form.Item label="当前价格">
            {tradePriceLoading ? (
              <Spin size="small" />
            ) : tradePrice !== null ? (
              <InputNumber
                style={{ width: '100%' }}
                value={tradePrice}
                disabled
                precision={2}
                formatter={(value) => `¥ ${value}`}
              />
            ) : (
              <Text type="secondary">选择股票后自动获取4H行情价格</Text>
            )}
          </Form.Item>
          <Form.Item
            name="quantity"
            label="数量（股）"
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} placeholder="请输入股数" />
          </Form.Item>
          {tradeType === 'buy' && (
            <>
              <Form.Item
                name="takeProfitPrice"
                label="止盈价（可选）"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.01}
                  step={0.01}
                  precision={2}
                  placeholder="请输入止盈价"
                />
              </Form.Item>
              <Form.Item
                name="stopLossPrice"
                label="止损价（可选）"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.01}
                  step={0.01}
                  precision={2}
                  placeholder="请输入止损价"
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default SimulationPage;
