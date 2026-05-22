import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, message, Card, Checkbox } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { menuApi } from '@/services/menu';
import type { MenuItem, CreateMenuRequest, UpdateMenuRequest } from '@/services/types';

const ICON_OPTIONS = [
  'DashboardOutlined', 'DatabaseOutlined', 'ReadOutlined', 'SearchOutlined',
  'EyeOutlined', 'ExperimentOutlined', 'SettingOutlined', 'BellOutlined',
  'ThunderboltOutlined', 'CodeOutlined', 'LineChartOutlined', 'WalletOutlined',
  'ControlOutlined', 'DollarOutlined', 'RobotOutlined', 'MessageOutlined',
  'FilterOutlined', 'BulbOutlined', 'CloudServerOutlined', 'FileTextOutlined',
  'FundOutlined', 'BarChartOutlined', 'PieChartOutlined', 'NotificationOutlined',
  'ClockCircleOutlined', 'KeyOutlined', 'BlockOutlined', 'AuditOutlined',
  'UserOutlined', 'MenuOutlined',
];

const MenuManagementPage: React.FC = () => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [form] = Form.useForm();

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await menuApi.getAllMenus();
      setMenus(data);
    } catch (error) {
      console.error('Failed to fetch menus:', error);
      message.error('获取菜单列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const buildTreeData = (menus: MenuItem[]): MenuItem[] => {
    const topMenus = menus.filter(m => !m.parentId);
    const childMenus = menus.filter(m => m.parentId);

    return topMenus
      .sort((a, b) => a.sort - b.sort)
      .map(menu => {
        const children = childMenus
          .filter(c => c.parentId === menu.id)
          .sort((a, b) => a.sort - b.sort);
        return { ...menu, children };
      });
  };

  const handleCreate = () => {
    setEditingMenu(null);
    form.resetFields();
    form.setFieldsValue({
      sort: 0,
      visibleRoles: ['admin', 'normal'],
    });
    setModalVisible(true);
  };

  const handleEdit = (record: MenuItem) => {
    setEditingMenu(record);
    form.setFieldsValue({
      parentId: record.parentId || undefined,
      name: record.name,
      path: record.path || undefined,
      icon: record.icon || undefined,
      sort: record.sort,
      visibleRoles: record.visibleRoles || ['admin', 'normal'],
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: MenuItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除菜单「${record.name}」吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await menuApi.delete(record.id);
          message.success('删除成功');
          fetchMenus();
        } catch (error) {
          console.error('Failed to delete menu:', error);
          message.error('删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingMenu) {
        const updateData: UpdateMenuRequest = {
          name: values.name,
          path: values.path || null,
          icon: values.icon || null,
          sort: values.sort,
          visibleRoles: values.visibleRoles,
        };
        await menuApi.update(editingMenu.id, updateData);
        message.success('更新成功');
      } else {
        const createData: CreateMenuRequest = {
          parentId: values.parentId || undefined,
          name: values.name,
          path: values.path || undefined,
          icon: values.icon || undefined,
          sort: values.sort,
          visibleRoles: values.visibleRoles,
        };
        await menuApi.create(createData);
        message.success('创建成功');
      }

      setModalVisible(false);
      fetchMenus();
    } catch (error) {
      console.error('Failed to save menu:', error);
      message.error('保存失败');
    }
  };

  const topMenus = menus.filter(m => !m.parentId);

  const columns: ColumnsType<MenuItem> = [
    {
      title: '菜单名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '路由路径',
      dataIndex: 'path',
      key: 'path',
      width: 200,
      render: (path: string | null) => path || <Tag>分组</Tag>,
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 180,
      render: (icon: string | null) => icon || '-',
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
    },
    {
      title: '可见角色',
      dataIndex: 'visibleRoles',
      key: 'visibleRoles',
      width: 200,
      render: (roles: string[] | null) => {
        const currentRoles = roles || ['admin', 'normal'];
        return (
          <Space>
            {currentRoles.map(role => (
              <Tag key={role} color={role === 'admin' ? 'red' : 'blue'}>
                {role === 'admin' ? '管理员' : '普通用户'}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string | null) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: MenuItem) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <Card title="菜单管理">
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增菜单
        </Button>
      </Space>

      <Table<MenuItem>
        columns={columns}
        dataSource={buildTreeData(menus)}
        rowKey="id"
        loading={loading}
        pagination={false}
        expandable={{
          defaultExpandAllRows: true,
        }}
      />

      <Modal
        title={editingMenu ? '编辑菜单' : '新增菜单'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="parentId" label="父菜单">
            <Select
              placeholder="无（顶级菜单）"
              allowClear
              options={topMenus.map(m => ({
                value: m.id,
                label: m.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="菜单名称"
            rules={[{ required: true, message: '请输入菜单名称' }]}
          >
            <Input placeholder="请输入菜单名称" />
          </Form.Item>

          <Form.Item name="path" label="路由路径">
            <Input placeholder="如 /dashboard，分组菜单留空" />
          </Form.Item>

          <Form.Item name="icon" label="图标">
            <Select
              placeholder="选择图标"
              allowClear
              showSearch
              options={ICON_OPTIONS.map(icon => ({
                value: icon,
                label: icon,
              }))}
            />
          </Form.Item>

          <Form.Item name="sort" label="排序权重">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="越小越靠前" />
          </Form.Item>

          <Form.Item name="visibleRoles" label="可见角色">
            <Checkbox.Group
              options={[
                { label: '管理员', value: 'admin' },
                { label: '普通用户', value: 'normal' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default MenuManagementPage;
