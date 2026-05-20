import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Statistic,
  Row,
  Col,
  Select,
  Button,
  Input,
  Space,
  Typography,
  message,
  Modal,
} from 'antd';
import {
  FilterOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SaveOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'umi';
import { newsFilterAgentApi } from '@/services/news-filter-agent';
import type {
  NewsFilterAgentLog,
  NewsFilterAgentStats,
} from '@/services/news-filter-agent';

const { Title } = Typography;
const { TextArea } = Input;

const DEFAULT_PROMPT = `你是一个金融新闻过滤器。你的任务是根据新闻标题判断这条新闻是否值得进行深度金融事件分析。

判断标准：
1. 新闻是否与金融市场、股票、经济政策相关
2. 新闻是否可能包含影响交易决策的信息
3. 新闻是否涉及上市公司、行业政策、宏观经济等

应该跳过（skip）的新闻类型：
- 纯娱乐、体育新闻
- 与金融市场无关的社会新闻
- 重复或无实质内容的新闻
- 广告或推广内容

应该通过（analyze）的新闻类型：
- 上市公司相关新闻（业绩、并购、重组等）
- 宏观经济政策新闻（利率、GDP、通胀等）
- 行业政策变化新闻
- 市场行情相关新闻
- 国际贸易、地缘政治对市场有影响的新闻

请根据新闻标题做出判断，返回 JSON 格式结果。

新闻标题：{newsTitle}`;

const DECISION_MAP: Record<string, { label: string; color: string }> = {
  analyze: { label: '通过', color: 'green' },
  skip: { label: '跳过', color: 'orange' },
};

const DECISION_FILTER_OPTIONS = [
  { value: 'analyze', label: '通过' },
  { value: 'skip', label: '跳过' },
];

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const NewsFilterAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NewsFilterAgentLog[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [stats, setStats] = useState<NewsFilterAgentStats | null>(null);
  const [filterDecision, setFilterDecision] = useState<string | undefined>();
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [promptSaving, setPromptSaving] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await newsFilterAgentApi.getStats();
      setStats(res);
    } catch {
      message.error('获取统计数据失败');
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const config = await newsFilterAgentApi.getConfig();
      if (config.prompt) {
        setPrompt(config.prompt);
      }
    } catch {
      message.error('获取配置失败');
    }
  }, []);

  const fetchData = useCallback(
    async (page = current, size = pageSize) => {
      setLoading(true);
      try {
        const res = await newsFilterAgentApi.getLogs({
          page,
          pageSize: size,
          decision: filterDecision,
        });
        setData(res.data);
        setTotal(res.total);
        setCurrent(page);
        setPageSize(size);
      } catch {
        message.error('获取日志列表失败');
      } finally {
        setLoading(false);
      }
    },
    [current, pageSize, filterDecision],
  );

  useEffect(() => {
    fetchStats();
    fetchConfig();
  }, [fetchStats, fetchConfig]);

  useEffect(() => {
    fetchData(1);
  }, [filterDecision]);

  const handleSavePrompt = async () => {
    if (!prompt.includes('{newsTitle}')) {
      message.error('Prompt 必须包含 {newsTitle} 占位符');
      return;
    }
    setPromptSaving(true);
    try {
      await newsFilterAgentApi.updateConfig({ prompt });
      message.success('Prompt 保存成功');
    } catch {
      message.error('保存 Prompt 失败');
    } finally {
      setPromptSaving(false);
    }
  };

  const handleResetPrompt = () => {
    Modal.confirm({
      title: '确定要恢复默认 Prompt 吗？',
      onOk: async () => {
        setPrompt(DEFAULT_PROMPT);
        try {
          await newsFilterAgentApi.updateConfig({ prompt: DEFAULT_PROMPT });
          message.success('已恢复默认 Prompt');
        } catch {
          message.error('恢复默认 Prompt 失败');
        }
      },
    });
  };

  const columns: ColumnsType<NewsFilterAgentLog> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (val: string) => formatDate(val),
    },
    {
      title: '新闻标题',
      dataIndex: 'newsTitle',
      key: 'newsTitle',
      width: 300,
      render: (title: string, record: NewsFilterAgentLog) =>
        title ? (
          <a onClick={() => record.newsId && navigate(`/news/${record.newsId}`)}>{title.length > 40 ? title.slice(0, 40) + '...' : title}</a>
        ) : '-',
    },
    {
      title: '判断结果',
      dataIndex: 'decision',
      key: 'decision',
      width: 100,
      render: (val: string) => {
        const opt = DECISION_MAP[val] || { label: val, color: 'default' };
        return <Tag color={opt.color}>{opt.label}</Tag>;
      },
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (val: string | null) => {
        if (val === null || val === undefined) return '-';
        const percent = Math.round(Number(val) * 100);
        return `${percent}%`;
      },
    },
    {
      title: '推理理由',
      dataIndex: 'reasoning',
      key: 'reasoning',
      ellipsis: true,
      render: (val: string | null) => val || '-',
    },
  ];

  return (
    <div>
      <Title level={2}>新闻过滤 Agent</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日过滤总数"
              value={stats?.total ?? 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<FilterOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="通过数"
              value={stats?.analyzed ?? 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="跳过数"
              value={stats?.skipped ?? 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="跳过率"
              value={stats?.skipRate ?? 0}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
              prefix={<FilterOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="过滤 Prompt" style={{ marginBottom: 16 }}>
        <TextArea
          rows={8}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSavePrompt}
            loading={promptSaving}
          >
            保存
          </Button>
          <Button
            icon={<UndoOutlined />}
            onClick={handleResetPrompt}
          >
            恢复默认
          </Button>
        </Space>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="判断结果"
            allowClear
            style={{ width: 150 }}
            value={filterDecision}
            onChange={(val) => setFilterDecision(val)}
            options={DECISION_FILTER_OPTIONS}
          />
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 800 }}
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
    </div>
  );
};

export default NewsFilterAgentPage;
