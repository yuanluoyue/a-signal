import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Progress,
  Statistic,
  Row,
  Col,
  Select,
  Button,
  Modal,
  Descriptions,
  Space,
  Typography,
  message,
} from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { tradingAgentApi } from '@/services/trading-agent';
import type {
  TradingAgentDecision,
  TradingAgentStats,
} from '@/services/types';
import styles from './index.module.scss';

const { Title } = Typography;

const DECISION_TYPE_MAP: Record<string, { label: string; color: string }> = {
  execute: { label: '执行', color: 'green' },
  reject: { label: '拒绝', color: 'orange' },
  adjust_position: { label: '调仓', color: 'blue' },
  close_position: { label: '平仓', color: 'red' },
  modify_holding: { label: '改仓', color: 'purple' },
};

const DECISION_MAP: Record<string, { label: string; color: string }> = {
  approved: { label: '通过', color: 'green' },
  rejected: { label: '拒绝', color: 'red' },
};

const RISK_LEVEL_MAP: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'green' },
  medium: { label: '中', color: 'orange' },
  high: { label: '高', color: 'red' },
  critical: { label: '严重', color: 'magenta' },
};

const DECISION_FILTER_OPTIONS = [
  { value: 'approved', label: '通过' },
  { value: 'rejected', label: '拒绝' },
];

