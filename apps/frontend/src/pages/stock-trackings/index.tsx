import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Card,
  Button,
  Tag,
  Typography,
  Space,
  Input,
  message,
  Modal,
  Form,
  Popconfirm,
  Select,
} from 'antd';
import { EyeOutlined, PlusOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'umi';
import client from '@/services/client';

const { Title } = Typography;

interface StockTracking {
  id: string;
  stockCode: string;
  stockName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalNews: number;
  createdAt: string;
}

interface StockOption {
  value: string;
  label: string;
  code: string;
  name: string;
}

const StockTrackingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StockTracking[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [stockOptions, setStockOptions] = useState<StockOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async (page?: number, pageSize?: number) => {
    setLoading(true);
    try {
      const response = await client.get('/stock-trackings');
      const trackingList: StockTracking[] = response.data || [];
      setData(trackingList);
      setPagination((prev) => ({
        ...prev,
        current: page ?? prev.current,
        pageSize: pageSize ?? prev.pageSize,
        total: trackingList.length,
      }));
    } catch (error) {
      message.error('获取股票追踪列表失败');
      console.error('Fetch stock trackings error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const searchStocks = async (keyword: string) => {
    if (!keyword || keyword.trim().length === 0) {
      setStockOptions([]);
      return;
    }
    setSearchLoading(true);
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
      setStockOptions(options);
    } catch (error) {
      console.error('Search stocks error:', error);
      setStockOptions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleStockSearch = (value: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      searchStocks(value);
    }, 300);
  };

  const handleStockChange = (value: string) => {
    const selectedOption = stockOptions.find(opt => opt.value === value);
    if (selectedOption) {
      form.setFieldsValue({
        stockCode: selectedOption.code,
        stockName: selectedOption.name,
      });
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleView = (id: string) => {
    navigate(`/stock-trackings/${id}`);
  };

  const handleCreate = async (values: { stockCode: string; stockName: string }) => {
    try {
      await client.post('/stock-trackings', values);
      message.success('创建成功');
      setIsModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error('创建失败');
      console.error('Create stock tracking error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await client.delete(`/stock-trackings/${id}`);
      message.success('删除成功');
      fetchData();
    } catch (error) {
      message.error('删除失败');
      console.error('Delete stock tracking error:', error);
    }
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
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns = [
    {
      title: '股票代码',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 120,
    },
    {
      title: '股票名称',
      dataIndex: 'stockName',
      key: 'stockName',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '新闻数量',
      dataIndex: 'totalNews',
      key: 'totalNews',
      width: 100,
      render: (count: number) => (
        <Tag color="blue">{count} 条</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (time: string) => formatDate(time),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: StockTracking) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleView(record.id)}
          >
            查看
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除 ${record.stockName}(${record.stockCode}) 的追踪记录吗？这将同时删除关联的新闻和信号数据。`}
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
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

  return (
    <div>
      <Title level={2}>股票追踪</Title>

      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchData()}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
          >
            新增追踪
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
          scroll={{ x: 800 }}
        />
      </Card>

      <Modal
        title="新增股票追踪"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setStockOptions([]);
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item
            name="stockCode"
            label="股票代码"
            rules={[{ required: true, message: '请选择股票' }]}
          >
            <Select
              showSearch
              placeholder="输入股票代码或名称搜索"
              filterOption={false}
              onSearch={handleStockSearch}
              onChange={handleStockChange}
              loading={searchLoading}
              options={stockOptions}
              allowClear
              notFoundContent={searchLoading ? '搜索中...' : '请输入股票代码或名称搜索'}
            />
          </Form.Item>
          <Form.Item
            name="stockName"
            label="股票名称"
            rules={[{ required: true, message: '请选择股票' }]}
          >
            <Input disabled placeholder="选择股票后自动填充" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StockTrackingsPage;
