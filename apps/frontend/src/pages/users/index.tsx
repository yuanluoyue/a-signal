import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Select, message, Card, Input, Space, Button, Modal, Typography } from 'antd';
import { PlusOutlined, CopyOutlined, GiftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usersApi } from '@/services/users';
import { inviteCodeApi } from '@/services/invite-code';
import type { UserListItem, InviteCode } from '@/services/types';

const { Text } = Typography;

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState<string>();
  const [roleFilter, setRoleFilter] = useState<string>();

  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [inviteTotal, setInviteTotal] = useState(0);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [invitePage, setInvitePage] = useState(1);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

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

  const fetchInviteCodes = useCallback(async () => {
    setInviteLoading(true);
    try {
      const result = await inviteCodeApi.getList({ page: invitePage, pageSize: 20 });
      setInviteCodes(result.data);
      setInviteTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch invite codes:', error);
      message.error('获取邀请码列表失败');
    } finally {
      setInviteLoading(false);
    }
  }, [invitePage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (inviteModalVisible) {
      fetchInviteCodes();
    }
  }, [inviteModalVisible, fetchInviteCodes]);

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

  const handleGenerateCode = async () => {
    try {
      const result = await inviteCodeApi.generate({ expiresInHours: 72 });
      setGeneratedCode(result.code);
      fetchInviteCodes();
      message.success('邀请码生成成功');
    } catch (error) {
      console.error('Failed to generate invite code:', error);
      message.error('邀请码生成失败');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      message.success('已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  const handleOpenInviteModal = () => {
    setGeneratedCode(null);
    setInvitePage(1);
    setInviteModalVisible(true);
  };

  const userColumns: ColumnsType<UserListItem> = [
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

  const inviteColumns: ColumnsType<InviteCode> = [
    {
      title: '邀请码',
      dataIndex: 'code',
      key: 'code',
      width: 200,
      render: (code: string) => (
        <Space>
          <Text code>{code}</Text>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopyCode(code)}
          />
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string | null) => {
        const s = status || 'active';
        if (s === 'active') return <Tag color="green">未使用</Tag>;
        if (s === 'used') return <Tag color="blue">已使用</Tag>;
        if (s === 'expired') return <Tag color="default">已过期</Tag>;
        return <Tag>{s}</Tag>;
      },
    },
    {
      title: '使用人',
      key: 'usedBy',
      width: 150,
      render: (_: unknown, record: InviteCode) => {
        if (!record.usedBy) return <span style={{ color: '#ccc' }}>-</span>;
        return record.usedByNickname || record.usedByEmail || record.usedBy.slice(0, 8);
      },
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
  ];

  return (
    <Card
      title="用户管理"
      extra={
        <Button icon={<GiftOutlined />} onClick={handleOpenInviteModal}>
          邀请码管理
        </Button>
      }
    >
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
        columns={userColumns}
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

      <Modal
        title="邀请码管理"
        open={inviteModalVisible}
        onCancel={() => setInviteModalVisible(false)}
        footer={null}
        width={900}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#666' }}>邀请码有效期 3 天，每人只能查看自己创建的邀请码</span>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleGenerateCode}>
            生成邀请码
          </Button>
        </div>

        {generatedCode && (
          <div style={{
            textAlign: 'center',
            padding: '16px',
            marginBottom: 16,
            background: '#f6ffed',
            borderRadius: 8,
            border: '1px solid #b7eb8f',
          }}>
            <p style={{ margin: '0 0 8px 0' }}>邀请码生成成功：</p>
            <Text
              code
              style={{ fontSize: 24, padding: '8px 16px', letterSpacing: 2 }}
            >
              {generatedCode}
            </Text>
            <div style={{ marginTop: 12 }}>
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={() => handleCopyCode(generatedCode)}
              >
                复制邀请码
              </Button>
            </div>
          </div>
        )}

        <Table<InviteCode>
          columns={inviteColumns}
          dataSource={inviteCodes}
          rowKey="id"
          loading={inviteLoading}
          size="small"
          pagination={{
            current: invitePage,
            pageSize: 20,
            total: inviteTotal,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p) => setInvitePage(p),
          }}
        />
      </Modal>
    </Card>
  );
};

export default UsersPage;
