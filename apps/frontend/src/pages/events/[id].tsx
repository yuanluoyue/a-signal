import { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Table,
  Typography,
  Skeleton,
  message,
  Progress,
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'umi';
import { eventsApi } from '@/services/events';
import type { EventItem, Signal, EventCategory, EventDecayType } from '@/services/types';

const { Title, Text, Paragraph } = Typography;

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

const decayTypeLabelMap: Record<EventDecayType, string> = {
  step: '阶梯',
  linear: '线性',
  exponential: '指数',
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

const getProcessedTag = (processed: boolean) =>
  processed ? <Tag color="success">已处理</Tag> : <Tag color="warning">未处理</Tag>;

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(false);

  const fetchEventDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await eventsApi.getEventById(id);
      setEvent(data);
    } catch (error) {
      console.error('获取事件详情失败:', error);
      message.error('获取事件详情失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventSignals = async () => {
    if (!id) return;
    try {
      setSignalsLoading(true);
      const data = await eventsApi.getEventSignals(id);
      setSignals(data);
    } catch (error) {
      console.error('获取关联信号失败:', error);
    } finally {
      setSignalsLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetail();
  }, [id]);

  useEffect(() => {
    if (event) {
      fetchEventSignals();
    }
  }, [event]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const signalColumns = [
    {
      title: '标的代码',
      key: 'symbol',
      width: 100,
      render: (_: unknown, record: Signal) => record.symbol || record.stockCode || '-',
    },
    {
      title: '股票名称',
      key: 'stockName',
      width: 100,
      render: (_: unknown, record: Signal) => record.stockName || '-',
    },
    {
      title: '动作',
      key: 'action',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: Signal) => {
        const action = record.action || (record.direction === 'bullish' ? 'long' : record.direction === 'bearish' ? 'short' : 'hold');
        if (action === 'long') {
          return <Tag color="success" icon={<ArrowUpOutlined />}>做多</Tag>;
        }
        if (action === 'short') {
          return <Tag color="error" icon={<ArrowDownOutlined />}>做空</Tag>;
        }
        return <Tag color="default" icon={<MinusOutlined />}>观望</Tag>;
      },
    },
    {
      title: '分数',
      key: 'score',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: Signal) => {
        const score = record.score ? parseFloat(record.score) : (record.confidence ? record.confidence / 100 : 0);
        return <span>{score.toFixed(2)}</span>;
      },
    },
    {
      title: '生成时间',
      key: 'generatedAt',
      width: 170,
      render: (_: unknown, record: Signal) => {
        const time = record.generatedAt || record.signalTime || record.createdAt;
        return new Date(time).toLocaleString('zh-CN');
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: Signal) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/signals/${record.id}`)}
        >
          查看
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/events')} style={{ marginBottom: 16 }}>
          返回列表
        </Button>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  if (!event) {
    return (
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/events')} style={{ marginBottom: 16 }}>
          返回列表
        </Button>
        <Card>
          <Text type="secondary">事件不存在或已被删除</Text>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/events')}>
          返回列表
        </Button>
      </Space>

      <Title level={2}>事件详情</Title>

      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2} styles={{ label: { fontWeight: 'bold' } }}>
          <Descriptions.Item label="分类">{getCategoryTag(event.category)}</Descriptions.Item>
          <Descriptions.Item label="子分类">{event.subcategory}</Descriptions.Item>
          <Descriptions.Item label="发生时间">{formatDate(event.occurredAt)}</Descriptions.Item>
          <Descriptions.Item label="检测时间">{formatDate(event.detectedAt)}</Descriptions.Item>
          <Descriptions.Item label="处理状态">{getProcessedTag(event.processed)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="情绪分析" style={{ marginBottom: 16 }}>
        <Descriptions column={2} styles={{ label: { fontWeight: 'bold' } }}>
          <Descriptions.Item label="情绪方向">{getSentimentDirectionTag(event.sentimentDirection)}</Descriptions.Item>
          <Descriptions.Item label="情绪置信度">
            <Space>
              <Progress
                percent={Math.round(event.sentimentConfidence * 100)}
                size="small"
                style={{ width: 80 }}
              />
              <span>{Math.round(event.sentimentConfidence * 100)}%</span>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="情绪依据" span={2}>
            <Paragraph style={{ marginBottom: 0 }}>{event.sentimentRationale || '-'}</Paragraph>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="重要性评估" style={{ marginBottom: 16 }}>
        <Descriptions column={2} styles={{ label: { fontWeight: 'bold' } }}>
          <Descriptions.Item label="重要性评分">
            <Space>
              <Progress
                percent={Math.round(event.importanceScore * 100)}
                size="small"
                style={{ width: 80 }}
              />
              <span>{Math.round(event.importanceScore * 100)}%</span>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="基准">{event.importanceBenchmark || '-'}</Descriptions.Item>
          <Descriptions.Item label="意外程度">
            {event.surpriseScore !== null
              ? `${Math.round(event.surpriseScore * 100)}%`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="意外基准">{event.surpriseBaseline || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="影响范围" style={{ marginBottom: 16 }}>
        {event.subjects && event.subjects.length > 0 ? (
          <Table
            dataSource={event.subjects.map((s, index) => ({ ...s, key: index }))}
            pagination={false}
            size="small"
            columns={[
              { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
              { title: '代码', dataIndex: 'code', key: 'code', width: 120 },
              { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
              {
                title: '权重',
                dataIndex: 'weight',
                key: 'weight',
                width: 100,
                render: (weight: number) => (
                  <Space>
                    <Progress
                      percent={Math.round(weight * 100)}
                      size="small"
                      style={{ width: 60 }}
                      showInfo={false}
                    />
                    <span>{Math.round(weight * 100)}%</span>
                  </Space>
                ),
              },
            ]}
          />
        ) : (
          <Text type="secondary">暂无关联标的</Text>
        )}
      </Card>

      <Card title="生效时间窗" style={{ marginBottom: 16 }}>
        <Descriptions column={2} styles={{ label: { fontWeight: 'bold' } }}>
          <Descriptions.Item label="开始时间">{formatDate(event.effectivePeriodStart)}</Descriptions.Item>
          <Descriptions.Item label="结束时间">{formatDate(event.effectivePeriodEnd)}</Descriptions.Item>
          <Descriptions.Item label="衰减类型">
            <Tag>{decayTypeLabelMap[event.effectiveDecayType]}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {event.metrics && event.metrics.length > 0 && (
        <Card title="量化特征" style={{ marginBottom: 16 }}>
          <Table
            dataSource={event.metrics.map((m, index) => ({ ...m, key: index }))}
            pagination={false}
            size="small"
            columns={[
              { title: '指标名称', dataIndex: 'name', key: 'name', width: 120 },
              {
                title: '数值',
                dataIndex: 'value',
                key: 'value',
                width: 100,
                render: (value: number) => <span>{value}</span>,
              },
              { title: '单位', dataIndex: 'unit', key: 'unit', width: 80 },
              {
                title: '同比变化',
                dataIndex: 'yoyChange',
                key: 'yoyChange',
                width: 100,
                render: (yoyChange: number | undefined) => {
                  if (yoyChange === undefined || yoyChange === null) return '-';
                  const color = yoyChange > 0 ? '#52c41a' : yoyChange < 0 ? '#f5222d' : '#999';
                  return <span style={{ color }}>{yoyChange > 0 ? '+' : ''}{yoyChange}%</span>;
                },
              },
            ]}
          />
        </Card>
      )}

      <Card title="原始信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2} styles={{ label: { fontWeight: 'bold' } }}>
          <Descriptions.Item label="标题" span={2}>{event.sourceTitle}</Descriptions.Item>
          <Descriptions.Item label="发布者">{event.sourcePublisher}</Descriptions.Item>
          <Descriptions.Item label="链接">
            {event.sourceUrl ? (
              <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
                <LinkOutlined /> 查看原文
              </a>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="摘要" span={2}>
            <Paragraph style={{ marginBottom: 0 }}>{event.sourceSummary || '-'}</Paragraph>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="关联信号">
        <Table
          columns={signalColumns}
          dataSource={signals}
          rowKey="id"
          loading={signalsLoading}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default EventDetailPage;
