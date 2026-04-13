import React from 'react';
import { Skeleton, Card, Row, Col, Space } from 'antd';

const PageLoading: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 24 }} />
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Skeleton active avatar paragraph={{ rows: 1 }} />
          <Skeleton active avatar paragraph={{ rows: 1 }} />
          <Skeleton active avatar paragraph={{ rows: 1 }} />
          <Skeleton active avatar paragraph={{ rows: 1 }} />
          <Skeleton active avatar paragraph={{ rows: 1 }} />
        </Space>
      </Card>
    </div>
  );
};

export default PageLoading;
