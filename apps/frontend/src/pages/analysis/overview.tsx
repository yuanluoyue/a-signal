import React from 'react';
import { Card, Typography, Empty } from 'antd';
import { FundOutlined } from '@ant-design/icons';

const { Title } = Typography;

const AnalysisOverviewPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>
        <FundOutlined style={{ marginRight: 8 }} />
        综合分析
      </Title>
      <Card>
        <Empty description="综合分析功能开发中，敬请期待" />
      </Card>
    </div>
  );
};

export default AnalysisOverviewPage;
