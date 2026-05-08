import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Typography,
  Progress,
  Tooltip,
  Popconfirm,
  message,
} from 'antd';
import {
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, history } from 'umi';
import client from '@/services/client';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface Signal {
  id: string;
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

interface SignalsResponse {
  data: Signal[];
  total: number;
  page: number;
  pageSize: number;
}

const SignalsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Signal[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [stockCode, setStockCode] = useState('');
  const [direction, setDirection] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  const initializedRef = useRef(false);

  const getUrlParams = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      page: parseInt(searchParams.get('page') || '1', 10),
      size: parseInt(searchParams.get('pageSize') || '10', 10),
      stock: searchParams.get('stockCode') || '',
      dir: searchParams.get('direction') || undefined,
      startTime: searchParams.get('startTime'),
      endTime: searchParams.get('endTime'),
    };
  }, [location.search]);

  const updateUrlParams = useCallback((params: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 0 && value !== 100) {
        searchParams.set(key, String(value));
      }
    });
    const newSearch = searchParams.toString();
    if (newSearch !== location.search.slice(1)) {
      history.replace({ pathname: location.pathname, search: newSearch ? `?${newSearch}` : '' });
    }
  }, [location.pathname, location.search]);

  const fetchSignals = useCallback(async (page: number, size: number, filters?: {
    stockCode?: string;
    direction?: string;
    startTime?: string;
    endTime?: string;
  }) => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        pageSize: size,
      };

      const stock = filters?.stockCode ?? stockCode;
      const dir = filters?.direction ?? direction;
      const start = filters?.startTime ?? (dateRange?.[0] ? (dateRange[0].toISOString ? dateRange[0].toISOString() : dateRange[0]) : undefined);
      const end = filters?.endTime ?? (dateRange?.[1] ? (dateRange[1].toISOString ? dateRange[1].toISOString() : dateRange[1]) : undefined);

      if (stock) params.stockCode = stock;
      if (dir) params.direction = dir;
      if (start) params.startTime = start;
      if (end) params.endTime = end;

      const response = await client.get<SignalsResponse>('/signals', { params });
      setData(response.data);
      setTotal(response.total);
      setCurrent(page);
      setPageSize(size);
    } catch (error) {
      console.error('获取信号列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [stockCode, direction, dateRange]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const params = getUrlParams();
      setCurrent(params.page);
      setPageSize(params.size);
      setStockCode(params.stock);
      setDirection(params.dir);
      if (params.startTime && params.endTime) {
        setDateRange([params.startTime, params.endTime] as [any, any]);
      }
      fetchSignals(params.page, params.size, {
        stockCode: params.stock,
        direction: params.dir,
        startTime: params.startTime || undefined,
        endTime: params.endTime || undefined,
      });
    }
  }, [getUrlParams, fetchSignals]);

  useEffect(() => {
    if (!initializedRef.current) return;
    const interval = setInterval(() => {
      const params = getUrlParams();
      fetchSignals(params.page, params.size, {
        stockCode: params.stock,
        direction: params.dir,
        startTime: params.startTime || undefined,
        endTime: params.endTime || undefined,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [getUrlParams, fetchSignals]);

  const handleSearch = () => {
    const params: Record<string, any> = {
      page: 1,
      pageSize,
    };
    if (stockCode) params.stockCode = stockCode;
    if (direction) params.direction = direction;
    if (dateRange?.[0]) params.startTime = dateRange[0].toISOString ? dateRange[0].toISOString() : dateRange[0];
    if (dateRange?.[1]) params.endTime = dateRange[1].toISOString ? dateRange[1].toISOString() : dateRange[1];
    updateUrlParams(params);
    fetchSignals(1, pageSize);
  };

  const handleReset = () => {
    setStockCode('');
    setDirection(undefined);
    setDateRange(null);
    history.replace({ pathname: location.pathname });
    fetchSignals(1, 20, { stockCode: '', direction: undefined });
  };

  const handleViewDetail = (id: string) => {
    navigate(`/signals/${id}`);
  };

  const handleDelete = async (id: string) => {
    try {
      await client.delete(`/signals/${id}`);
      message.success('信号已删除');
      fetchSignals(current, pageSize);
    } catch (error) {
      message.error('删除信号失败');
      console.error('Delete signal error:', error);
    }
  };

  const getActionTag = (action?: string, direction?: string) => {
    const effectiveAction = action || (direction === 'bullish' ? 'long' : direction === 'bearish' ? 'short' : 'hold');
    
    switch (effectiveAction) {
      case 'long':
        return (
          <Tag color="success" icon={<ArrowUpOutlined />}>
            做多
          </Tag>
        );
      case 'short':
        return (
          <Tag color="error" icon={<ArrowDownOutlined />}>
            做空
          </Tag>
        );
      default:
        return (
          <Tag color="default" icon={<MinusOutlined />}>
            观望
          </Tag>
        );
    }
  };

  const getScoreProgress = (score?: string, confidence?: number) => {
    const scoreValue = score ? parseFloat(score) : (confidence ? confidence / 100 : 0);
    const percent = Math.round(Math.abs(scoreValue) * 100);
    let status: 'success' | 'normal' | 'exception' = 'normal';
    
    if (scoreValue > 0) {
      status = scoreValue >= 0.7 ? 'success' : 'normal';
    } else if (scoreValue < 0) {
      status = scoreValue <= -0.7 ? 'exception' : 'normal';
    }
    
    return (
      <Tooltip title={`${scoreValue.toFixed(3)}`}>
        <Progress
          percent={percent}
          size="small"
          status={status}
          style={{ width: 80 }}
          showInfo={false}
        />
      </Tooltip>
    );
  };

  const columns = [
    {
      title: '标的代码',
      key: 'symbol',
      width: 120,
      render: (_: any, record: Signal) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 'bold' }}>{record.symbol || record.stockCode || '-'}</span>
          <span style={{ fontSize: 12, color: '#999' }}>{record.stockName || ''}</span>
        </Space>
      ),
    },
    {
      title: '动作',
      key: 'action',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: Signal) => getActionTag(record.action, record.direction),
    },
    {
      title: '分数',
      key: 'score',
      width: 150,
      align: 'center' as const,
      sorter: (a: Signal, b: Signal) => {
        const scoreA = a.score ? parseFloat(a.score) : (a.confidence ? a.confidence / 100 : 0);
        const scoreB = b.score ? parseFloat(b.score) : (b.confidence ? b.confidence / 100 : 0);
        return scoreA - scoreB;
      },
      render: (_: any, record: Signal) => (
        <Space>
          {getScoreProgress(record.score, record.confidence)}
          <span>{record.score ? parseFloat(record.score).toFixed(2) : (record.confidence ? `${record.confidence}%` : '-')}</span>
        </Space>
      ),
    },
    {
      title: '生成时间',
      key: 'generatedAt',
      width: 200,
      sorter: (a: Signal, b: Signal) => {
        const timeA = a.generatedAt || a.signalTime || a.createdAt;
        const timeB = b.generatedAt || b.signalTime || b.createdAt;
        return new Date(timeA).getTime() - new Date(timeB).getTime();
      },
      render: (_: any, record: Signal) => {
        const time = record.generatedAt || record.signalTime || record.createdAt;
        return new Date(time).toLocaleString('zh-CN');
      },
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason?: string, record?: Signal) => reason || record?.reasoning || '-',
    },
    {
      title: '来源事件',
      dataIndex: 'eventId',
      key: 'eventId',
      width: 140,
      render: (eventId?: string) => eventId ? (
        <Tooltip title={eventId}>
          <Tag color="blue">{eventId.substring(0, 8)}...</Tag>
        </Tooltip>
      ) : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: any, record: Signal) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.id)}
          >
            查看
          </Button>
          <Popconfirm
            title="确定要删除这个信号吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>信号管理</Title>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="股票代码"
              value={stockCode}
              onChange={(e) => setStockCode(e.target.value)}
              allowClear
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="方向"
              value={direction}
              onChange={setDirection}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="bullish">买入</Option>
              <Option value="bearish">卖出</Option>
              <Option value="neutral">中性</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [any, any])}
              style={{ width: '100%' }}
              placeholder={['开始时间', '结束时间']}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Space wrap>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, size) => {
              const newSize = size || pageSize;
              setPageSize(newSize);
              const params: Record<string, any> = {
                page,
                pageSize: newSize,
              };
              if (stockCode) params.stockCode = stockCode;
              if (direction) params.direction = direction;
              if (dateRange?.[0]) params.startTime = dateRange[0].toISOString ? dateRange[0].toISOString() : dateRange[0];
              if (dateRange?.[1]) params.endTime = dateRange[1].toISOString ? dateRange[1].toISOString() : dateRange[1];
              updateUrlParams(params);
              fetchSignals(page, newSize);
            },
          }}
          scroll={{ x: 1000 }}
          style={{ zIndex: 1 }}
        />
      </Card>
    </div>
  );
};

export default SignalsPage;
