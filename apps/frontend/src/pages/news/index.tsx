import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  Card,
  Button,
  Tag,
  Tooltip,
  Space,
  Select,
  Input,
  Typography,
  message,
  Progress,
  Row,
  Col,
} from 'antd';
import {
  EyeOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'umi';
import client from '@/services/client';
import type { NewsItem, NewsFilter, AnalysisStatus, VectorizedStatus } from '@/services/types';

const { Title } = Typography;
const { Option } = Select;

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

const getVectorizedStatusColor = (status: VectorizedStatus | 'vectorizing'): string => {
  const colorMap: Record<VectorizedStatus | 'vectorizing', string> = {
    pending: 'default',
    vectorizing: 'processing',
    vectorized: 'success',
    failed: 'error',
  };
  return colorMap[status];
};

const getVectorizedStatusText = (status: VectorizedStatus | 'vectorizing'): string => {
  const textMap: Record<VectorizedStatus | 'vectorizing', string> = {
    pending: '待处理',
    vectorizing: '向量化中',
    vectorized: '已向量化',
    failed: '失败',
  };
  return textMap[status];
};

const truncateTitle = (title: string, maxLength: number = 10): string => {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength) + '...';
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const NewsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 从 URL 读取初始参数
  const getInitialPage = () => parseInt(searchParams.get('page') || '1', 10);
  const getInitialPageSize = () => parseInt(searchParams.get('pageSize') || '10', 10);
  const getInitialFilters = (): NewsFilter => ({
    keyword: searchParams.get('keyword') || undefined,
    source: searchParams.get('source') || undefined,
    analysisStatus: (searchParams.get('analysisStatus') as AnalysisStatus) || undefined,
  });

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NewsItem[]>([]);
  const [pagination, setPagination] = useState({
    current: getInitialPage(),
    pageSize: getInitialPageSize(),
    total: 0,
  });
  const [filters, setFilters] = useState<NewsFilter>(getInitialFilters());
  const [vectorizeProgress, setVectorizeProgress] = useState({
    pending: 0,
    vectorizing: 0,
    vectorized: 0,
    failed: 0,
    total: 0,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 更新 URL 参数
  const updateUrlParams = useCallback((page: number, pageSize: number, currentFilters: NewsFilter) => {
    const params: Record<string, string> = {
      page: page.toString(),
      pageSize: pageSize.toString(),
    };
    if (currentFilters.keyword) params.keyword = currentFilters.keyword;
    if (currentFilters.source) params.source = currentFilters.source;
    if (currentFilters.analysisStatus) params.analysisStatus = currentFilters.analysisStatus;
    setSearchParams(params);
  }, [setSearchParams]);

  const fetchData = useCallback(async (page?: number, pageSize?: number, currentFilters?: NewsFilter) => {
    const targetPage = page ?? pagination.current;
    const targetPageSize = pageSize ?? pagination.pageSize;
    const targetFilters = currentFilters ?? filters;

    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page: targetPage,
        pageSize: targetPageSize,
      };

      if (targetFilters.source) {
        params.source = targetFilters.source;
      }
      if (targetFilters.analysisStatus) {
        params.analyzeStatus = targetFilters.analysisStatus;
      }
      if (targetFilters.keyword) {
        params.keyword = targetFilters.keyword;
      }

      const response = await client.get('/news', { params });
      const responseData = response;

      // 转换后端数据格式到前端格式
      const newsList: NewsItem[] = (responseData.data || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        source: item.source,
        url: item.originalUrl,
        analysisStatus: item.analyzeStatus,
        vectorizedStatus: item.vectorizeStatus,
        eventCount: item.eventCount || 0,
        publishedAt: item.publishTime,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      setData(newsList);
      const newTotal = responseData.total ?? newsList.length;
      setPagination({
        current: targetPage,
        pageSize: targetPageSize,
        total: newTotal,
      });

      // 更新 URL 参数
      updateUrlParams(targetPage, targetPageSize, targetFilters);
    } catch (error) {
      message.error('获取新闻列表失败');
      console.error('Fetch news error:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters, updateUrlParams]);

  const fetchVectorizeProgress = async () => {
    try {
      const response = await client.get('/news/vectorize-progress');
      const { pending, vectorizing, vectorized, failed } = response.data;
      setVectorizeProgress({
        pending,
        vectorizing,
        vectorized,
        failed,
        total: pending + vectorizing + vectorized + failed,
      });
    } catch (error) {
      console.error('Fetch vectorize progress error:', error);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchData();
    fetchVectorizeProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 5秒轮询刷新 - 使用当前的 pagination 和 filters
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(pagination.current, pagination.pageSize, filters);
      fetchVectorizeProgress();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchData, pagination.current, pagination.pageSize, filters]);

  const handleView = (id: string) => {
    navigate(`/news/${id}`);
  };

  const handleAnalyze = async (newsId: string) => {
    try {
      await client.post(`/news/${newsId}/analyze`);
      message.success(`新闻 ${newsId} 分析任务已提交`);
      fetchData();
    } catch {
      message.error('分析失败');
    }
  };

  const handleVectorize = async (newsId: string) => {
    try {
      await client.post(`/news/${newsId}/vectorize`);
      message.success(`新闻 ${newsId} 向量化任务已提交`);
      fetchData();
      fetchVectorizeProgress();
    } catch {
      message.error('向量化失败');
    }
  };

  const handleBatchVectorize = async () => {
    try {
      const response = await client.post('/news/batch-vectorize');
      message.success(`批量向量化任务已启动，共 ${response.count} 条新闻`);
      fetchData();
      fetchVectorizeProgress();
    } catch {
      message.error('批量向量化失败');
    }
  };

  const handleRefresh = () => {
    fetchData();
    fetchVectorizeProgress();
  };

  const handleFilterChange = (key: keyof NewsFilter, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    if (key === 'keyword') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        fetchData(1, pagination.pageSize, newFilters);
      }, 500);
    } else {
      fetchData(1, pagination.pageSize, newFilters);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 处理分页变化
  const handlePageChange = (page: number, pageSize?: number) => {
    const newPageSize = pageSize || pagination.pageSize;
    fetchData(page, newPageSize);
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 180,
      render: (title: string) => (
        <Tooltip title={title} placement="topLeft">
          <span style={{ cursor: 'pointer' }}>{truncateTitle(title, 8)}</span>
        </Tooltip>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
    },
    {
      title: '分析状态',
      dataIndex: 'analysisStatus',
      key: 'analysisStatus',
      width: 100,
      render: (status: AnalysisStatus) => (
        <Tag color={getAnalysisStatusColor(status)}>{getAnalysisStatusText(status)}</Tag>
      ),
    },
    {
      title: '向量化状态',
      dataIndex: 'vectorizedStatus',
      key: 'vectorizedStatus',
      width: 100,
      render: (status: VectorizedStatus | 'vectorizing') => (
        <Tag color={getVectorizedStatusColor(status)}>{getVectorizedStatusText(status)}</Tag>
      ),
    },
    {
      title: '关联事件',
      dataIndex: 'eventCount',
      key: 'eventCount',
      width: 100,
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>
          {count} 个
        </Tag>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      width: 160,
      render: (date: string) => formatDate(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: unknown, record: NewsItem) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="primary"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleView(record.id)}
            >
              查看
            </Button>
          </Tooltip>
          <Tooltip title="分析">
            <Button
              icon={<PlayCircleOutlined />}
              size="small"
              disabled={record.analysisStatus === 'analyzing'}
              onClick={() => handleAnalyze(record.id)}
            >
              分析
            </Button>
          </Tooltip>
          <Tooltip title="向量化">
            <Button
              icon={<DatabaseOutlined />}
              size="small"
              disabled={record.vectorizedStatus === 'vectorizing' || record.vectorizedStatus === 'vectorized'}
              onClick={() => handleVectorize(record.id)}
            >
              向量化
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const uniqueSources = Array.from(new Set(data.map((item) => item.source)));

  const vectorizePercent = vectorizeProgress.total > 0
    ? Math.round((vectorizeProgress.vectorized / vectorizeProgress.total) * 100)
    : 0;

  return (
    <div>
      <Title level={2}>新闻管理</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="向量化进度" size="small">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} lg={12} xl={14}>
                <Progress
                  percent={vectorizePercent}
                  status={vectorizeProgress.vectorizing > 0 ? 'active' : 'normal'}
                  format={() => `${vectorizeProgress.vectorized}/${vectorizeProgress.total}`}
                />
              </Col>
              <Col xs={24} lg={12} xl={10}>
                <Space size="small" wrap style={{ width: '100%' }}>
                  <Tag>待处理: {vectorizeProgress.pending}</Tag>
                  <Tag color="processing">向量化中: {vectorizeProgress.vectorizing}</Tag>
                  <Tag color="success">已完成: {vectorizeProgress.vectorized}</Tag>
                  <Tag color="error">失败: {vectorizeProgress.failed}</Tag>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Space size="middle" wrap>
          <Input
            placeholder="搜索标题"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={filters.keyword || ''}
            onChange={(e) => handleFilterChange('keyword', e.target.value || undefined)}
            allowClear
          />
          <Select
            placeholder="选择来源"
            style={{ width: 150 }}
            allowClear
            value={filters.source}
            onChange={(value) => handleFilterChange('source', value)}
          >
            {uniqueSources.map((source) => (
              <Option key={source} value={source}>
                {source}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="分析状态"
            style={{ width: 150 }}
            allowClear
            value={filters.analysisStatus}
            onChange={(value) => handleFilterChange('analysisStatus', value)}
          >
            <Option value="pending">待分析</Option>
            <Option value="analyzing">分析中</Option>
            <Option value="analyzed">已分析</Option>
            <Option value="failed">失败</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<DatabaseOutlined />}
            onClick={handleBatchVectorize}
            disabled={vectorizeProgress.pending === 0}
          >
            一键向量化 ({vectorizeProgress.pending})
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
          }}
          scroll={{ x: 1200 }}
          style={{ zIndex: 1 }}
        />
      </Card>
    </div>
  );
};

export default NewsListPage;
