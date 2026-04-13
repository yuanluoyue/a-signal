import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Slider,
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
import { useNavigate } from 'umi';
import client from '@/services/client';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface Signal {
  id: string;
  stockCode: string;
  stockName: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  reasoning: string;
  keyFactors: string[];
  timeWindow: string;
  signalTime: string;
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
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Signal[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 筛选条件
  const [stockCode, setStockCode] = useState('');
  const [direction, setDirection] = useState<string | undefined>(undefined);
  const [confidenceRange, setConfidenceRange] = useState<[number, number]>([0, 100]);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  const fetchSignals = async (page = 1, size = 20) => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        pageSize: size,
      };

      if (stockCode) params.stockCode = stockCode;
      if (direction) params.direction = direction;
      if (confidenceRange[0] > 0) params.minConfidence = confidenceRange[0];
      if (confidenceRange[1] < 100) params.maxConfidence = confidenceRange[1];
      if (dateRange?.[0]) params.startTime = dateRange[0].toISOString ? dateRange[0].toISOString() : dateRange[0];
      if (dateRange?.[1]) params.endTime = dateRange[1].toISOString ? dateRange[1].toISOString() : dateRange[1];

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
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  // 5秒轮询刷新
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSignals();
    }, 5000);
    return () => clearInterval(interval);
  }, [stockCode, direction, confidenceRange, dateRange]);

  const handleSearch = () => {
    fetchSignals(1, pageSize);
  };

  const handleReset = () => {
    setStockCode('');
    setDirection(undefined);
    setConfidenceRange([0, 100]);
    setDateRange(null);
    fetchSignals(1, pageSize);
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

  const getDirectionTag = (direction: string) => {
    switch (direction) {
      case 'bullish':
        return (
          <Tag color="success" icon={<ArrowUpOutlined />}>
            买入
          </Tag>
        );
      case 'bearish':
        return (
          <Tag color="error" icon={<ArrowDownOutlined />}>
            卖出
          </Tag>
        );
      default:
        return (
          <Tag color="default" icon={<MinusOutlined />}>
            中性
          </Tag>
        );
    }
  };

  const getSentimentTag = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Tag color="success">积极</Tag>;
      case 'negative':
        return <Tag color="error">消极</Tag>;
      default:
        return <Tag color="default">中性</Tag>;
    }
  };

  const getConfidenceProgress = (confidence: number) => {
    let status: 'success' | 'normal' | 'exception' = 'normal';
    if (confidence >= 80) status = 'success';
    else if (confidence >= 60) status = 'normal';
    else status = 'exception';

    return (
      <Tooltip title={`${confidence}%`}>
        <Progress
          percent={confidence}
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
      title: '股票代码',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 100,
      render: (code: string, record: Signal) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 'bold' }}>{code}</span>
          <span style={{ fontSize: 12, color: '#999' }}>{record.stockName}</span>
        </Space>
      ),
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 100,
      align: 'center' as const,
      render: (direction: string) => getDirectionTag(direction),
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 120,
      align: 'center' as const,
      sorter: (a: Signal, b: Signal) => a.confidence - b.confidence,
      render: (confidence: number) => (
        <Space>
          {getConfidenceProgress(confidence)}
          <span>{confidence}%</span>
        </Space>
      ),
    },
    {
      title: '情绪',
      dataIndex: 'sentiment',
      key: 'sentiment',
      width: 80,
      align: 'center' as const,
      render: (sentiment: string) => getSentimentTag(sentiment),
    },
    {
      title: '时间窗口',
      dataIndex: 'timeWindow',
      key: 'timeWindow',
      width: 100,
      align: 'center' as const,
    },
    {
      title: '信号时间',
      dataIndex: 'signalTime',
      key: 'signalTime',
      width: 180,
      sorter: (a: Signal, b: Signal) =>
        new Date(a.signalTime).getTime() - new Date(b.signalTime).getTime(),
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '关键因子',
      dataIndex: 'keyFactors',
      key: 'keyFactors',
      ellipsis: true,
      render: (factors: string[]) => (
        <Space size={4} wrap>
          {factors?.slice(0, 3).map((factor, index) => (
            <Tag key={index}>{factor}</Tag>
          ))}
          {factors?.length > 3 && (
            <Tooltip title={factors.slice(3).join(', ')}>
              <Tag>+{factors.length - 3}</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
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
            title="确认删除"
            description="确定要删除这个信号吗？此操作不可恢复。"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              size="small"
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
          <Col xs={24} sm={12} md={8} lg={5}>
            <Input
              placeholder="股票代码"
              value={stockCode}
              onChange={(e) => setStockCode(e.target.value)}
              allowClear
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
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
          <Col xs={24} sm={12} md={8} lg={5}>
            <div style={{ padding: '0 8px' }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                置信度: {confidenceRange[0]}% - {confidenceRange[1]}%
              </div>
              <Slider
                range
                value={confidenceRange}
                onChange={(value) => setConfidenceRange(value as [number, number])}
                min={0}
                max={100}
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [any, any])}
              style={{ width: '100%' }}
              placeholder={['开始时间', '结束时间']}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
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
