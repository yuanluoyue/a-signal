import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Select, message, Card, Input, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usersApi } from '@/services/users';
import type { UserListItem } from '@/services/types';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState<string>();
  const [roleFilter, setRoleFilter] = useState<string>();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await usersApi.getUsers({
        keyword,
        role: roleFilter,
        page,
        pageSize,
      });
      setUsers(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, roleFilter, page, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await usersApi.updateRole(userId, { role: newRole as 'admin' | 'normal' });
      message.success('角色更新成功');
      fetchUsers();
    } catch (error) {
      console.error('Failed to update role:', error);
      message.error('角色更新失败');
    }
  };

  const columns: ColumnsType<UserListItem> = [
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 150,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 250,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 150,
      render: (role: string | null, record: UserListItem) => {
        const currentRole = role || 'normal';
        return (
          <Select
            value={currentRole}
            size="small"
            style={{ width: 120 }}
            onChange={(value) => handleRoleChange(record.id, value)}
            options={[
              { value: 'admin', label: '管理员' },
              { value: 'normal', label: '普通用户' },
            ]}
          />
        );
      },
    },
    {
      title: '角色标签',
      key: 'roleTag',
      width: 120,
      render: (_: unknown, record: UserListItem) => {
        const role = record.role || 'normal';
        return role === 'admin' ? (
          <Tag color="red">管理员</Tag>
        ) : (
          <Tag color="blue">普通用户</Tag>
        );
      },
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 200,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
  ];

  return (
    <Card title="用户管理">
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索用户昵称"
          allowClear
          style={{ width: 250 }}
          onSearch={(value) => {
            setKeyword(value || undefined);
            setPage(1);
          }}
        />
        <Select
          placeholder="角色筛选"
          allowClear
          style={{ width: 150 }}
          value={roleFilter}
          onChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
          options={[
            { value: 'admin', label: '管理员' },
            { value: 'normal', label: '普通用户' },
          ]}
        />
      </Space>

      <Table<UserListItem>
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </Card>
  );
};

export default UsersPage;
