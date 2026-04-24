import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Row,
  Col,
  Typography,
  Progress,
  Tooltip,
} from 'antd';
import {
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, history } from 'umi';
import { eventsApi } from '@/services/events';
import type { EventItem, EventCategory } from '@/services/types';

const { Title } = Typography;
const { Option } = Select;

const categoryColorMap: Record<EventCategory, string> = {
  macro: 'blue',
  policy: 'purple',
  company: 'green',
  market: 'orange',
  sentiment: 'cyan',
};

const categoryLabelMap: Record<EventCategory, string> = {
  macro: '宏观',
  policy: '政策',
  company: '公司',
  market: '市场',
  sentiment: '情绪',
};

const getCategoryTag = (category: EventCategory) => (
  <Tag color={categoryColorMap[category]}>{categoryLabelMap[category]}</Tag>
);

const getSentimentDirectionTag = (direction: number) => {
  if (direction === 1) {
    return (
      <Tag color="success" icon={<ArrowUpOutlined />}>
        利好
      </Tag>
    );
  }
  if (direction === -1) {
    return (
      <Tag color="error" icon={<ArrowDownOutlined />}>
        利空
      </Tag>
    );
  }
  return (
    <Tag color="default" icon={<MinusOutlined />}>
      中性
    </Tag>
  );
};

const getImportanceProgress = (score: number) => {
  const percent = Math.round(score * 100);
  let status: 'success' | 'normal' | 'exception' = 'normal';
  if (score >= 0.7) status = 'success';
  else if (score >= 0.4) status = 'normal';
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
};

const getProcessedTag = (processed: boolean) =>
  processed ? <Tag color="success">已处理</Tag> : <Tag color="warning">未处理</Tag>;

const renderSubjects = (subjects: EventItem['subjects']) => {
  if (!subjects || subjects.length === 0) return '-';
  return (
    <Space size={4} wrap>
      {subjects.slice(0, 3).map((s, index) => (
        <Tag key={index}>{s.code}</Tag>
      ))}
      {subjects.length > 3 && (
        <Tooltip title={subjects.slice(3).map((s) => s.code).join(', ')}>
          <Tag>+{subjects.length - 3}</Tag>
        </Tooltip>
      )}
    </Space>
  );
};

