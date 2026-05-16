import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  integer,
  decimal,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  foreignKey,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  nickname: varchar('nickname', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  avatarSeed: text('avatar_seed'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const news = pgTable(
  'news',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content').notNull(),
    source: varchar('source', { length: 100 }).notNull(),
    analyzeStatus: varchar('analyze_status', { length: 20 })
      .notNull()
      .default('pending'),
    vectorizeStatus: varchar('vectorize_status', { length: 20 })
      .notNull()
      .default('pending'),
    embeddingModel: varchar('embedding_model', { length: 100 }),
    publishTime: timestamp('publish_time', { withTimezone: true }).notNull(),
    originalUrl: text('original_url').notNull(),
    uniqueKey: varchar('unique_key', { length: 255 }).notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('news_analyze_status_idx').on(table.analyzeStatus),
    index('news_vectorize_status_idx').on(table.vectorizeStatus),
    index('news_publish_time_idx').on(table.publishTime),
    index('news_source_idx').on(table.source),
  ],
);

export type News = typeof news.$inferSelect;
export type NewNews = typeof news.$inferInsert;

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    newsId: uuid('news_id'),
    detectedAt: timestamp('detected_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    category: varchar('category', { length: 20 }).notNull(),
    subcategory: varchar('subcategory', { length: 50 }).notNull(),
    subjects: jsonb('subjects').notNull().$type<
      Array<{
        type: 'stock' | 'sector' | 'index' | 'commodity';
        code: string;
        weight: number;
      }>
    >(),
    sentimentDirection: integer('sentiment_direction').notNull(),
    sentimentConfidence: decimal('sentiment_confidence', {
      precision: 5,
      scale: 4,
    }).notNull(),
    sentimentRationale: varchar('sentiment_rationale', { length: 50 }).notNull(),
    importanceScore: decimal('importance_score', {
      precision: 5,
      scale: 4,
    }).notNull(),
    importanceBenchmark: varchar('importance_benchmark', { length: 30 }),
    surpriseScore: decimal('surprise_score', { precision: 5, scale: 4 }),
    surpriseBaseline: varchar('surprise_baseline', { length: 100 }),
    effectivePeriodStart: timestamp('effective_period_start', {
      withTimezone: true,
    }).notNull(),
    effectivePeriodEnd: timestamp('effective_period_end', {
      withTimezone: true,
    }),
    effectiveDecayType: varchar('effective_decay_type', { length: 20 }).notNull(),
    metrics: jsonb('metrics').$type<
      Array<{ name: string; value: number; unit: string; yoyChange?: number | null }>
    >(),
    sourceUrl: text('source_url'),
    sourceTitle: varchar('source_title', { length: 500 }).notNull(),
    sourceSummary: text('source_summary').notNull(),
    sourcePublisher: varchar('source_publisher', { length: 100 }).notNull(),
    version: integer('version').notNull().default(1),
    processed: boolean('processed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.newsId],
      foreignColumns: [news.id],
      name: 'events_news_id_fk',
    }),
    index('events_category_idx').on(table.category),
    index('events_subcategory_idx').on(table.subcategory),
    index('events_occurred_at_idx').on(table.occurredAt),
    index('events_processed_idx').on(table.processed),
    index('events_news_id_idx').on(table.newsId),
  ],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

export const signalRules = pgTable(
  'signal_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    type: varchar('type', { length: 20 }).notNull(),
    eventType: varchar('event_type', { length: 50 }),
    enabled: boolean('enabled').notNull().default(true),
    multiplier: decimal('multiplier', { precision: 5, scale: 4 })
      .notNull()
      .default('1.0'),
    threshold: decimal('threshold', { precision: 5, scale: 4 })
      .notNull()
      .default('0.2'),
    enableSurprise: boolean('enable_surprise').notNull().default(true),
    enableConfidence: boolean('enable_confidence').notNull().default(true),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('signal_rules_type_idx').on(table.type),
    index('signal_rules_event_type_idx').on(table.eventType),
    index('signal_rules_enabled_idx').on(table.enabled),
  ],
);

