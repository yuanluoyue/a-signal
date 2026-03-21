import React, { useState, useEffect } from 'react';
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
  Divider,
  Empty,
  Popconfirm,
} from 'antd';
import {
  ReloadOutlined,
  PlusOutlined,
  WalletOutlined,
  ShoppingCartOutlined,
  HistoryOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import api from '@/services/api';

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
  tradeTime: string;
}

const SimulationPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<SimulationAccount | null>(null);
  const [positions, setPositions] = useState<SimulationPosition[]>([]);
  const [trades, setTrades] = useState<SimulationTrade[]>([]);
  const [isTradeModalVisible, setIsTradeModalVisible] = useState(false);
  const [isBalanceModalVisible, setIsBalanceModalVisible] = useState(false);
  const [isPositionModalVisible, setIsPositionModalVisible] = useState(false);
  const [tradeForm] = Form.useForm();
  const [balanceForm] = Form.useForm();
  const [positionForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'positions' | 'trades'>('positions');

  const fetchAccount = async () => {
    try {
      const response = await api.get('/simulation/account');
      setAccount(response.data);
    } catch (error) {
      console.error('Fetch account error:', error);
      setAccount(null);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await api.get('/simulation/positions');
      setPositions(response.data || []);
    } catch (error) {
      console.error('Fetch positions error:', error);
      setPositions([]);
    }
  };

  const fetchTrades = async () => {
    try {
      const response = await api.get('/simulation/trades');
      setTrades(response.data || []);
    } catch (error) {
      console.error('Fetch trades error:', error);
      setTrades([]);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchAccount(), fetchPositions(), fetchTrades()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleUpdateBalance = async (values: { currentCapital: number; availableCash: number }) => {
    try {
      await api.put('/simulation/account', values);
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
  }) => {
    try {
      await api.post('/simulation/position', values);
      message.success('持仓添加成功');
      setIsPositionModalVisible(false);
      positionForm.resetFields();
      fetchPositions();
    } catch (error) {
      message.error('持仓添加失败');
      console.error('Add position error:', error);
    }
  };

  const handleDeletePosition = async (positionId: string) => {
    try {
      await api.delete(`/simulation/position/${positionId}`);
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
    price: number;
  }) => {
    try {
      await api.post('/simulation/trade', values);
      message.success('交易成功');
      setIsTradeModalVisible(false);
      tradeForm.resetFields();
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

  const formatPercent = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return '0.00%';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0.00%';
    return `${(num * 100).toFixed(2)}%`;
  };

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
      title: '数量',
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
            onClick={() => setIsTradeModalVisible(true)}
          >
            模拟交易
          </Button>
        </Space>
      </Card>

      <Card
        tabList={[
          { key: 'positions', tab: <><WalletOutlined /> 持仓</> },
          { key: 'trades', tab: <><HistoryOutlined /> 交易记录</> },
        ]}
        activeTabKey={activeTab}
        onTabChange={(key) => setActiveTab(key as 'positions' | 'trades')}
      >
        {activeTab === 'positions' ? (
          <Table
            columns={positionColumns}
            dataSource={positions}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: '暂无持仓' }}
          />
        ) : (
          <Table
            columns={tradeColumns}
            dataSource={trades}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* 修改余额弹窗 */}
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

      {/* 添加持仓弹窗 */}
      <Modal
        title="添加持仓"
        open={isPositionModalVisible}
        onCancel={() => setIsPositionModalVisible(false)}
        onOk={() => positionForm.submit()}
        width={400}
      >
        <Form form={positionForm} onFinish={handleAddPosition} layout="vertical">
          <Form.Item
            name="stockCode"
            label="股票代码"
            rules={[{ required: true, message: '请输入股票代码' }]}
          >
            <Input placeholder="例如: 00700" />
          </Form.Item>
          <Form.Item
            name="stockName"
            label="股票名称"
            rules={[{ required: true, message: '请输入股票名称' }]}
          >
            <Input placeholder="例如: 腾讯控股" />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="持仓数量"
            rules={[{ required: true, message: '请输入持仓数量' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} placeholder="请输入数量" />
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
        </Form>
      </Modal>

      {/* 模拟交易弹窗 */}
      <Modal
        title="模拟交易"
        open={isTradeModalVisible}
        onCancel={() => setIsTradeModalVisible(false)}
        onOk={() => tradeForm.submit()}
        width={500}
      >
        <Form form={tradeForm} onFinish={handleTrade} layout="vertical">
          <Form.Item
            name="stockCode"
            label="股票代码"
            rules={[{ required: true, message: '请输入股票代码' }]}
          >
            <Input placeholder="例如: 00700" />
          </Form.Item>
          <Form.Item
            name="stockName"
            label="股票名称"
            rules={[{ required: true, message: '请输入股票名称' }]}
          >
            <Input placeholder="例如: 腾讯控股" />
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
          <Form.Item
            name="quantity"
            label="数量"
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} placeholder="请输入数量" />
          </Form.Item>
          <Form.Item
            name="price"
            label="价格"
            rules={[{ required: true, message: '请输入价格' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              step={0.01}
              precision={2}
              placeholder="请输入价格"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SimulationPage;