const RISK_LEVEL_FILTER_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'critical', label: '严重' },
];

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const truncateId = (id: string) => {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...`;
};

const TradingAgentPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TradingAgentDecision[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [stats, setStats] = useState<TradingAgentStats | null>(null);

  const [filterDecision, setFilterDecision] = useState<'approved' | 'rejected' | undefined>();
  const [filterRiskLevel, setFilterRiskLevel] = useState<'low' | 'medium' | 'high' | 'critical' | undefined>();

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<TradingAgentDecision | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await tradingAgentApi.getStats();
      setStats(res);
    } catch {
      message.error('获取统计数据失败');
    }
  }, []);

  const fetchData = useCallback(
    async (page = current, size = pageSize) => {
      setLoading(true);
      try {
        const res = await tradingAgentApi.getDecisions({
          page,
          pageSize: size,
          decision: filterDecision,
          riskLevel: filterRiskLevel,
        });
        setData(res.data);
        setTotal(res.total);
        setCurrent(page);
        setPageSize(size);
      } catch {
        message.error('获取决策列表失败');
      } finally {
        setLoading(false);
      }
    },
    [current, pageSize, filterDecision, filterRiskLevel],
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchData(1);
  }, [filterDecision, filterRiskLevel]);

  const handleViewDetail = async (record: TradingAgentDecision) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const detail = await tradingAgentApi.getDecisionById(record.id);
      setDetailData(detail);
    } catch {
      message.error('获取决策详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: ColumnsType<TradingAgentDecision> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (val: string) => formatDate(val),
    },
    {
      title: '信号ID',
      dataIndex: 'signalId',
      key: 'signalId',
      width: 120,
      render: (val: string) => truncateId(val),
    },
    {
      title: '决策类型',
      dataIndex: 'decisionType',
      key: 'decisionType',
      width: 100,
      render: (val: string) => {
        const opt = DECISION_TYPE_MAP[val] || { label: val, color: 'default' };
        return <Tag color={opt.color}>{opt.label}</Tag>;
      },
    },
    {
      title: '决策结果',
      dataIndex: 'decision',
      key: 'decision',
      width: 90,
      render: (val: string) => {
        const opt = DECISION_MAP[val] || { label: val, color: 'default' };
        return <Tag color={opt.color}>{opt.label}</Tag>;
      },
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 90,
      render: (val: string) => {
        const opt = RISK_LEVEL_MAP[val] || { label: val, color: 'default' };
        return <Tag color={opt.color}>{opt.label}</Tag>;
      },
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 140,
      render: (val: number) => {
        const percent = Math.round(val * 100);
        const color = val >= 0.8 ? '#52c41a' : val >= 0.5 ? '#faad14' : '#ff4d4f';
        return (
          <Space>
            <span>{percent}%</span>
            <Progress percent={percent} size="small" strokeColor={color} style={{ width: 80 }} />
          </Space>
        );
      },
    },
    {
      title: '沉淀经验',
      dataIndex: 'memoryCreated',
      key: 'memoryCreated',
      width: 90,
      render: (val: boolean) =>
        val ? (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        ) : (
          <CloseCircleOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_: unknown, record: TradingAgentDecision) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  const renderContextSnapshot = (snapshot: TradingAgentDecision['contextSnapshot']) => {
    if (!snapshot) return '-';
    return (
      <div className={styles.detailContent}>
        {snapshot.accountInfo && Object.keys(snapshot.accountInfo).length > 0 && (
          <Descriptions title="账户信息" bordered size="small" column={1} style={{ marginTop: 16 }}>
            {Object.entries(snapshot.accountInfo).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
        {snapshot.signalInfo && Object.keys(snapshot.signalInfo).length > 0 && (
          <Descriptions title="信号信息" bordered size="small" column={1} style={{ marginTop: 16 }}>
            {Object.entries(snapshot.signalInfo).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
        {snapshot.relevantMemories && snapshot.relevantMemories.length > 0 && (
          <Descriptions title="相关经验" bordered size="small" column={1} style={{ marginTop: 16 }}>
            <Descriptions.Item label="经验数量">{snapshot.relevantMemories.length}</Descriptions.Item>
            {snapshot.relevantMemories.map((mem, idx) => (
              <Descriptions.Item key={idx} label={`经验 ${idx + 1}`}>
                {JSON.stringify(mem)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
        {snapshot.currentPositions && snapshot.currentPositions.length > 0 && (
          <Descriptions title="当前持仓" bordered size="small" column={1} style={{ marginTop: 16 }}>
            <Descriptions.Item label="持仓数量">{snapshot.currentPositions.length}</Descriptions.Item>
            {snapshot.currentPositions.map((pos, idx) => (
              <Descriptions.Item key={idx} label={`持仓 ${idx + 1}`}>
                {JSON.stringify(pos)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <Title level={2}>交易 Agent</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日决策数"
              value={stats?.totalToday ?? 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="执行数"
              value={stats?.approvedToday ?? 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="拒绝数"
              value={stats?.rejectedToday ?? 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="高风险拒绝"
              value={stats?.highRiskRejectedToday ?? 0}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<SafetyCertificateOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="决策结果"
            allowClear
            style={{ width: 150 }}
            value={filterDecision}
            onChange={(val) => setFilterDecision(val)}
            options={DECISION_FILTER_OPTIONS}
          />
          <Select
            placeholder="风险等级"
            allowClear
            style={{ width: 150 }}
            value={filterRiskLevel}
            onChange={(val) => setFilterRiskLevel(val)}
            options={RISK_LEVEL_FILTER_OPTIONS}
          />
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 980 }}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
          onChange={(pagination) => {
            fetchData(pagination.current || 1, pagination.pageSize || 20);
          }}
        />
      </Card>

      <Modal
        title="决策详情"
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setDetailData(null);
        }}
        footer={null}
        width={720}
        loading={detailLoading}
      >
        {detailData && (
          <div className={styles.detailContent}>
            <Descriptions title="基本信息" bordered size="small" column={2}>
              <Descriptions.Item label="决策类型">
                <Tag color={(DECISION_TYPE_MAP[detailData.decisionType] || {}).color || 'default'}>
                  {(DECISION_TYPE_MAP[detailData.decisionType] || {}).label || detailData.decisionType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="决策结果">
                <Tag color={(DECISION_MAP[detailData.decision] || {}).color || 'default'}>
                  {(DECISION_MAP[detailData.decision] || {}).label || detailData.decision}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="置信度">
                <Progress
                  percent={Math.round(detailData.confidence * 100)}
                  size="small"
                  style={{ width: 120 }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="风险等级">
                <Tag color={(RISK_LEVEL_MAP[detailData.riskLevel] || {}).color || 'default'}>
                  {(RISK_LEVEL_MAP[detailData.riskLevel] || {}).label || detailData.riskLevel}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Descriptions title="推理过程" bordered size="small" column={1} style={{ marginTop: 16 }}>
              <Descriptions.Item label="推理说明">{detailData.rationale}</Descriptions.Item>
            </Descriptions>

            {detailData.positionAction && (
              <Descriptions title="交易动作" bordered size="small" column={2} style={{ marginTop: 16 }}>
                <Descriptions.Item label="动作">
                  <Tag color={detailData.positionAction.action === 'buy' ? 'green' : 'red'}>
                    {detailData.positionAction.action === 'buy' ? '买入' : '卖出'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="股票">{detailData.positionAction.stockName} ({detailData.positionAction.stockCode})</Descriptions.Item>
                <Descriptions.Item label="数量">{detailData.positionAction.quantity}</Descriptions.Item>
                <Descriptions.Item label="价格">{detailData.positionAction.price ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="止盈价">{detailData.positionAction.takeProfitPrice ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="止损价">{detailData.positionAction.stopLossPrice ?? '-'}</Descriptions.Item>
              </Descriptions>
            )}

            {detailData.contextSnapshot && renderContextSnapshot(detailData.contextSnapshot)}

            <Descriptions title="沉淀经验" bordered size="small" column={1} style={{ marginTop: 16 }}>
              <Descriptions.Item label="是否沉淀">
                {detailData.memoryCreated ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#d9d9d9' }} />
                )}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TradingAgentPage;
