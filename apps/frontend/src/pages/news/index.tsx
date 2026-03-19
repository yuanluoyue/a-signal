import React, { useState, useEffect } from 'react';
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
  Popconfirm,
} from 'antd';
import {
  EyeOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'umi';
import api from '@/services/api';
import type { NewsItem, NewsFilter, AnalysisStatus, VectorizedStatus } from '@/types/news';

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
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NewsItem[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState<NewsFilter>({});

  const fetchData = async (page?: number, pageSize?: number) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page: page ?? pagination.current,
        pageSize: pageSize ?? pagination.pageSize,
      };

      if (filters.source) {
        params.source = filters.source;
      }
      if (filters.analysisStatus) {
        params.analyzeStatus = filters.analysisStatus;
      }
      if (filters.keyword) {
        params.keyword = filters.keyword;
      }

      const response = await api.get('/news', { params });
      console.log('[NewsList] Raw response:', response);
      
      // API 拦截器已经处理了响应，response 直接是 {data, total, page, pageSize}
      const responseData = response;
      console.log('[NewsList] Response data:', responseData);
      console.log('[NewsList] Total:', responseData?.total, 'Data length:', responseData?.data?.length);
      console.log('[NewsList] Response keys:', Object.keys(responseData || {}));

      // 转换后端数据格式到前端格式
      const newsList: NewsItem[] = (responseData.data || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        source: item.source,
        url: item.originalUrl,
        analysisStatus: item.analyzeStatus,
        vectorizedStatus: item.vectorizeStatus,
        relatedStocks: item.relatedStocks || [],
        publishedAt: item.publishTime,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      setData(newsList);
      const newTotal = responseData.total ?? newsList.length;
      console.log('[NewsList] Setting pagination total:', newTotal);
      setPagination((prev) => ({
        ...prev,
        current: page ?? prev.current,
        pageSize: pageSize ?? prev.pageSize,
        total: newTotal,
      }));
    } catch (error) {
      message.error('获取新闻列表失败');
      console.error('Fetch news error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // 5秒轮询刷新
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleView = (id: string) => {
    navigate(`/news/${id}`);
  };

  const handleAnalyze = async (newsId: string) => {
    try {
      await api.post(`/news/${newsId}/analyze`);
      message.success(`新闻 ${newsId} 分析任务已提交`);
      fetchData();
    } catch {
      message.error('分析失败');
    }
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/news/${id}`);
      message.success('新闻已删除');
      fetchData();
    } catch (error) {
      message.error('删除新闻失败');
      console.error('Delete news error:', error);
    }
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      render: (title: string) => (
        <Tooltip title={title} placement="topLeft">
          <span style={{ cursor: 'pointer' }}>{truncateTitle(title, 10)}</span>
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
      render: (status: VectorizedStatus) => (
        <Tag color={getVectorizedStatusColor(status)}>{getVectorizedStatusText(status)}</Tag>
      ),
    },
    {
      title: '关联股票',
      dataIndex: 'relatedStocks',
      key: 'relatedStocks',
      width: 150,
      render: (stocks: string[]) => (
        <Space size="small" wrap>
          {stocks.map((stock) => (
            <Tag key={stock} color="blue">
              {stock}
            </Tag>
          ))}
        </Space>
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
      width: 150,
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
          <Popconfirm
            title="确认删除"
            description="确定要删除这条新闻吗？此操作不可恢复。"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const uniqueSources = Array.from(new Set(data.map((item) => item.source)));

  return (
    <div>
      <Title level={2}>新闻管理</Title>

      <Card style={{ marginBottom: 24 }}>
        <Space size="middle" wrap>
          <Input
            placeholder="搜索标题"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
            allowClear
          />
          <Select
            placeholder="选择来源"
            style={{ width: 150 }}
            allowClear
            onChange={(value) => setFilters((prev) => ({ ...prev, source: value }))}
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
            onChange={(value) => setFilters((prev) => ({ ...prev, analysisStatus: value }))}
          >
            <Option value="pending">待分析</Option>
            <Option value="analyzing">分析中</Option>
            <Option value="analyzed">已分析</Option>
            <Option value="failed">失败</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
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
            onChange: (page, pageSize) => {
              fetchData(page, pageSize);
            },
          }}
          scroll={{ x: 1200 }}
          style={{ zIndex: 1 }}
        />
      </Card>
    </div>
  );
};

export default NewsListPage;