export type SignalRule = typeof signalRules.$inferSelect;
export type NewSignalRule = typeof signalRules.$inferInsert;

export const signals = pgTable(
  'signals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    newsId: uuid('news_id'),
    stockCode: varchar('stock_code', { length: 20 }),
    stockName: varchar('stock_name', { length: 100 }),
    direction: varchar('direction', { length: 10 }),
    confidence: integer('confidence'),
    sentiment: varchar('sentiment', { length: 10 }),
    reasoning: text('reasoning'),
    keyFactors: jsonb('key_factors'),
    timeWindow: varchar('time_window', { length: 20 }),
    signalTime: timestamp('signal_time', { withTimezone: true }),
    eventId: uuid('event_id'),
    symbol: varchar('symbol', { length: 20 }),
    action: varchar('action', { length: 10 }),
    score: decimal('score', { precision: 5, scale: 4 }),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow(),
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validTo: timestamp('valid_to', { withTimezone: true }),
    reason: text('reason'),
    ruleId: uuid('rule_id'),
    ruleSnapshot: jsonb('rule_snapshot'),
    weight: decimal('weight', { precision: 5, scale: 4 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.eventId],
      foreignColumns: [events.id],
      name: 'signals_event_id_fk',
    }),
    foreignKey({
      columns: [table.ruleId],
      foreignColumns: [signalRules.id],
      name: 'signals_rule_id_fk',
    }),
    index('signals_news_id_idx').on(table.newsId),
    index('signals_stock_code_idx').on(table.stockCode),
    index('signals_direction_idx').on(table.direction),
    index('signals_confidence_idx').on(table.confidence),
    index('signals_sentiment_idx').on(table.sentiment),
    index('signals_signal_time_idx').on(table.signalTime),
    index('signals_event_id_idx').on(table.eventId),
    index('signals_symbol_idx').on(table.symbol),
    index('signals_action_idx').on(table.action),
    index('signals_score_idx').on(table.score),
    index('signals_generated_at_idx').on(table.generatedAt),
    index('signals_valid_from_idx').on(table.validFrom),
    index('signals_rule_id_idx').on(table.ruleId),
  ],
);

export type Signal = typeof signals.$inferSelect;
export type NewSignal = typeof signals.$inferInsert;

export const klines = pgTable(
  'klines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stockCode: varchar('stock_code', { length: 20 }).notNull(),
    period: varchar('period', { length: 10 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    open: decimal('open', { precision: 18, scale: 8 }).notNull(),
    close: decimal('close', { precision: 18, scale: 8 }).notNull(),
    high: decimal('high', { precision: 18, scale: 8 }).notNull(),
    low: decimal('low', { precision: 18, scale: 8 }).notNull(),
    volume: decimal('volume', { precision: 24, scale: 8 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('klines_stock_period_time_unique_idx').on(
      table.stockCode,
      table.period,
      table.timestamp,
    ),
    index('klines_stock_code_idx').on(table.stockCode),
    index('klines_period_idx').on(table.period),
    index('klines_timestamp_idx').on(table.timestamp),
  ],
);

export type Kline = typeof klines.$inferSelect;
export type NewKline = typeof klines.$inferInsert;

export const webhooks = pgTable(
  'webhooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    name: varchar('name', { length: 100 }).notNull(),
    url: text('url').notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    minConfidence: integer('min_confidence'),
    maxConfidence: integer('max_confidence'),
    minScore: decimal('min_score', { precision: 4, scale: 3 }),
    maxScore: decimal('max_score', { precision: 4, scale: 3 }),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'webhooks_user_id_fk',
    }),
    index('webhooks_user_id_idx').on(table.userId),
    index('webhooks_type_idx').on(table.type),
    index('webhooks_enabled_idx').on(table.enabled),
  ],
);

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;

export const schedulerTasks = pgTable(
  'scheduler_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    cronExpression: varchar('cron_expression', { length: 100 }).notNull(),
    enabled: boolean('enabled').notNull().default(true),
    lastExecutedAt: timestamp('last_executed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('scheduler_tasks_enabled_idx').on(table.enabled),
    index('scheduler_tasks_name_idx').on(table.name),
  ],
);

