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
  eventCount: number;
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
  newsId?: string;
  stockCode?: string;
  stockName?: string;
  direction?: string;
  confidence?: number;
  sentiment?: string;
  reasoning?: string;
  keyFactors?: string[];
  timeWindow?: string;
  signalTime?: string;
  eventId?: string;
  symbol?: string;
  action?: string;
  score?: string;
  generatedAt?: string;
  validFrom?: string;
  validTo?: string;
  reason?: string;
  ruleId?: string;
  ruleSnapshot?: {
    multiplier: string;
    threshold: string;
    enableSurprise: boolean;
    enableConfidence: boolean;
  };
  weight?: string;
  createdAt: string;
  updatedAt: string;
  eventOccurredAt?: string | null;
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
  symbol?: string;
  stockCode?: string;
  stockName?: string;
  action?: string;
  direction?: string;
  score?: number;
  confidence?: number;
  generatedAt?: string;
  signalTime?: string;
  createdAt: string;
  type?: SignalType;
  price?: number;
  name?: string;
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
  enabled: boolean;
  strategies?: Strategy[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookData {
  name: string;
  url: string;
  type: WebhookType;
  enabled?: boolean;
}

export interface UpdateWebhookData {
  name?: string;
  url?: string;
  type?: WebhookType;
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

export type BacktestStatus = 'completed' | 'failed' | 'running';

export interface BacktestStrategySnapshot {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  minScore: string;
  maxScore?: string | null;
  allowedRuleIds?: string[] | null;
  allowedCategories?: string[] | null;
  directionMode: string;
  entryMode: string;
  holdPeriod: number;
  stopLossPct?: string | null;
  takeProfitPct?: string | null;
  maxSignalsPerDay?: number | null;
  maxPositions?: number | null;
}

export interface BacktestRecord {
  id: string;
  name: string | null;
  description: string | null;
  strategyId: string | null;
  strategySnapshot: BacktestStrategySnapshot | null;
  stockCode: string | null;
  startTime: string;
  endTime: string;
  period: string;
  totalSignals: number | null;
  filteredSignals: number | null;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: string | null;
  totalReturnPct: string | null;
  avgReturnPct: string | null;
  maxDrawdownPct: string | null;
  sharpeRatio: string | null;
  profitFactor: string | null;
  avgHoldingPeriod: string | null;
  equityCurve: Array<{ time: string; equity: number }> | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export interface BacktestTrade {
  id: string;
  backtestId: string;
  strategyId: string;
  signalId: string | null;
  eventId: string | null;
  symbol: string;
  stockName: string | null;
  direction: string;
  entryTime: string;
  entryPrice: string;
  exitTime: string | null;
  exitPrice: string | null;
  pnlPct: string | null;
  signalScore: string | null;
  signalRuleId: string | null;
  signalReason: string | null;
  exitReason: string | null;
  stopLossPrice: string | null;
  takeProfitPrice: string | null;
  createdAt: string;
}

export interface StrategyBacktestRequest {
  strategyId: string;
  startTime: string;
  endTime: string;
  name?: string;
  stockCode?: string;
}

export interface BacktestRecordsQueryParams {
  stockCode?: string;
  strategyId?: string;
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

// ==================== 事件相关类型 ====================

export type EventCategory = 'macro' | 'policy' | 'company' | 'market' | 'sentiment';
export type EventDecayType = 'step' | 'linear' | 'exponential';

export interface EventSubject {
  type: 'stock' | 'sector' | 'index' | 'commodity';
  code: string;
  weight: number;
  name?: string;
}

export interface EventMetric {
  name: string;
  value: number;
  unit: string;
  yoyChange?: number;
}

export interface EventItem {
  id: string;
  newsId: string | null;
  detectedAt: string;
  occurredAt: string;
  category: EventCategory;
  subcategory: string;
  categoryName: string;
  subcategoryName: string;
  subjects: EventSubject[];
  sentimentDirection: number;
  sentimentConfidence: number;
  sentimentRationale: string;
  importanceScore: number;
  importanceBenchmark: string | null;
  surpriseScore: number | null;
  surpriseBaseline: string | null;
  effectivePeriodStart: string;
  effectivePeriodEnd: string | null;
  effectiveDecayType: EventDecayType;
  metrics: EventMetric[] | null;
  sourceUrl: string | null;
  sourceTitle: string;
  sourceSummary: string;
  sourcePublisher: string;
  version: number;
  processed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventsListQueryParams extends PaginationParams {
  category?: EventCategory;
  subcategory?: string;
  sentimentDirection?: number;
  processed?: boolean;
  startTime?: string;
  endTime?: string;
}

export interface EventsListResponse {
  data: EventItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== 信号规则相关类型 ====================

export type SignalRuleType = 'global' | 'specific';

export interface SignalRule {
  id: string;
  name: string;
  type: SignalRuleType;
  eventType: string | null;
  enabled: boolean;
  multiplier: string;
  threshold: string;
  enableSurprise: boolean;
  enableConfidence: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalRule {
  id: string;
  name: string;
  type: SignalRuleType;
  multiplier: string;
  threshold: string;
  enableSurprise: boolean;
  enableConfidence: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignalRulesListQueryParams extends PaginationParams {
  type?: SignalRuleType;
  eventType?: string;
  enabled?: boolean;
}

export interface SignalRulesListResponse extends PaginationResponse<SignalRule> {}

export interface CreateSignalRuleParams {
  name: string;
  type: SignalRuleType;
  eventType?: string;
  enabled?: boolean;
  multiplier?: number;
  threshold?: number;
  enableSurprise?: boolean;
  enableConfidence?: boolean;
  description?: string;
}

export interface UpdateSignalRuleParams {
  name?: string;
  eventType?: string;
  enabled?: boolean;
  multiplier?: number;
  threshold?: number;
  description?: string;
}

export interface UpdateGlobalRuleParams {
  multiplier?: number;
  threshold?: number;
  enableSurprise?: boolean;
  enableConfidence?: boolean;
}

// ==================== 策略相关类型 ====================

export type DirectionMode = 'long_only' | 'short_only' | 'both';
export type EntryMode = 'next_open';

export interface Strategy {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  minScore: string;
  maxScore: string | null;
  allowedRuleIds: string[] | null;
  allowedCategories: string[] | null;
  directionMode: DirectionMode;
  entryMode: EntryMode;
  holdPeriod: number;
  stopLossPct: string | null;
  takeProfitPct: string | null;
  maxSignalsPerDay: number | null;
  maxPositions: number | null;
  webhookId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StrategiesListQueryParams extends PaginationParams {
  enabled?: boolean;
  directionMode?: DirectionMode;
}

export interface StrategiesListResponse extends PaginationResponse<Strategy> {}

export interface CreateStrategyParams {
  name: string;
  description?: string;
  enabled?: boolean;
  minScore: number;
  maxScore?: number;
  allowedRuleIds?: string[];
  allowedCategories?: string[];
  directionMode: DirectionMode;
  entryMode?: EntryMode;
  holdPeriod: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  maxSignalsPerDay?: number;
  maxPositions?: number;
  webhookId?: string;
}

export interface UpdateStrategyParams {
  name?: string;
  description?: string;
  enabled?: boolean;
  minScore?: number;
  maxScore?: number;
  allowedRuleIds?: string[];
  allowedCategories?: string[];
  directionMode?: DirectionMode;
  entryMode?: EntryMode;
  holdPeriod?: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  maxSignalsPerDay?: number;
  maxPositions?: number;
  webhookId?: string;
}

// ==================== 交易经验相关类型 ====================

export type TradingMemoryType = 'event_pattern' | 'signal_pattern' | 'strategy_pattern' | 'market_regime_pattern' | 'risk_pattern';
export type TradingMemoryStatus = 'testing' | 'active' | 'dormant' | 'invalidated';

export interface TradingMemoryPattern {
  eventType?: string;
  eventSubcategory?: string;
  marketRegime?: string;
  strategyId?: string;
  signalDirection?: 'long' | 'short';
  scoreRange?: [number, number];
}

export interface TradingMemoryStats {
  sampleSize: number;
  avgReturn: number;
  expectancy?: number;
  winRate: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  avgHoldDays?: number;
  profitFactor?: number;
  pnlStdDev?: number;
}

export interface TradingMemory {
  id: string;
  type: TradingMemoryType;
  title: string;
  summary: string;
  rationale?: string;
  tags: string[];
  pattern: TradingMemoryPattern;
  stats: TradingMemoryStats;
  confidence: string;
  status: TradingMemoryStatus;
  firstObservedAt: string;
  lastValidatedAt: string | null;
  invalidatedAt: string | null;
  lastComputedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradingMemoriesListQueryParams extends PaginationParams {
  type?: TradingMemoryType;
  status?: TradingMemoryStatus;
  keyword?: string;
}

export interface TradingMemoriesListResponse extends PaginationResponse<TradingMemory> {}

export interface TradingMemoryStatsResponse {
  total: number;
  highConfidence: number;
  active: number;
  invalidated: number;
}

// ==================== 交易 Agent 相关类型 ====================

export interface TradingAgentDecision {
  id: string;
  userId: string;
  accountId: string;
  signalId: string;
  decisionType: 'execute' | 'reject' | 'adjust_position' | 'close_position' | 'modify_holding';
  decision: 'approved' | 'rejected';
  rationale: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  positionAction: {
    action: 'buy' | 'sell';
    stockCode: string;
    stockName: string;
    quantity: number;
    price?: number;
    takeProfitPrice?: number;
    stopLossPrice?: number;
  } | null;
  contextSnapshot: {
    accountInfo?: Record<string, unknown>;
    signalInfo?: Record<string, unknown>;
    relevantMemories?: Record<string, unknown>[];
    currentPositions?: Record<string, unknown>[];
  } | null;
  memoryCreated: boolean;
  createdAt: string;
}

export interface TradingAgentStats {
  totalToday: number;
  approvedToday: number;
  rejectedToday: number;
  highRiskRejectedToday: number;
}

export interface TradingAgentRuntime {
  id: string;
  userId: string;
  accountId: string | null;
  status: 'running' | 'stopped';
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== LLM 运行中心相关类型 ====================

export interface LlmTodayStats {
  totalTokens: number;
  totalRequests: number;
  totalErrors: number;
  totalCost: number;
}

export interface LlmModuleUsage {
  module: string;
  totalTokens: number;
  totalRequests: number;
  totalCost: number;
}

export interface LlmProviderUsage {
  provider: string;
  model: string;
  totalTokens: number;
  totalRequests: number;
  totalCost: number;
}

export interface LlmLatencyStats {
  avgLatencyMs: number;
  retryRate: number;
  timeoutRate: number;
}

export interface LlmProviderConfig {
  id: string;
  provider: string;
  enabled: boolean;
  apiKey: string | null;
  baseUrl: string | null;
  defaultModel: string | null;
  rpmLimit: number | null;
  dailyBudget: number | null;
  createdAt: string;
  updatedAt: string;
}
