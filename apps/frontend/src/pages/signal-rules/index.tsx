import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Modal,
  Typography,
  message,
  Tooltip,
} from 'antd';
import { PlusOutlined, EditOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { signalRulesApi } from '@/services/signal-rules';
import { getEventTypeName } from '@/utils/event.utils';
import type {
  SignalRule,
  UpdateGlobalRuleParams,
  CreateSignalRuleParams,
  UpdateSignalRuleParams,
} from '@/services/types';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SignalRulesPage: React.FC = () => {
  const [globalRuleLoading, setGlobalRuleLoading] = useState(false);
  const [globalForm] = Form.useForm();

  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesData, setRulesData] = useState<SignalRule[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<SignalRule | null>(null);
  const [ruleForm] = Form.useForm();

  const fetchGlobalRule = useCallback(async () => {
    setGlobalRuleLoading(true);
    try {
      const data = await signalRulesApi.getGlobalRule();
      globalForm.setFieldsValue({
        multiplier: parseFloat(data.multiplier),
        threshold: parseFloat(data.threshold),
        enableSurprise: data.enableSurprise,
        enableConfidence: data.enableConfidence,
      });
    } catch (error) {
      console.error('获取全局规则失败:', error);
      message.error('获取全局规则失败');
    } finally {
      setGlobalRuleLoading(false);
    }
  }, [globalForm]);

  const fetchRules = useCallback(async (page: number, size: number) => {
    setRulesLoading(true);
    try {
      const response = await signalRulesApi.getRulesList({
        page,
        pageSize: size,
        type: 'specific',
      });
      setRulesData(response.data);
      setTotal(response.total);
      setCurrent(page);
      setPageSize(size);
    } catch (error) {
      console.error('获取特定规则列表失败:', error);
      message.error('获取特定规则列表失败');
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalRule();
    fetchRules(1, 10);
  }, [fetchGlobalRule, fetchRules]);

  const handleSaveGlobalRule = async () => {
    try {
      const values = await globalForm.validateFields();
      setGlobalRuleLoading(true);
      const params: UpdateGlobalRuleParams = {
        multiplier: values.multiplier,
        threshold: values.threshold,
        enableSurprise: values.enableSurprise,
        enableConfidence: values.enableConfidence,
      };
      await signalRulesApi.updateGlobalRule(params);
      message.success('全局规则保存成功');
    } catch (error) {
      console.error('保存全局规则失败:', error);
      message.error('保存全局规则失败');
    } finally {
      setGlobalRuleLoading(false);
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    ruleForm.resetFields();
    ruleForm.setFieldsValue({
      enabled: true,
      multiplier: 1,
      threshold: 0,
    });
    setModalVisible(true);
  };

  const handleEditRule = (record: SignalRule) => {
    setEditingRule(record);
    ruleForm.setFieldsValue({
      name: record.name,
      eventType: record.eventType,
      enabled: record.enabled,
      multiplier: parseFloat(record.multiplier),
      threshold: parseFloat(record.threshold),
      description: record.description,
    });
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await ruleForm.validateFields();
      setModalLoading(true);

      if (editingRule) {
        const params: UpdateSignalRuleParams = {
          name: values.name,
          eventType: values.eventType,
          enabled: values.enabled,
          multiplier: values.multiplier,
          threshold: values.threshold,
          description: values.description,
        };
        await signalRulesApi.updateRule(editingRule.id, params);
        message.success('规则更新成功');
      } else {
        const params: CreateSignalRuleParams = {
          name: values.name,
          type: 'specific',
          eventType: values.eventType,
          enabled: values.enabled,
          multiplier: values.multiplier,
          threshold: values.threshold,
          description: values.description,
        };
        await signalRulesApi.createRule(params);
        message.success('规则创建成功');
      }

      setModalVisible(false);
      fetchRules(current, pageSize);
    } catch (error) {
      console.error('保存规则失败:', error);
      message.error('保存规则失败');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleEnabled = async (record: SignalRule, enabled: boolean) => {
    try {
      await signalRulesApi.updateRule(record.id, { enabled });
      message.success(`规则已${enabled ? '启用' : '禁用'}`);
      fetchRules(current, pageSize);
    } catch (error) {
      console.error('更新规则状态失败:', error);
      message.error('更新规则状态失败');
    }
  };

  const columns = [
    {
      title: '事件类型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 120,
      render: (eventType: string | null) => getEventTypeName(eventType),
    },
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '启用状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      align: 'center' as const,
      render: (enabled: boolean, record: SignalRule) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleEnabled(record, checked)}
        />
      ),
    },
    {
      title: (
        <span>
          系数{' '}
          <Tooltip title={
            <div>
              <div><strong>作用：</strong>调整不同事件类型对信号分数的影响程度</div>
              <div><strong>公式：</strong>final_score = global_score × 系数</div>
              <div><strong>使用场景：</strong></div>
              <div>• 系数 &gt; 1：放大信号（如盈利超预期，设为 1.2）</div>
              <div>• 系数 &lt; 1：减弱信号（如常规政策，设为 0.8）</div>
              <div>• 系数 = 1：保持原始分数</div>
              <div><strong>示例：</strong>全局分数 0.5 × 系数 1.2 = 最终分数 0.6</div>
              <div><strong>建议范围：</strong>0.5-2.0</div>
            </div>
          }>
            <QuestionCircleOutlined style={{ color: '#999', fontSize: 12 }} />
          </Tooltip>
        </span>
      ),
      dataIndex: 'multiplier',
      key: 'multiplier',
      width: 100,
      align: 'center' as const,
      render: (multiplier: string) => parseFloat(multiplier).toFixed(2),
    },
    {
      title: (
        <span>
          阈值{' '}
          <Tooltip title={
            <div>
              <div><strong>作用：</strong>过滤低质量信号，只保留分数足够高的信号</div>
              <div><strong>规则：</strong>只有当 |final_score| > 阈值 时才生成信号</div>
              <div><strong>使用场景：</strong></div>
              <div>• 阈值越高：信号越少但质量越高（精确度高）</div>
              <div>• 阈值越低：信号越多但噪音增加（召回率高）</div>
              <div><strong>示例：</strong></div>
              <div>• 阈值 0.2，分数 0.15 → 不生成信号</div>
              <div>• 阈值 0.2，分数 0.25 → 生成信号</div>
              <div>• 阈值 0.2，分数 -0.25 → 生成做空信号</div>
              <div><strong>建议范围：</strong>0.1-0.5</div>
            </div>
          }>
            <QuestionCircleOutlined style={{ color: '#999', fontSize: 12 }} />
          </Tooltip>
        </span>
      ),
      dataIndex: 'threshold',
      key: 'threshold',
      width: 100,
      align: 'center' as const,
      render: (threshold: string) => parseFloat(threshold).toFixed(2),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: SignalRule) => (
        <Button
          type="primary"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEditRule(record)}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>信号规则管理</Title>

      <Card title="全局规则" style={{ marginBottom: 24 }} loading={globalRuleLoading}>
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">计算公式：</Text>
          <Text code>score = importance × (direction × confidence) × (1 + surprise)</Text>
        </div>
        <Form form={globalForm} layout="inline">
          <Form.Item 
            name="multiplier" 
            label={
              <span>
                系数{' '}
                <Tooltip title={
                  <div>
                    <div><strong>作用：</strong>调整不同事件类型对信号分数的影响程度</div>
                    <div><strong>公式：</strong>final_score = global_score × 系数</div>
                    <div><strong>使用场景：</strong></div>
                    <div>• 系数 &gt; 1：放大信号（如盈利超预期）</div>
                    <div>• 系数 &lt; 1：减弱信号（如常规政策）</div>
                    <div><strong>建议范围：</strong>0.5-2.0</div>
                  </div>
                }>
                  <QuestionCircleOutlined style={{ color: '#999', fontSize: 12 }} />
                </Tooltip>
              </span>
            } 
            rules={[{ required: true }]}
          >
            <InputNumber min={0} step={0.1} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item 
            name="threshold" 
            label={
              <span>
                阈值{' '}
                <Tooltip title={
                  <div>
                    <div><strong>作用：</strong>过滤低质量信号</div>
                    <div><strong>规则：</strong>只有 |final_score| > 阈值 才生成信号</div>
                    <div><strong>使用场景：</strong></div>
                    <div>• 阈值越高：信号越少但质量越高</div>
                    <div>• 阈值越低：信号越多但噪音增加</div>
                    <div><strong>建议范围：</strong>0.1-0.5</div>
                  </div>
                }>
                  <QuestionCircleOutlined style={{ color: '#999', fontSize: 12 }} />
                </Tooltip>
              </span>
            } 
            rules={[{ required: true }]}
          >
            <InputNumber min={0} step={0.01} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item 
            name="enableSurprise" 
            label={
              <span>
                启用惊喜值{' '}
                <Tooltip title="是否在计算分数时考虑惊喜值（surprise）。惊喜值表示事件结果与预期的偏离程度">
                  <QuestionCircleOutlined style={{ color: '#999', fontSize: 12 }} />
                </Tooltip>
              </span>
            } 
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item 
            name="enableConfidence" 
            label={
              <span>
                启用置信度{' '}
                <Tooltip title="是否在计算分数时考虑置信度（confidence）。置信度表示 AI 对事件判断的可信程度">
                  <QuestionCircleOutlined style={{ color: '#999', fontSize: 12 }} />
                </Tooltip>
              </span>
            } 
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleSaveGlobalRule} loading={globalRuleLoading}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title="特定规则"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRule}>
            添加规则
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={rulesData}
          rowKey="id"
          loading={rulesLoading}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, size) => {
              const newSize = size || pageSize;
              setPageSize(newSize);
              fetchRules(page, newSize);
            },
          }}
        />
      </Card>

      <Modal
        title={editingRule ? '编辑规则' : '添加规则'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        confirmLoading={modalLoading}
        width={500}
      >
        <Form form={ruleForm} layout="vertical">
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="请输入规则名称" />
          </Form.Item>
          <Form.Item
            name="eventType"
            label="事件类型"
            rules={[{ required: true, message: '请输入事件类型' }]}
          >
            <Input placeholder="请输入事件类型" />
          </Form.Item>
          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            name="multiplier"
            label={
              <span>
                系数{' '}
                <Tooltip title={
                  <div>
                    <div><strong>作用：</strong>调整不同事件类型对信号分数的影响程度</div>
                    <div><strong>公式：</strong>final_score = global_score × 系数</div>
                    <div><strong>使用场景：</strong></div>
                    <div>• 系数 &gt; 1：放大信号（如盈利超预期，设为 1.2）</div>
                    <div>• 系数 &lt; 1：减弱信号（如常规政策，设为 0.8）</div>
                    <div>• 系数 = 1：保持原始分数</div>
                    <div><strong>示例：</strong>全局分数 0.5 × 系数 1.2 = 最终分数 0.6</div>
                    <div><strong>建议范围：</strong>0.5-2.0</div>
                  </div>
                }>
                  <QuestionCircleOutlined style={{ color: '#999', fontSize: 12 }} />
                </Tooltip>
              </span>
            }
            rules={[{ required: true, message: '请输入系数' }]}
          >
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="threshold"
            label={
              <span>
                阈值{' '}
                <Tooltip title={
                  <div>
                    <div><strong>作用：</strong>过滤低质量信号，只保留分数足够高的信号</div>
                    <div><strong>规则：</strong>只有当 |final_score| > 阈值 时才生成信号</div>
                    <div><strong>使用场景：</strong></div>
                    <div>• 阈值越高：信号越少但质量越高（精确度高）</div>
                    <div>• 阈值越低：信号越多但噪音增加（召回率高）</div>
                    <div><strong>示例：</strong></div>
                    <div>• 阈值 0.2，分数 0.15 → 不生成信号</div>
                    <div>• 阈值 0.2，分数 0.25 → 生成信号</div>
                    <div>• 阈值 0.2，分数 -0.25 → 生成做空信号</div>
                    <div><strong>建议范围：</strong>0.1-0.5</div>
                  </div>
                }>
                  <QuestionCircleOutlined style={{ color: '#999', fontSize: 12 }} />
                </Tooltip>
              </span>
            }
            rules={[{ required: true, message: '请输入阈值' }]}
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SignalRulesPage;
