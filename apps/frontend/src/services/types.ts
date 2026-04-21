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

// ==================== 认证相关类型 ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nickname: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface UpdateProfileRequest {
  nickname?: string;
  avatarSeed?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatarSeed?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== API Key 相关类型 ====================

export interface ApiKeyResponse {
  id: string;
  name: string;
  status: string;
  rateLimit: number;
  createdAt: string;
}

export interface ApiKeyWithKeyResponse extends ApiKeyResponse {
  key: string;
}

export interface CreateApiKeyRequest {
  name: string;
  rateLimit?: number;
}

// ==================== 新闻相关类型 ====================

export type AnalyzeStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type VectorizeStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type AnalysisStatus = 'pending' | 'analyzing' | 'analyzed' | 'failed';
export type VectorizedStatus = 'pending' | 'vectorizing' | 'vectorized' | 'failed';

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

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  analysisStatus: AnalysisStatus;
  vectorizedStatus: VectorizedStatus;
  relatedStocks: string[];
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  embeddingModel?: string;
}

export interface NewsListQueryParams extends PaginationParams {
  source?: string;
  analyzeStatus?: AnalyzeStatus;
  vectorizeStatus?: VectorizeStatus;
  keyword?: string;
}

export interface NewsListResponse extends PaginationResponse<News> {}

export interface NewsFilter {
  source?: string;
  analysisStatus?: AnalysisStatus;
  vectorizedStatus?: VectorizedStatus;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

export interface NewsAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  summary: string;
  keyPoints: string[];
  relatedSignals?: NewsSignal[];
}

export interface NewsSignal {
  id: string;
  symbol: string;
  type: 'buy' | 'sell' | 'hold';
  confidence: number;
  createdAt: string;
}

// ==================== 信号相关类型 ====================

export type SignalDirection = 'bullish' | 'bearish' | 'neutral';
export type SignalType = 'buy' | 'sell';

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

export interface SignalStats {
  total: number;
  today: number;
  pending: number;
}

export interface RecentSignal {
  id: string;
  symbol: string;
  name?: string;
  type: SignalType;
  price: number;
  confidence: number;
  createdAt: string;
}

export interface SignalFilter {
  type?: SignalType[];
  startDate?: string;
  endDate?: string;
  minConfidence?: number;
  maxConfidence?: number;
  symbol?: string;
}

export interface SignalListParams {
  page?: number;
  pageSize?: number;
  type?: SignalType;
  startDate?: string;
  endDate?: string;
  minConfidence?: number;
  maxConfidence?: number;
}

export interface SignalListResponse {
  list: Signal[];
  total: number;
  page: number;
  pageSize: number;
}

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

export interface BacktestFilter {
  dateRange: [string, string];
  confidenceRange: [number, number];
  signalTypes: SignalType[];
  takeProfitPercent: number;
  stopLossPercent: number;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  type: SignalType;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  exitReason: 'take_profit' | 'stop_loss' | 'signal';
}

export interface BacktestResponse {
  success: boolean;
  data: BacktestResult;
  timestamp: string;
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

// ==================== 设置相关类型 ====================

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: NotificationSettings;
  trading: TradingSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  signalAlert: boolean;
  priceAlert: boolean;
  newsAlert: boolean;
}

export interface TradingSettings {
  defaultTakeProfit: number;
  defaultStopLoss: number;
  maxPositionSize: number;
  riskPerTrade: number;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  allowRegistration: boolean;
  maxSignalsPerDay: number;
  dataRetentionDays: number;
}

export interface SettingsUpdateRequest {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  notifications?: Partial<NotificationSettings>;
  trading?: Partial<TradingSettings>;
}
