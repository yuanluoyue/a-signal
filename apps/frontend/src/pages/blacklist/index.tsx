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
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  BlockOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import client from '@/services/client';

const { Title, Text } = Typography;

interface BlacklistItem {
  id: string;
  stockCode: string;
  stockName: string;
  reason?: string;
  createdAt: string;
}

interface StockOption {
  code: string;
  name: string;
  value: string;
  label: string;
}

const BlacklistPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BlacklistItem[]>([]);
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

  const searchStocks = async (keyword: string) => {
    if (!keyword || keyword.trim().length === 0) {
      setStockOptions([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await client.get<{ data: Array<{ code: string; name: string }> }>('/stock/search', {
        params: { keyword: keyword.trim() },
      });
      const options: StockOption[] = (response.data || []).map((stock) => ({
        code: stock.code,
        name: stock.name,
        value: stock.code,
        label: `${stock.code} - ${stock.name}`,
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

  const fetchData = async (page?: number, pageSize?: number) => {
    setLoading(true);
    try {
      const response = await client.get('/blacklist');
        const blacklist: BlacklistItem[] = response.data || [];
      setData(blacklist);
      setPagination((prev) => ({
        ...prev,
        current: page ?? prev.current,
        pageSize: pageSize ?? prev.pageSize,
        total: blacklist.length,
      }));
    } catch (error) {
      message.error('获取黑名单失败');
      console.error('Fetch blacklist error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (values: {
    stockCode: string;
    stockName: string;
    reason?: string;
  }) => {
    try {
      await client.post('/blacklist', values);
      message.success('添加成功');
      setIsModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error('添加失败');
      console.error('Add to blacklist error:', error);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await client.delete(`/blacklist/${id}`);
      message.success('移除成功');
      fetchData();
    } catch (error) {
      message.error('移除失败');
      console.error('Remove from blacklist error:', error);
    }
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
      render: (code: string) => (
        <Tag icon={<BlockOutlined />} color="error">
          {code}
        </Tag>
      ),
    },
    {
      title: '股票名称',
      dataIndex: 'stockName',
      key: 'stockName',
      width: 150,
    },
    {
      title: '屏蔽原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 250,
      render: (reason?: string) => reason || '-',
    },
    {
      title: '添加时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (time: string) => formatDate(time),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: BlacklistItem) => (
        <Popconfirm
          title="确认移除"
          description={`确定要从黑名单中移除 ${record.stockName} 吗？`}
          onConfirm={() => handleRemove(record.id)}
          okText="确认"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />} size="small">
            移除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>黑名单</Title>
      <Text type="secondary">被屏蔽的股票不会发送 webhook 通知，也不会在股票列表中展示</Text>

      <Card style={{ marginTop: 24, marginBottom: 24 }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchData()}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
          >
            添加黑名单
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
          locale={{ emptyText: '暂无黑名单股票' }}
        />
      </Card>

      <Modal
        title="添加黑名单"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setStockOptions([]);
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleAdd} layout="vertical">
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
          <Form.Item name="reason" label="屏蔽原因">
            <Input.TextArea rows={3} placeholder="请输入屏蔽原因（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BlacklistPage;
