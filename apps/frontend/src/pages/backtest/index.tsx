import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Tag,
  Typography,
  Space,
  message,
  Spin,
  Empty,
  Modal,
  Descriptions,
  Table as DetailTable,
} from 'antd';
import { ReloadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { Popconfirm } from 'antd';
import client from '@/services/client';

const { Title, Text } = Typography;

interface BacktestRecord {
  id: string;
  startTime: string;
  endTime: string;
  minConfidence: number;
  maxConfidence: number;
  directions: string[];
  stopLoss: string;
  takeProfit: string;
  period: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: string;
  totalReturn: string;
  maxDrawdown: string;
  avgReturn: string;
  trades: Array<{
    signalId: string;
    stockCode: string;
    stockName: string;
    direction: string;
    entryPrice: number;
    exitPrice: number;
    return: number;
    exitReason: string;
    entryTime: string;
    exitTime: string;
  }>;
  createdAt: string;
}

const BacktestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BacktestRecord[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BacktestRecord | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await client.get('/backtest/records');
      setData(response.data || []);
    } catch (error) {
      message.error('获取回测记录失败');
      console.error('Fetch backtest records error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewDetail = (record: BacktestRecord) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await client.delete(`/backtest/records/${id}`);
      message.success('删除成功');
      fetchData();
    } catch (error) {
      message.error('删除失败');
      console.error('Delete backtest record error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  const formatPercent = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${(num * 100).toFixed(2)}%`;
  };

  const getDirectionTag = (directions: string[]) => {
    return directions.map((dir) => {
      const color = dir === 'buy' || dir === 'bullish' ? 'red' : 'green';
      const text = dir === 'buy' || dir === 'bullish' ? '买入' : '卖出';
      return <Tag key={dir} color={color}>{text}</Tag>;
    });
  };

  const columns = [
    {
      title: '回测时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time: string) => formatDate(time),
    },
    {
      title: '回测区间',
      key: 'timeRange',
      width: 220,
      render: (_: unknown, record: BacktestRecord) => (
        <Space direction="vertical" size="small">
          <Text type="secondary">开始: {formatDate(record.startTime)}</Text>
          <Text type="secondary">结束: {formatDate(record.endTime)}</Text>
        </Space>
      ),
    },
    {
      title: '交易次数',
      dataIndex: 'totalTrades',
      key: 'totalTrades',
      width: 100,
      render: (count: number) => <Tag color="blue">{count} 笔</Tag>,
    },
    {
      title: '胜率',
      dataIndex: 'winRate',
      key: 'winRate',
      width: 100,
      render: (rate: string) => {
        const num = parseFloat(rate);
        const color = num >= 0.5 ? 'success' : num >= 0.3 ? 'warning' : 'error';
        return <Tag color={color}>{formatPercent(rate)}</Tag>;
      },
    },
    {
      title: '总收益率',
      dataIndex: 'totalReturn',
      key: 'totalReturn',
      width: 120,
      render: (ret: string) => {
        const num = parseFloat(ret);
        const color = num > 0 ? 'red' : num < 0 ? 'green' : 'default';
        return <Tag color={color}>{formatPercent(ret)}</Tag>;
      },
    },
    {
      title: '最大回撤',
      dataIndex: 'maxDrawdown',
      key: 'maxDrawdown',
      width: 120,
      render: (dd: string) => <Text type="danger">{formatPercent(dd)}</Text>,
    },
    {
      title: '信号类型',
      dataIndex: 'directions',
      key: 'directions',
      width: 120,
      render: (directions: string[]) => getDirectionTag(directions),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: BacktestRecord) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewDetail(record)}
          >
            查看详情
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条回测记录吗？"
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

  // 交易明细表格列
  const tradeColumns = [
    {
      title: '股票代码',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 100,
    },
    {
      title: '股票名称',
      dataIndex: 'stockName',
      key: 'stockName',
      width: 120,
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 80,
      render: (direction: string) => {
        const color = direction === 'buy' || direction === 'bullish' ? 'red' : 'green';
        const text = direction === 'buy' || direction === 'bullish' ? '买入' : '卖出';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '入场价',
      dataIndex: 'entryPrice',
      key: 'entryPrice',
      width: 100,
      render: (price: number) => price?.toFixed(2) || '-',
    },
    {
      title: '出场价',
      dataIndex: 'exitPrice',
      key: 'exitPrice',
      width: 100,
      render: (price: number) => price?.toFixed(2) || '-',
    },
    {
      title: '收益率',
      dataIndex: 'return',
      key: 'return',
      width: 100,
      render: (ret: number) => {
        const color = ret > 0 ? 'red' : ret < 0 ? 'green' : 'default';
        const text = ret > 0 ? `+${(ret * 100).toFixed(2)}%` : `${(ret * 100).toFixed(2)}%`;
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '出场原因',
      dataIndex: 'exitReason',
      key: 'exitReason',
      width: 100,
      render: (reason: string) => {
        const reasonMap: Record<string, string> = {
          takeProfit: '止盈',
          stopLoss: '止损',
          timeExpired: '到期',
        };
        return reasonMap[reason] || reason;
      },
    },
    {
      title: '入场时间',
      dataIndex: 'entryTime',
      key: 'entryTime',
      width: 180,
      render: (time: string) => formatDate(time),
    },
    {
      title: '出场时间',
      dataIndex: 'exitTime',
      key: 'exitTime',
      width: 180,
      render: (time: string) => formatDate(time),
    },
  ];

  return (
    <div>
      <Title level={2}>回测记录</Title>

      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
        </Space>
      </Card>

      <Card>
        <Spin spinning={loading}>
          {data.length === 0 ? (
            <Empty description="暂无回测记录" />
          ) : (
            <Table
              columns={columns}
              dataSource={data}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
              scroll={{ x: 1200 }}
            />
          )}
        </Spin>
      </Card>

      {/* 回测详情弹窗 */}
      <Modal
        title="回测详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={1400}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedRecord ? (
          <>
            <Descriptions bordered column={3} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="回测时间">{formatDate(selectedRecord.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="回测区间">
                {formatDate(selectedRecord.startTime)} ~ {formatDate(selectedRecord.endTime)}
              </Descriptions.Item>
              <Descriptions.Item label="K线周期">{selectedRecord.period}</Descriptions.Item>
              <Descriptions.Item label="置信度范围">
                {selectedRecord.minConfidence}% ~ {selectedRecord.maxConfidence}%
              </Descriptions.Item>
              <Descriptions.Item label="止损/止盈">
                {formatPercent(selectedRecord.stopLoss)} / {formatPercent(selectedRecord.takeProfit)}
              </Descriptions.Item>
              <Descriptions.Item label="信号类型">{getDirectionTag(selectedRecord.directions)}</Descriptions.Item>
              <Descriptions.Item label="总交易次数">{selectedRecord.totalTrades} 笔</Descriptions.Item>
              <Descriptions.Item label="盈利次数" style={{ color: '#52c41a' }}>
                {selectedRecord.winningTrades} 笔
              </Descriptions.Item>
              <Descriptions.Item label="亏损次数" style={{ color: '#ff4d4f' }}>
                {selectedRecord.losingTrades} 笔
              </Descriptions.Item>
              <Descriptions.Item label="胜率">{formatPercent(selectedRecord.winRate)}</Descriptions.Item>
              <Descriptions.Item label="总收益率">
                <Tag color={parseFloat(selectedRecord.totalReturn) > 0 ? 'red' : 'green'}>
                  {formatPercent(selectedRecord.totalReturn)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="平均收益率">
                {formatPercent(selectedRecord.avgReturn)}
              </Descriptions.Item>
              <Descriptions.Item label="最大回撤" span={3}>
                <Text type="danger">{formatPercent(selectedRecord.maxDrawdown)}</Text>
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>交易明细</Title>
            <DetailTable
              dataSource={selectedRecord.trades}
              columns={tradeColumns}
              rowKey="signalId"
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: 1200 }}
            />
          </>
        ) : (
          <Empty description="暂无数据" />
        )}
      </Modal>
    </div>
  );
};

export default BacktestPage;