export type SchedulerTask = typeof schedulerTasks.$inferSelect;
export type NewSchedulerTask = typeof schedulerTasks.$inferInsert;

export const simulationAccounts = pgTable(
  'simulation_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    name: varchar('name', { length: 100 }),
    initialCapital: decimal('initial_capital', { precision: 18, scale: 2 }).notNull(),
    currentCapital: decimal('current_capital', { precision: 18, scale: 2 }).notNull(),
    availableCash: decimal('available_cash', { precision: 18, scale: 2 }).notNull(),
    totalProfit: decimal('total_profit', { precision: 18, scale: 2 }).notNull().default('0'),
    totalReturn: decimal('total_return', { precision: 18, scale: 4 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'simulation_accounts_user_id_fk',
    }),
    uniqueIndex('simulation_accounts_user_name_unique_idx').on(table.userId, table.name),
    index('simulation_accounts_user_id_idx').on(table.userId),
  ],
);

export type SimulationAccount = typeof simulationAccounts.$inferSelect;
export type NewSimulationAccount = typeof simulationAccounts.$inferInsert;

export const simulationPositions = pgTable(
  'simulation_positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull(),
    stockCode: varchar('stock_code', { length: 20 }).notNull(),
    stockName: varchar('stock_name', { length: 100 }).notNull(),
    quantity: integer('quantity').notNull(),
    avgCost: decimal('avg_cost', { precision: 18, scale: 2 }).notNull(),
    currentPrice: decimal('current_price', { precision: 18, scale: 2 }),
    marketValue: decimal('market_value', { precision: 18, scale: 2 }),
    profit: decimal('profit', { precision: 18, scale: 2 }).notNull().default('0'),
    return: decimal('return', { precision: 18, scale: 4 }).notNull().default('0'),
    takeProfitPrice: decimal('take_profit_price', { precision: 18, scale: 2 }),
    stopLossPrice: decimal('stop_loss_price', { precision: 18, scale: 2 }),
    tradeSource: varchar('trade_source', { length: 20 }).default('manual'),
    strategyId: uuid('strategy_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.accountId],
      foreignColumns: [simulationAccounts.id],
      name: 'simulation_positions_account_id_fk',
    }),
    foreignKey({
      columns: [table.strategyId],
      foreignColumns: [strategies.id],
      name: 'simulation_positions_strategy_id_fk',
    }),
    index('simulation_positions_account_id_idx').on(table.accountId),
    index('simulation_positions_stock_code_idx').on(table.stockCode),
    index('simulation_positions_strategy_id_idx').on(table.strategyId),
    uniqueIndex('simulation_positions_account_stock_unique_idx').on(table.accountId, table.stockCode),
  ],
);

export type SimulationPosition = typeof simulationPositions.$inferSelect;
export type NewSimulationPosition = typeof simulationPositions.$inferInsert;

export const simulationTrades = pgTable(
  'simulation_trades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull(),
    stockCode: varchar('stock_code', { length: 20 }).notNull(),
    stockName: varchar('stock_name', { length: 100 }).notNull(),
    type: varchar('type', { length: 10 }).notNull(),
    quantity: integer('quantity').notNull(),
    price: decimal('price', { precision: 18, scale: 2 }).notNull(),
    totalAmount: decimal('total_amount', { precision: 18, scale: 2 }).notNull(),
    profit: decimal('profit', { precision: 18, scale: 2 }),
    closeReason: varchar('close_reason', { length: 20 }),
    tradeSource: varchar('trade_source', { length: 20 }).default('manual'),
    strategyId: uuid('strategy_id'),
    tradeTime: timestamp('trade_time', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.accountId],
      foreignColumns: [simulationAccounts.id],
      name: 'simulation_trades_account_id_fk',
    }),
    foreignKey({
      columns: [table.strategyId],
      foreignColumns: [strategies.id],
      name: 'simulation_trades_strategy_id_fk',
    }),
    index('simulation_trades_account_id_idx').on(table.accountId),
    index('simulation_trades_stock_code_idx').on(table.stockCode),
    index('simulation_trades_trade_time_idx').on(table.tradeTime),
    index('simulation_trades_strategy_id_idx').on(table.strategyId),
  ],
);

