import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Tag,
  Typography,
  Space,
  message,
  Popconfirm,
} from 'antd';
import { EyeOutlined, ReloadOutlined, DeleteOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate } from 'umi';
import client from '@/services/client';

const { Title } = Typography;

interface StockWithSignals {
  stockCode: string;
  stockName: string;
  signalCount: number;
  latestSignalTime: string | null;
}

const StocksPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [data, setData] = useState<StockWithSignals[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchData = async (page?: number, pageSize?: number) => {
    setLoading(true);
    try {
      const response = await client.get('/stocks');
      const stockList: StockWithSignals[] = response.data || [];
      setData(stockList);
      setPagination((prev) => ({
        ...prev,
        current: page ?? prev.current,
        pageSize: pageSize ?? prev.pageSize,
        total: stockList.length,
      }));
    } catch (error) {
      message.error('获取股票列表失败');
      console.error('Fetch stocks error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleView = (stockCode: string) => {
    navigate(`/stocks/${stockCode}`);
  };

  const handleDeleteSignals = async (stockCode: string, stockName: string) => {
    try {
      const response = await client.delete(`/stocks/${stockCode}/signals`);
      message.success(`已删除 ${stockName}(${stockCode}) 的 ${response.deletedCount} 条信号`);
      fetchData();
    } catch (error) {
      message.error('删除信号失败');
      console.error('Delete signals error:', error);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const response = await client.post('/stock/sync');
      const { added, updated } = response.data || response;
      message.success(`同步完成！新增 ${added} 只股票，更新 ${updated} 只股票`);
      fetchData();
    } catch (error) {
      message.error('同步股票信息失败');
      console.error('Sync stocks error:', error);
    } finally {
      setSyncLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
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
      title: '信号数量',
      dataIndex: 'signalCount',
      key: 'signalCount',
      width: 100,
      render: (count: number) => (
        <Tag color="blue">{count} 条</Tag>
      ),
    },
    {
      title: '最新信号时间',
      dataIndex: 'latestSignalTime',
      key: 'latestSignalTime',
      width: 160,
      render: (time: string | null) => formatDate(time),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: StockWithSignals) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleView(record.stockCode)}
          >
            查看
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除 ${record.stockName}(${record.stockCode}) 的所有信号吗？此操作不可恢复。`}
            onConfirm={() => handleDeleteSignals(record.stockCode, record.stockName)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              清理
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>股票查询</Title>

      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            loading={syncLoading}
            onClick={handleSync}
          >
            获取股票信息
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => fetchData()}>
            刷新
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="stockCode"
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
    </div>
  );
};

export default StocksPage;
