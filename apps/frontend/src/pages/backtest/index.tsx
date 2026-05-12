import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Select,
  DatePicker,
  Input,
  Form,
  Popconfirm,
} from "antd";
import {
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
  LinkOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { backtestApi } from "@/services/backtest";
import { strategyApi } from "@/services/strategy";
import { signalsApi } from "@/services/signals";
import type { BacktestRecord, BacktestTrade, Strategy, Signal } from "@/services/types";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

const PERIOD_LABEL: Record<string, string> = {
  '4h': '4小时线',
  '1d': '日线',
};

const BacktestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BacktestRecord[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [form] = Form.useForm();

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BacktestRecord | null>(
    null,
  );
  const [tradesData, setTradesData] = useState<BacktestTrade[]>([]);

  const [signalDetailVisible, setSignalDetailVisible] = useState(false);
  const [signalDetailLoading, setSignalDetailLoading] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await backtestApi.getRecords();
      setData(response || []);
    } catch (error) {
      message.error("获取回测记录失败");
      console.error("Fetch backtest records error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const response = await backtestApi.getRecords();
        const records = response || [];
        setData(records);
        const hasRunning = records.some((r) => r.status === "running");
        if (!hasRunning && pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } catch {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    }, 3000);
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [fetchData]);

  useEffect(() => {
    if (data.some((r) => r.status === "running")) {
      startPolling();
    }
  }, [data, startPolling]);

  const handleOpenForm = async () => {
    setFormVisible(true);
    form.resetFields();
    try {
      const response = await strategyApi.getStrategiesList({ pageSize: 100 });
      setStrategies(response.data || []);
    } catch (error) {
      console.error("Fetch strategies error:", error);
    }
  };

  const handleRunBacktest = async () => {
    try {
      const values = await form.validateFields();
      setFormLoading(true);
      const params = {
        strategyId: values.strategyId,
        startTime: values.timeRange[0].toISOString(),
        endTime: values.timeRange[1].toISOString(),
        period: values.period || '4h',
        name: values.name || undefined,
      };
      await backtestApi.runBacktest(params);
      message.success("回测任务已创建，正在后台执行");
      setFormVisible(false);
      fetchData();
      startPolling();
    } catch (error) {
      console.error("Run backtest error:", error);
      message.error("创建回测任务失败");
    } finally {
      setFormLoading(false);
    }
  };

  const handleViewDetail = async (record: BacktestRecord) => {
    if (record.status === "running") {
      const fresh = await backtestApi.getRecordById(record.id);
      setSelectedRecord(fresh);
    } else {
      setSelectedRecord(record);
    }
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const trades = await backtestApi.getRecordTrades(record.id);
      setTradesData(trades || []);
    } catch (error) {
      console.error("Fetch trades error:", error);
      message.error("获取交易明细失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewSignalDetail = async (signalId: string | null) => {
    if (!signalId) {
      message.warning("该交易无关联信号");
      return;
    }
    setSignalDetailVisible(true);
    setSignalDetailLoading(true);
    try {
      const signal = await signalsApi.getSignalById(signalId);
      setSelectedSignal(signal);
    } catch (error) {
      console.error("Fetch signal detail error:", error);
      message.error("获取信号详情失败");
    } finally {
      setSignalDetailLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await backtestApi.deleteRecord(id);
      message.success("删除成功");
      fetchData();
    } catch (error) {
      message.error("删除失败");
      console.error("Delete backtest record error:", error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return dayjs(dateString).format("YYYY-MM-DD HH:mm");
  };

  const formatPercent = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "-";
    return `${(num * 100).toFixed(2)}%`;
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: 150,
      render: (name: string | null, record: BacktestRecord) => (
        <Space>
          {record.status === "running" && <LoadingOutlined />}
          {name || "-"}
        </Space>
      ),
    },
    {
      title: "策略",
      key: "strategy",
      width: 120,
      render: (_: unknown, record: BacktestRecord) =>
        record.strategySnapshot?.name || "-",
    },
    {
      title: "总收益率",
      dataIndex: "totalReturnPct",
      key: "totalReturnPct",
      width: 100,
      align: "center" as const,
      render: (ret: string | null, record: BacktestRecord) => {
        if (record.status === "running") return <Tag color="processing">-</Tag>;
        if (!ret) return "-";
        const num = parseFloat(ret);
        const color = num > 0 ? "red" : num < 0 ? "green" : "default";
        return <Tag color={color}>{formatPercent(ret)}</Tag>;
      },
    },
    {
      title: "回测区间",
      key: "timeRange",
      width: 220,
      render: (_: unknown, record: BacktestRecord) => (
        <Space direction="vertical" size="small">
          <Text type="secondary">{formatDate(record.startTime)}</Text>
          <Text type="secondary">{formatDate(record.endTime)}</Text>
        </Space>
      ),
    },
    {
      title: "信号",
      key: "signals",
      width: 100,
      align: "center" as const,
      render: (_: unknown, record: BacktestRecord) => {
        if (record.status === "running") return "-";
        if (record.totalSignals === null && record.filteredSignals === null)
          return "-";
        return `${record.filteredSignals ?? "-"}/${record.totalSignals ?? "-"}`;
      },
    },
    {
      title: "交易次数",
      dataIndex: "totalTrades",
      key: "totalTrades",
      width: 80,
      align: "center" as const,
      render: (count: number, record: BacktestRecord) => {
        if (record.status === "running") return "-";
        return <Tag color="blue">{count}</Tag>;
      },
    },
    {
      title: "胜率",
      dataIndex: "winRate",
      key: "winRate",
      width: 80,
      align: "center" as const,
      render: (rate: string | null, record: BacktestRecord) => {
        if (record.status === "running") return "-";
        if (!rate) return "-";
        const num = parseFloat(rate);
        const color = num >= 0.5 ? "success" : num >= 0.3 ? "warning" : "error";
        return <Tag color={color}>{formatPercent(rate)}</Tag>;
      },
    },

    {
      title: "最大回撤",
      dataIndex: "maxDrawdownPct",
      key: "maxDrawdownPct",
      width: 90,
      align: "center" as const,
      render: (dd: string | null, record: BacktestRecord) => {
        if (record.status === "running") return "-";
        if (!dd) return "-";
        return <Text type="danger">{formatPercent(dd)}</Text>;
      },
    },
    {
      title: "夏普比率",
      dataIndex: "sharpeRatio",
      key: "sharpeRatio",
      width: 90,
      align: "center" as const,
      render: (val: string | null, record: BacktestRecord) => {
        if (record.status === "running") return "-";
        return val ? parseFloat(val).toFixed(2) : "-";
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 80,
      align: "center" as const,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          completed: "green",
          failed: "red",
          running: "processing",
        };
        const labelMap: Record<string, string> = {
          completed: "完成",
          failed: "失败",
          running: "运行中",
        };
        return (
          <Tag color={colorMap[status] || "default"} icon={status === "running" ? <LoadingOutlined /> : undefined}>
            {labelMap[status] || status}
          </Tag>
        );
      },
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (time: string) => formatDate(time),
    },
    {
      title: "操作",
      key: "action",
      width: 160,
      fixed: "right" as const,
      render: (_: unknown, record: BacktestRecord) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条回测记录吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tradeColumns = [
    {
      title: "标的",
      dataIndex: "symbol",
      key: "symbol",
      width: 100,
    },
    {
      title: "方向",
      dataIndex: "direction",
      key: "direction",
      width: 80,
      render: (dir: string) => {
        const isLong = dir === "long";
        return (
          <Tag color={isLong ? "red" : "green"}>{isLong ? "做多" : "做空"}</Tag>
        );
      },
    },
    {
      title: "入场时间",
      dataIndex: "entryTime",
      key: "entryTime",
      width: 150,
      render: (time: string) => formatDate(time),
    },
    {
      title: "入场价",
      dataIndex: "entryPrice",
      key: "entryPrice",
      width: 100,
      render: (price: string) => parseFloat(price).toFixed(2),
    },
    {
      title: "出场时间",
      dataIndex: "exitTime",
      key: "exitTime",
      width: 150,
      render: (time: string | null) => (time ? formatDate(time) : "-"),
    },
    {
      title: "出场价",
      dataIndex: "exitPrice",
      key: "exitPrice",
      width: 100,
      render: (price: string | null) =>
        price ? parseFloat(price).toFixed(2) : "-",
    },
    {
      title: "收益率",
      dataIndex: "pnlPct",
      key: "pnlPct",
      width: 100,
      render: (pct: string | null) => {
        if (!pct) return "-";
        const num = parseFloat(pct);
        const color = num > 0 ? "red" : num < 0 ? "green" : "default";
        const text =
          num > 0
            ? `+${(num * 100).toFixed(2)}%`
            : `${(num * 100).toFixed(2)}%`;
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "出场原因",
      dataIndex: "exitReason",
      key: "exitReason",
      width: 100,
      render: (reason: string | null) => {
        const reasonMap: Record<string, string> = {
          hold_period: "持仓到期",
          stop_loss: "止损",
          take_profit: "止盈",
        };
        return reason ? reasonMap[reason] || reason : "-";
      },
    },
    {
      title: "操作",
      key: "action",
      width: 100,
      fixed: "right" as const,
      render: (_: unknown, record: BacktestTrade) => (
        <Button
          type="link"
          size="small"
          icon={<LinkOutlined />}
          onClick={() => handleViewSignalDetail(record.signalId)}
          disabled={!record.signalId}
        >
          信号
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>回测记录</Title>

      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenForm}
          >
            新建回测
          </Button>
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
              scroll={{ x: 1500 }}
            />
          )}
        </Spin>
      </Card>

      <Modal
        title="新建回测"
        open={formVisible}
        onOk={handleRunBacktest}
        onCancel={() => setFormVisible(false)}
        confirmLoading={formLoading}
        width={500}
      >
        <Form form={form} layout="vertical" initialValues={{ period: '4h' }}>
          <Form.Item
            name="strategyId"
            label="选择策略"
            rules={[{ required: true, message: "请选择策略" }]}
          >
            <Select
              placeholder="请选择策略"
              options={strategies.map((s) => ({ label: s.name, value: s.id }))}
            />
          </Form.Item>
          <Form.Item
            name="period"
            label="K线周期"
            rules={[{ required: true, message: "请选择K线周期" }]}
          >
            <Select
              placeholder="请选择K线周期"
              options={[
                { label: '4小时线', value: '4h' },
                { label: '日线', value: '1d' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="timeRange"
            label="时间范围"
            rules={[{ required: true, message: "请选择时间范围" }]}
          >
            <DatePicker.RangePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="name" label="回测名称">
            <Input placeholder="可选，默认使用策略名称" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="回测详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={1200}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedRecord ? (
          selectedRecord.status === "running" ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} />} />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">回测正在执行中，请稍后刷新查看结果</Text>
              </div>
            </div>
          ) : (
            <>
              <Descriptions bordered column={3} style={{ marginBottom: 24 }}>
                <Descriptions.Item label="策略名称">
                  {selectedRecord.strategySnapshot?.name || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="回测区间">
                  {formatDate(selectedRecord.startTime)} ~{" "}
                  {formatDate(selectedRecord.endTime)}
                </Descriptions.Item>
                <Descriptions.Item label="K线周期">
                  {PERIOD_LABEL[selectedRecord.period] || selectedRecord.period}
                </Descriptions.Item>
                <Descriptions.Item label="信号总数/过滤后">
                  {selectedRecord.totalSignals ?? "-"} /{" "}
                  {selectedRecord.filteredSignals ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="交易次数">
                  {selectedRecord.totalTrades} 笔
                </Descriptions.Item>
                <Descriptions.Item label="盈利/亏损">
                  <Text style={{ color: "#52c41a" }}>
                    {selectedRecord.winningTrades}
                  </Text>{" "}
                  /{" "}
                  <Text style={{ color: "#ff4d4f" }}>
                    {selectedRecord.losingTrades}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="胜率">
                  {formatPercent(selectedRecord.winRate)}
                </Descriptions.Item>
                <Descriptions.Item label="总收益率">
                  <Tag
                    color={
                      selectedRecord.totalReturnPct &&
                      parseFloat(selectedRecord.totalReturnPct) > 0
                        ? "red"
                        : "green"
                    }
                  >
                    {formatPercent(selectedRecord.totalReturnPct)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="平均收益率">
                  {formatPercent(selectedRecord.avgReturnPct)}
                </Descriptions.Item>
                <Descriptions.Item label="最大回撤">
                  <Text type="danger">
                    {formatPercent(selectedRecord.maxDrawdownPct)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="夏普比率">
                  {selectedRecord.sharpeRatio
                    ? parseFloat(selectedRecord.sharpeRatio).toFixed(2)
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="盈亏比">
                  {selectedRecord.profitFactor
                    ? parseFloat(selectedRecord.profitFactor).toFixed(2)
                    : "-"}
                </Descriptions.Item>
                {selectedRecord.status === "failed" && selectedRecord.errorMessage && (
                  <Descriptions.Item label="错误信息" span={3}>
                    <Text type="danger">{selectedRecord.errorMessage}</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>

              <Title level={5}>交易明细</Title>
              <Spin spinning={detailLoading}>
                <Table
                  dataSource={tradesData}
                  columns={tradeColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  size="small"
                  scroll={{ x: 1000 }}
                />
              </Spin>
            </>
          )
        ) : (
          <Empty description="暂无数据" />
        )}
      </Modal>

      <Modal
        title="信号详情"
        open={signalDetailVisible}
        onCancel={() => setSignalDetailVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setSignalDetailVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <Spin spinning={signalDetailLoading}>
          {selectedSignal ? (
            <Descriptions bordered column={2}>
              <Descriptions.Item label="标的">
                {selectedSignal.symbol || selectedSignal.stockCode || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="名称">
                {selectedSignal.stockName || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="方向">
                <Tag
                  color={
                    selectedSignal.action === "long"
                      ? "red"
                      : selectedSignal.action === "short"
                        ? "green"
                        : "default"
                  }
                >
                  {selectedSignal.action === "long"
                    ? "做多"
                    : selectedSignal.action === "short"
                      ? "做空"
                      : "观望"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="分数">
                {selectedSignal.score
                  ? parseFloat(selectedSignal.score).toFixed(4)
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="生成时间" span={2}>
                {formatDate(
                  selectedSignal.generatedAt ||
                    selectedSignal.createdAt ||
                    "",
                )}
              </Descriptions.Item>
              <Descriptions.Item label="有效期" span={2}>
                {selectedSignal.validFrom && selectedSignal.validTo
                  ? `${formatDate(selectedSignal.validFrom)} ~ ${formatDate(selectedSignal.validTo)}`
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="分析理由" span={2}>
                <Paragraph style={{ marginBottom: 0 }}>
                  {selectedSignal.reason || selectedSignal.reasoning || "暂无分析理由"}
                </Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="规则ID">
                {selectedSignal.ruleId || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="关联事件">
                {selectedSignal.eventId || "-"}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Empty description="暂无信号数据" />
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default BacktestPage;