export type SimulationTrade = typeof simulationTrades.$inferSelect;
export type NewSimulationTrade = typeof simulationTrades.$inferInsert;

export const simulationEquityCurve = pgTable(
  'simulation_equity_curve',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull(),
    totalEquity: decimal('total_equity', { precision: 18, scale: 2 }).notNull(),
    availableCash: decimal('available_cash', { precision: 18, scale: 2 }).notNull(),
    positionValue: decimal('position_value', { precision: 18, scale: 2 }).notNull(),
    totalProfit: decimal('total_profit', { precision: 18, scale: 2 }).notNull(),
    totalReturn: decimal('total_return', { precision: 18, scale: 4 }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.accountId],
      foreignColumns: [simulationAccounts.id],
      name: 'simulation_equity_curve_account_id_fk',
    }),
    index('simulation_equity_curve_account_id_idx').on(table.accountId),
    index('simulation_equity_curve_recorded_at_idx').on(table.recordedAt),
  ],
);

export type SimulationEquityCurve = typeof simulationEquityCurve.$inferSelect;
export type NewSimulationEquityCurve = typeof simulationEquityCurve.$inferInsert;

export const stockBlacklist = pgTable(
  'stock_blacklist',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stockCode: varchar('stock_code', { length: 20 }).notNull().unique(),
    stockName: varchar('stock_name', { length: 100 }).notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('stock_blacklist_stock_code_idx').on(table.stockCode),
  ],
);

export type StockBlacklist = typeof stockBlacklist.$inferSelect;
export type NewStockBlacklist = typeof stockBlacklist.$inferInsert;

export const stockTrackings = pgTable(
  'stock_trackings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    stockCode: varchar('stock_code', { length: 20 }).notNull(),
    stockName: varchar('stock_name', { length: 100 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    totalNews: integer('total_news').notNull().default(0),
    report: text('report'),
    reportGeneratedAt: timestamp('report_generated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'stock_trackings_user_id_fk',
    }),
    index('stock_trackings_user_id_idx').on(table.userId),
    index('stock_trackings_stock_code_idx').on(table.stockCode),
    index('stock_trackings_status_idx').on(table.status),
    uniqueIndex('stock_trackings_user_stock_unique_idx').on(table.userId, table.stockCode),
  ],
);

export type StockTracking = typeof stockTrackings.$inferSelect;
export type NewStockTracking = typeof stockTrackings.$inferInsert;

