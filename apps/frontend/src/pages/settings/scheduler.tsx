import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Switch,
  Typography,
  message,
  Tooltip,
  Badge,
  Popconfirm,
} from 'antd';
import {
  PlayCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import client from '@/services/client';

const { Title, Text } = Typography;

interface SchedulerTask {
  id: string;
  name: string;
  cronExpression: string;
  enabled: boolean;
  lastExecutedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const SchedulerPage: React.FC = () => {
  const [tasks, setTasks] = useState<SchedulerTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggeringTaskId, setTriggeringTaskId] = useState<string | null>(null);

  // 获取定时任务列表
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await client.get('/scheduler-tasks');
      console.log('[SchedulerPage.fetchTasks] API Response:', response);
      console.log('[SchedulerPage.fetchTasks] Response data:', response.data);
      
      // 处理后端返回的数据结构
      // 后端返回: { data: { data: [...], total: 3 } }
      // 经过 axios 拦截器处理后，response.data 可能是 { data: [...], total: 3 } 或者直接是数组
      let taskData: SchedulerTask[] = [];
      
      if (Array.isArray(response.data)) {
        // 直接返回数组
        taskData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        // 返回 { data: [...], total: 3 }
        taskData = response.data.data;
      } else if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
        // 返回 { data: { data: [...], total: 3 } }
        taskData = response.data.data.data;
      }
      
      console.log('[SchedulerPage.fetchTasks] Extracted taskData:', taskData);
      setTasks(taskData);
    } catch (error) {
      console.error('[SchedulerPage.fetchTasks] 获取定时任务列表失败:', error);
      message.error('获取定时任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // 切换启用状态
  const handleToggleEnabled = async (id: string) => {
    try {
      const response = await client.put(`/scheduler-tasks/${id}/toggle`);
      const task = tasks.find(t => t.id === id);
      const newStatus = !task?.enabled;
      message.success(newStatus ? '任务已启用' : '任务已停止');
      fetchTasks();
    } catch (error) {
      console.error('切换任务状态失败:', error);
      message.error('切换任务状态失败');
    }
  };

  // 手动触发任务
  const handleTrigger = async (id: string) => {
    try {
      setTriggeringTaskId(id);
      const response = await client.post(`/scheduler-tasks/${id}/trigger`);
      message.success('任务已触发执行');
      fetchTasks();
    } catch (error) {
      console.error('触发任务失败:', error);
      message.error('触发任务失败');
    } finally {
      setTriggeringTaskId(null);
    }
  };

  // 解析 Cron 表达式为人类可读格式
  const parseCronExpression = (cron: string): string => {
    const parts = cron.split(' ');
    if (parts.length !== 5 && parts.length !== 6) {
      return cron;
    }

    // 简化解析，实际项目中可以使用 cron-parser 库
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return '每天 00:00';
    }
    if (minute === '0' && hour === '*/4' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return '每4小时';
    }
    if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return '每小时';
    }
    if (minute === '*/30' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return '每30分钟';
    }
    if (minute === '0' && hour === '9' && dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5') {
      return '工作日 09:00';
    }

    return cron;
  };

  // 获取任务状态标签
  const getStatusTag = (enabled: boolean) => {
    if (enabled) {
      return (
        <Tag color="success" icon={<CheckCircleOutlined />}>
          运行中
        </Tag>
      );
    }
    return (
      <Tag color="default" icon={<CloseCircleOutlined />}>
        已停止
      </Tag>
    );
  };

  // 获取任务名称显示
  const getTaskNameDisplay = (name: string) => {
    const nameMap: Record<string, { icon: React.ReactNode; label: string; desc: string }> = {
      'news-crawl': {
        icon: <ReloadOutlined />,
        label: '新闻采集',
        desc: '每天晚上7点抓取东方财富新闻',
      },
      'news-analyze': {
        icon: <ScheduleOutlined />,
        label: '新闻分析',
        desc: '每天晚上8点分析未分析的新闻',
      },
      'kline-update': {
        icon: <ClockCircleOutlined />,
        label: 'K线数据更新',
        desc: '每天早上8点更新K线数据',
      },
      'cleanup-old-data': {
        icon: <InfoCircleOutlined />,
        label: '数据清理',
        desc: '清理过期历史数据',
      },
    };

    const config = nameMap[name] || { icon: <ScheduleOutlined />, label: name, desc: '' };

    return (
      <Space align="center" style={{ whiteSpace: 'nowrap' }}>
        {config.icon}
        <Text strong>{config.label}</Text>
      </Space>
    );
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      render: (name: string) => getTaskNameDisplay(name),
    },
    {
      title: '执行时间',
      dataIndex: 'cronExpression',
      key: 'cronExpression',
      width: 120,
      render: (cron: string) => (
        <Tooltip title={cron}>
          <Tag color="blue" style={{ whiteSpace: 'nowrap' }}>{parseCronExpression(cron)}</Tag>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 90,
      align: 'center' as const,
      render: (enabled: boolean) => getStatusTag(enabled),
    },
    {
      title: '开关',
      dataIndex: 'enabled',
      key: 'toggle',
      width: 80,
      align: 'center' as const,
      render: (enabled: boolean, record: SchedulerTask) => (
        <Switch
          checked={enabled}
          onChange={() => handleToggleEnabled(record.id)}
          size="small"
        />
      ),
    },
    {
      title: '最后执行',
      dataIndex: 'lastExecutedAt',
      key: 'lastExecutedAt',
      width: 140,
      render: (time: string | null) => {
        if (!time) {
          return <Text type="secondary" style={{ fontSize: 12 }}>从未执行</Text>;
        }
        const executedTime = new Date(time);
        return (
          <Tooltip title={executedTime.toLocaleString('zh-CN')}>
            <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              {executedTime.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: SchedulerTask) => (
        <Popconfirm
          title="确认执行"
          description={`确定要立即执行 "${record.name}" 任务吗？`}
          onConfirm={() => handleTrigger(record.id)}
          okText="执行"
          cancelText="取消"
        >
          <Button
            type="primary"
            size="small"
            icon={<PlayCircleOutlined />}
            loading={triggeringTaskId === record.id}
            disabled={!record.enabled}
          >
            执行
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>定时任务管理</Title>

      <Card
        title="任务列表"
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchTasks}>
            刷新
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
        />
      </Card>

      <Card title="说明" style={{ marginTop: 16 }}>
        <Space direction="vertical">
          <Text>
            <ClockCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            <strong>Cron 表达式：</strong>用于定义任务的执行时间规则
          </Text>
          <Text>
            <CheckCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            <strong>运行中：</strong>任务已启用，将按照 Cron 规则自动执行
          </Text>
          <Text>
            <CloseCircleOutlined style={{ marginRight: 8, color: '#999' }} />
            <strong>已停止：</strong>任务已禁用，不会自动执行
          </Text>
          <Text>
            <PlayCircleOutlined style={{ marginRight: 8, color: '#faad14' }} />
            <strong>立即执行：</strong>手动触发任务执行（仅对启用状态的任务有效）
          </Text>
        </Space>
      </Card>
    </div>
  );
};

export default SchedulerPage;
