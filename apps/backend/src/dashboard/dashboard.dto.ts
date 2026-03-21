import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsResponse {
  @ApiProperty({ description: '新闻总数', example: 1250 })
  totalNews: number;

  @ApiProperty({ description: '今日新增新闻数', example: 15 })
  todayNews: number;

  @ApiProperty({ description: '信号总数', example: 380 })
  totalSignals: number;

  @ApiProperty({ description: '今日新增信号数', example: 5 })
  todaySignals: number;

  @ApiProperty({ description: '股票数量', example: 50 })
  stockCount: number;

  @ApiProperty({ description: '待分析新闻数', example: 12 })
  pendingAnalysis: number;

  @ApiProperty({ description: '回测最高收益率', example: 0.25 })
  backtestBestReturn: number;

  @ApiProperty({ description: '回测最高胜率', example: 0.75 })
  backtestBestWinRate: number;
}

export class RecentSignalItem {
  @ApiProperty({ description: '信号ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ description: '股票代码', example: '600519' })
  stockCode: string;

  @ApiProperty({ description: '股票名称', example: '贵州茅台' })
  stockName: string;

  @ApiProperty({ description: '信号方向', example: 'buy', enum: ['buy', 'sell'] })
  direction: string;

  @ApiProperty({ description: '置信度 (0-100)', example: 85 })
  confidence: number;

  @ApiProperty({ description: '情感倾向', example: 'positive' })
  sentiment: string;

  @ApiProperty({ description: '信号时间', example: '2024-01-15T10:30:00Z' })
  signalTime: Date;

  @ApiProperty({ description: '创建时间', example: '2024-01-15T10:30:00Z' })
  createdAt: Date;
}

export class RecentSignalsResponse {
  @ApiProperty({ description: '最近信号列表', type: [RecentSignalItem] })
  data: RecentSignalItem[];

  @ApiProperty({ description: '总数', example: 10 })
  total: number;
}