export const backtestRecords = pgTable(
  'backtest_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    name: varchar('name', { length: 200 }),
    description: text('description'),
    strategyId: uuid('strategy_id'),
    strategySnapshot: jsonb('strategy_snapshot').$type<Record<string, unknown>>(),
    stockCode: varchar('stock_code', { length: 20 }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    minConfidence: integer('min_confidence'),
    maxConfidence: integer('max_confidence'),
    directions: jsonb('directions').$type<string[]>(),
    stopLoss: decimal('stop_loss', { precision: 18, scale: 4 }),
    takeProfit: decimal('take_profit', { precision: 18, scale: 4 }),
    period: varchar('period', { length: 20 }).notNull().default('1d'),
    totalSignals: integer('total_signals'),
    filteredSignals: integer('filtered_signals'),
    totalTrades: integer('total_trades').notNull(),
    winningTrades: integer('winning_trades').notNull(),
    losingTrades: integer('losing_trades').notNull(),
    winRate: decimal('win_rate', { precision: 18, scale: 6 }),
    totalReturn: decimal('total_return', { precision: 18, scale: 4 }),
    totalReturnPct: decimal('total_return_pct', { precision: 18, scale: 6 }),
    avgReturn: decimal('avg_return', { precision: 18, scale: 4 }),
    avgReturnPct: decimal('avg_return_pct', { precision: 18, scale: 6 }),
    maxDrawdown: decimal('max_drawdown', { precision: 18, scale: 4 }),
    maxDrawdownPct: decimal('max_drawdown_pct', { precision: 18, scale: 6 }),
    sharpeRatio: decimal('sharpe_ratio', { precision: 18, scale: 6 }),
    profitFactor: decimal('profit_factor', { precision: 18, scale: 6 }),
    avgHoldingPeriod: decimal('avg_holding_period', { precision: 18, scale: 2 }),
    trades: jsonb('trades').$type<unknown[]>(),
    equityCurve: jsonb('equity_curve').$type<Array<{ time: string; equity: number }>>(),
    status: varchar('status', { length: 20 }).notNull().default('completed'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'backtest_records_user_id_fk',
    }),
    index('backtest_records_user_id_idx').on(table.userId),
    index('backtest_records_strategy_id_idx').on(table.strategyId),
    index('backtest_records_created_at_idx').on(table.createdAt),
    index('backtest_records_stock_code_idx').on(table.stockCode),
    index('backtest_records_start_time_idx').on(table.startTime),
    index('backtest_records_end_time_idx').on(table.endTime),
  ],
);

export type BacktestRecord = typeof backtestRecords.$inferSelect;
export type NewBacktestRecord = typeof backtestRecords.$inferInsert;

export const backtestTrades = pgTable(
  'backtest_trades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    backtestId: uuid('backtest_id').notNull(),
    strategyId: uuid('strategy_id').notNull(),
    signalId: uuid('signal_id'),
    eventId: uuid('event_id'),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    stockName: varchar('stock_name', { length: 100 }),
    direction: varchar('direction', { length: 10 }).notNull(),
    entryTime: timestamp('entry_time', { withTimezone: true }).notNull(),
    entryPrice: decimal('entry_price', { precision: 18, scale: 4 }).notNull(),
    exitTime: timestamp('exit_time', { withTimezone: true }),
    exitPrice: decimal('exit_price', { precision: 18, scale: 4 }),
    pnlPct: decimal('pnl_pct', { precision: 18, scale: 6 }),
    pnlAmount: decimal('pnl_amount', { precision: 18, scale: 2 }),
    signalScore: decimal('signal_score', { precision: 10, scale: 4 }),
    signalRuleId: varchar('signal_rule_id', { length: 100 }),
    signalReason: text('signal_reason'),
    exitReason: varchar('exit_reason', { length: 30 }),
    stopLossPrice: decimal('stop_loss_price', { precision: 18, scale: 4 }),
    takeProfitPrice: decimal('take_profit_price', { precision: 18, scale: 4 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'backtest_trades_user_id_fk',
    }),
    index('backtest_trades_user_id_idx').on(table.userId),
    index('backtest_trades_backtest_id_idx').on(table.backtestId),
    index('backtest_trades_strategy_id_idx').on(table.strategyId),
    index('backtest_trades_direction_idx').on(table.direction),
    index('backtest_trades_exit_reason_idx').on(table.exitReason),
  ],
);

export type BacktestTrade = typeof backtestTrades.$inferSelect;
export type NewBacktestTrade = typeof backtestTrades.$inferInsert;

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    sessionId: varchar('session_id', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull(),
    content: text('content').notNull(),
    toolName: varchar('tool_name', { length: 100 }),
    toolInput: jsonb('tool_input'),
    toolOutput: jsonb('tool_output'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('chat_messages_user_session_idx').on(table.userId, table.sessionId),
    index('chat_messages_created_at_idx').on(table.createdAt),
  ],
);

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    key: varchar('key', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    rateLimit: integer('rate_limit').notNull().default(60),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'api_keys_user_id_fk',
    }),
    index('api_keys_user_id_idx').on(table.userId),
    index('api_keys_key_idx').on(table.key),
    index('api_keys_status_idx').on(table.status),
  ],
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export const mcpLogs = pgTable(
  'mcp_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    apiKeyId: uuid('api_key_id').notNull(),
    method: varchar('method', { length: 50 }).notNull(),
    toolName: varchar('tool_name', { length: 100 }),
    requestBody: jsonb('request_body'),
    responseStatus: varchar('response_status', { length: 20 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.apiKeyId],
      foreignColumns: [apiKeys.id],
      name: 'mcp_logs_api_key_id_fk',
    }).onDelete('cascade'),
    index('mcp_logs_api_key_id_idx').on(table.apiKeyId),
    index('mcp_logs_method_idx').on(table.method),
    index('mcp_logs_created_at_idx').on(table.createdAt),
  ],
);