const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [category, setCategory] = useState<EventCategory | undefined>(undefined);
  const [sentimentDirection, setSentimentDirection] = useState<number | undefined>(undefined);
  const [processed, setProcessed] = useState<boolean | undefined>(undefined);

  const initializedRef = useRef(false);

  const getUrlParams = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      page: parseInt(searchParams.get('page') || '1', 10),
      size: parseInt(searchParams.get('pageSize') || '10', 10),
      cat: searchParams.get('category') as EventCategory | undefined,
      sentDir: searchParams.get('sentimentDirection'),
      proc: searchParams.get('processed'),
    };
  }, [location.search]);

  const updateUrlParams = useCallback((params: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    const newSearch = searchParams.toString();
    if (newSearch !== location.search.slice(1)) {
      history.replace({ pathname: location.pathname, search: newSearch ? `?${newSearch}` : '' });
    }
  }, [location.pathname, location.search]);

  const fetchEvents = useCallback(async (page: number, size: number, filters?: {
    category?: EventCategory;
    sentimentDirection?: number;
    processed?: boolean;
  }) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize: size,
      };
      const cat = filters?.category ?? category;
      const sentDir = filters?.sentimentDirection ?? sentimentDirection;
      const proc = filters?.processed ?? processed;

      if (cat) params.category = cat;
      if (sentDir !== undefined) params.sentimentDirection = sentDir;
      if (proc !== undefined) params.processed = proc;

      const response = await eventsApi.getEventsList(params as any);
      setData(response.data);
      setTotal(response.total);
      setCurrent(page);
      setPageSize(size);
    } catch (error) {
      console.error('获取事件列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [category, sentimentDirection, processed]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const params = getUrlParams();
      setCurrent(params.page);
      setPageSize(params.size);
      setCategory(params.cat || undefined);
      setSentimentDirection(params.sentDir ? parseInt(params.sentDir, 10) : undefined);
      setProcessed(params.proc ? params.proc === 'true' : undefined);
      fetchEvents(params.page, params.size, {
        category: params.cat || undefined,
        sentimentDirection: params.sentDir ? parseInt(params.sentDir, 10) : undefined,
        processed: params.proc ? params.proc === 'true' : undefined,
      });
    }
  }, [getUrlParams, fetchEvents]);

  useEffect(() => {
    if (!initializedRef.current) return;
    const interval = setInterval(() => {
      const params = getUrlParams();
      fetchEvents(params.page, params.size, {
        category: params.cat || undefined,
        sentimentDirection: params.sentDir ? parseInt(params.sentDir, 10) : undefined,
        processed: params.proc ? params.proc === 'true' : undefined,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [getUrlParams, fetchEvents]);

  const handleSearch = () => {
    const params: Record<string, any> = {
      page: 1,
      pageSize,
    };
    if (category) params.category = category;
    if (sentimentDirection !== undefined) params.sentimentDirection = sentimentDirection;
    if (processed !== undefined) params.processed = processed;
    updateUrlParams(params);
    fetchEvents(1, pageSize);
  };

  const handleReset = () => {
    setCategory(undefined);
    setSentimentDirection(undefined);
    setProcessed(undefined);
    history.replace({ pathname: location.pathname });
    fetchEvents(1, 10, { category: undefined, sentimentDirection: undefined, processed: undefined });
  };

  const handleViewDetail = (id: string) => {
    navigate(`/events/${id}`);
  };

  const columns = [
    {
      title: '分类',
      dataIndex: 'categoryName',
      key: 'category',
      width: 100,
      align: 'center' as const,
      render: (name: string, record: EventItem) => (
        <Tag color={categoryColorMap[record.category]}>{name}</Tag>
      ),
    },
    {
      title: '子分类',
      dataIndex: 'subcategoryName',
      key: 'subcategory',
      width: 120,
      ellipsis: true,
    },
    {
      title: '情绪方向',
      dataIndex: 'sentimentDirection',
      key: 'sentimentDirection',
      width: 90,
      align: 'center' as const,
      render: (dir: number) => getSentimentDirectionTag(dir),
    },
    {
      title: '重要性',
      dataIndex: 'importanceScore',
      key: 'importanceScore',
      width: 120,
      align: 'center' as const,
      sorter: (a: EventItem, b: EventItem) => a.importanceScore - b.importanceScore,
      render: (score: number) => (
        <Space>
          {getImportanceProgress(score)}
          <span>{Math.round(score * 100)}%</span>
        </Space>
      ),
    },
    {
      title: '关联标的',
      dataIndex: 'subjects',
      key: 'subjects',
      width: 150,
      render: (subjects: EventItem['subjects']) => renderSubjects(subjects),
    },
    {
      title: '发生时间',
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      width: 170,
      sorter: (a: EventItem, b: EventItem) =>
        new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '处理状态',
      dataIndex: 'processed',
      key: 'processed',
      width: 90,
      align: 'center' as const,
      render: (val: boolean) => getProcessedTag(val),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: unknown, record: EventItem) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record.id)}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>事件管理</Title>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="分类"
              value={category}
              onChange={setCategory}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="macro">宏观</Option>
              <Option value="policy">政策</Option>
              <Option value="company">公司</Option>
              <Option value="market">市场</Option>
              <Option value="sentiment">情绪</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="情绪方向"
              value={sentimentDirection}
              onChange={setSentimentDirection}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value={-1}>利空</Option>
              <Option value={0}>中性</Option>
              <Option value={1}>利好</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="处理状态"
              value={processed}
              onChange={setProcessed}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value={true}>已处理</Option>
              <Option value={false}>未处理</Option>
            </Select>
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
              if (category) params.category = category;
              if (sentimentDirection !== undefined) params.sentimentDirection = sentimentDirection;
              if (processed !== undefined) params.processed = processed;
              updateUrlParams(params);
              fetchEvents(page, newSize);
            },
          }}
          scroll={{ x: 1000 }}
          style={{ zIndex: 1 }}
        />
      </Card>
    </div>
  );
};

export default EventsPage;
