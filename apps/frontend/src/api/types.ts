// ==================== 通用类型 ====================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== 新闻相关类型 ====================

export type AnalyzeStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type VectorizeStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface News {
  id: string;
  title: string;
  content: string;
  source: string;
  analyzeStatus: AnalyzeStatus;
  vectorizeStatus: VectorizeStatus;
  publishTime: string;
  originalUrl: string;
  uniqueKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsListQueryParams extends PaginationParams {
  source?: string;
  analyzeStatus?: AnalyzeStatus;
  vectorizeStatus?: VectorizeStatus;
}

export interface NewsListResponse extends PaginationResponse<News> {}

// ==================== 信号相关类型 ====================

export type SignalDirection = 'bullish' | 'bearish' | 'neutral';

export interface Signal {
  id: string;
  newsId: string;
  stockCode: string;
  stockName: string;
  direction: string;
  confidence: number;
  sentiment: string;
  reasoning: string;
  keyFactors: string[];
  timeWindow: string;
  signalTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignalsListQueryParams extends PaginationParams {
  stockCode?: string;
  direction?: SignalDirection;
  minConfidence?: number;
  maxConfidence?: number;
  startTime?: string;
  endTime?: string;
}

export interface SignalsListResponse extends PaginationResponse<Signal> {}

// ==================== K线相关类型 ====================

export type KlinePeriod = '1d' | '4h';

export interface Kline {
  id: string;
  stockCode: string;
  period: string;
  timestamp: string;
  open: string;
  close: string;
  high: string;
  low: string;
  volume: string;
  createdAt: string;
}

export interface KlinesQueryParams {
  period?: KlinePeriod;
  startTime?: string;
  endTime?: string;
}

export interface SignalKlinesResponse {
  data: Kline[];
  total: number;
  stockCode: string;
  stockName: string;
  period: KlinePeriod;
}

// ==================== Webhook 相关类型 ====================

export type WebhookType = 'wechat';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  type: WebhookType;
  confidenceThreshold: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookData {
  name: string;
  url: string;
  type: WebhookType;
  confidenceThreshold: number;
  enabled?: boolean;
}

export interface UpdateWebhookData {
  name?: string;
  url?: string;
  type?: WebhookType;
  confidenceThreshold?: number;
  enabled?: boolean;
}

export interface WebhooksListResponse {
  data: Webhook[];
  total: number;
}

// ==================== 定时任务相关类型 ====================

export interface SchedulerTask {
  id: string;
  name: string;
  cronExpression: string;
  enabled: boolean;
  lastExecutedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulerTasksListResponse {
  data: SchedulerTask[];
  total: number;
}

// ==================== 回测相关类型 ====================

export type BacktestPeriod = '4h' | '1d';

export interface BacktestRequest {
  startTime: Date | string;
  endTime: Date | string;
  minConfidence: number;
  maxConfidence: number;
  directions: string[];
  stopLoss: number;
  takeProfit: number;
  period?: BacktestPeriod;
}

export interface TradeResult {
  signalId: string;
  stockCode: string;
  stockName: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  return: number;
  exitReason: 'takeProfit' | 'stopLoss' | 'timeExpired';
  entryTime: Date | string;
  exitTime: Date | string;
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  avgReturn: number;
  trades: TradeResult[];
}

// ==================== 仪表盘相关类型 ====================

export interface DashboardStats {
  totalNews: number;
  todayNews: number;
  totalSignals: number;
  todaySignals: number;
  pendingAnalysis: number;
  activeWebhooks: number;
}

export interface RecentSignalItem {
  id: string;
  stockCode: string;
  stockName: string;
  direction: string;
  confidence: number;
  sentiment: string;
  signalTime: string;
  createdAt: string;
}

export interface RecentSignalsResponse {
  data: RecentSignalItem[];
  total: number;
}