export type McpLog = typeof mcpLogs.$inferSelect;
export type NewMcpLog = typeof mcpLogs.$inferInsert;

export const stocks = pgTable(
  'stocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    market: varchar('market', { length: 10 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('stocks_code_idx').on(table.code),
  ],
);

export type Stock = typeof stocks.$inferSelect;
export type NewStock = typeof stocks.$inferInsert;

export const strategies = pgTable(
  'strategies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    enabled: boolean('enabled').notNull().default(true),
    minScore: decimal('min_score', { precision: 5, scale: 4 }).notNull(),
    maxScore: decimal('max_score', { precision: 5, scale: 4 }),
    allowedRuleIds: jsonb('allowed_rule_ids').$type<string[]>(),
    allowedCategories: jsonb('allowed_categories').$type<string[]>(),
    directionMode: varchar('direction_mode', { length: 20 }).notNull(),
    entryMode: varchar('entry_mode', { length: 20 }).notNull().default('next_open'),
    holdPeriod: integer('hold_period').notNull(),
    stopLossPct: decimal('stop_loss_pct', { precision: 5, scale: 4 }),
    takeProfitPct: decimal('take_profit_pct', { precision: 5, scale: 4 }),
    maxSignalsPerDay: integer('max_signals_per_day'),
    maxPositions: integer('max_positions'),
    webhookId: uuid('webhook_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'strategies_user_id_fk',
    }),
    foreignKey({
      columns: [table.webhookId],
      foreignColumns: [webhooks.id],
      name: 'strategies_webhook_id_fk',
    }),
    uniqueIndex('strategies_user_name_unique_idx').on(table.userId, table.name),
    index('strategies_user_id_idx').on(table.userId),
    index('strategies_enabled_idx').on(table.enabled),
    index('strategies_direction_mode_idx').on(table.directionMode),
    index('strategies_created_at_idx').on(table.createdAt),
    index('strategies_webhook_id_idx').on(table.webhookId),
  ],
);

export type Strategy = typeof strategies.$inferSelect;
export type NewStrategy = typeof strategies.$inferInsert;

export const strategiesRuntime = pgTable(
  'strategies_runtime',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    strategyId: uuid('strategy_id').notNull(),
    accountId: uuid('account_id'),
    webhookId: uuid('webhook_id'),
    enableWebhook: boolean('enable_webhook').notNull().default(true),
    enableSimulation: boolean('enable_simulation').notNull().default(false),
    enableLiveTrading: boolean('enable_live_trading').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.strategyId],
      foreignColumns: [strategies.id],
      name: 'strategies_runtime_strategy_id_fk',
    }),
    foreignKey({
      columns: [table.accountId],
      foreignColumns: [simulationAccounts.id],
      name: 'strategies_runtime_account_id_fk',
    }),
    foreignKey({
      columns: [table.webhookId],
      foreignColumns: [webhooks.id],
      name: 'strategies_runtime_webhook_id_fk',
    }),
    uniqueIndex('strategies_runtime_strategy_id_unique_idx').on(table.strategyId),
    index('strategies_runtime_account_id_idx').on(table.accountId),
    index('strategies_runtime_webhook_id_idx').on(table.webhookId),
  ],
);

export type StrategyRuntime = typeof strategiesRuntime.$inferSelect;
export type NewStrategyRuntime = typeof strategiesRuntime.$inferInsert;
