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

// ==================== Users ====================
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

// ==================== News ====================
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

// ==================== Signals ====================
export const signals = pgTable(
  'signals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    newsId: uuid('news_id').notNull(),
    stockCode: varchar('stock_code', { length: 20 }).notNull(),
    stockName: varchar('stock_name', { length: 100 }).notNull(),
    direction: varchar('direction', { length: 10 }).notNull(),
    confidence: integer('confidence').notNull(),
    sentiment: varchar('sentiment', { length: 10 }).notNull(),
    reasoning: text('reasoning').notNull(),
    keyFactors: jsonb('key_factors').notNull().$type<string[]>(),
    timeWindow: varchar('time_window', { length: 20 }).notNull(),
    signalTime: timestamp('signal_time', { withTimezone: true }).notNull(),
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
      name: 'signals_news_id_fk',
    }),
    index('signals_news_id_idx').on(table.newsId),
    index('signals_stock_code_idx').on(table.stockCode),
    index('signals_direction_idx').on(table.direction),
    index('signals_confidence_idx').on(table.confidence),
    index('signals_sentiment_idx').on(table.sentiment),
    index('signals_signal_time_idx').on(table.signalTime),
  ],
);

export type Signal = typeof signals.$inferSelect;
export type NewSignal = typeof signals.$inferInsert;

// ==================== Klines ====================
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

// ==================== Webhooks ====================
export const webhooks = pgTable(
  'webhooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    url: text('url').notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    minConfidence: integer('min_confidence').notNull().default(0),
    maxConfidence: integer('max_confidence').notNull().default(100),
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
    index('webhooks_type_idx').on(table.type),
    index('webhooks_enabled_idx').on(table.enabled),
  ],
);

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;

// ==================== Scheduler Tasks ====================
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

// ==================== Simulation Accounts ====================
export const simulationAccounts = pgTable(
  'simulation_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
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
    index('simulation_accounts_user_id_idx').on(table.userId),
  ],
);

export type SimulationAccount = typeof simulationAccounts.$inferSelect;
export type NewSimulationAccount = typeof simulationAccounts.$inferInsert;

// ==================== Simulation Positions ====================
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
    index('simulation_positions_account_id_idx').on(table.accountId),
    index('simulation_positions_stock_code_idx').on(table.stockCode),
    uniqueIndex('simulation_positions_account_stock_unique_idx').on(table.accountId, table.stockCode),
  ],
);

export type SimulationPosition = typeof simulationPositions.$inferSelect;
export type NewSimulationPosition = typeof simulationPositions.$inferInsert;

// ==================== Simulation Trades ====================
export const simulationTrades = pgTable(
  'simulation_trades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull(),
    stockCode: varchar('stock_code', { length: 20 }).notNull(),
    stockName: varchar('stock_name', { length: 100 }).notNull(),
    type: varchar('type', { length: 10 }).notNull(), // buy/sell
    quantity: integer('quantity').notNull(),
    price: decimal('price', { precision: 18, scale: 2 }).notNull(),
    totalAmount: decimal('total_amount', { precision: 18, scale: 2 }).notNull(),
    profit: decimal('profit', { precision: 18, scale: 2 }), // 卖出时记录盈亏
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
    index('simulation_trades_account_id_idx').on(table.accountId),
    index('simulation_trades_stock_code_idx').on(table.stockCode),
    index('simulation_trades_trade_time_idx').on(table.tradeTime),
  ],
);

export type SimulationTrade = typeof simulationTrades.$inferSelect;
export type NewSimulationTrade = typeof simulationTrades.$inferInsert;

// ==================== Stock Blacklist ====================
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

// ==================== Stock Trackings ====================
export const stockTrackings = pgTable(
  'stock_trackings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stockCode: varchar('stock_code', { length: 20 }).notNull(),
    stockName: varchar('stock_name', { length: 100 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending/processing/completed/failed
    totalNews: integer('total_news').notNull().default(0),
    report: text('report'), // 研投报告
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
    index('stock_trackings_stock_code_idx').on(table.stockCode),
    index('stock_trackings_status_idx').on(table.status),
    uniqueIndex('stock_trackings_stock_unique_idx').on(table.stockCode),
  ],
);

export type StockTracking = typeof stockTrackings.$inferSelect;
export type NewStockTracking = typeof stockTrackings.$inferInsert;

// ==================== Backtest Records ====================
export const backtestRecords = pgTable(
  'backtest_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stockCode: varchar('stock_code', { length: 20 }), // 可选，用于关联股票追踪
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    minConfidence: integer('min_confidence').notNull(),
    maxConfidence: integer('max_confidence').notNull(),
    directions: jsonb('directions').notNull().$type<string[]>(),
    stopLoss: decimal('stop_loss', { precision: 18, scale: 4 }).notNull(),
    takeProfit: decimal('take_profit', { precision: 18, scale: 4 }).notNull(),
    period: varchar('period', { length: 10 }).notNull().default('4h'),
    totalTrades: integer('total_trades').notNull(),
    winningTrades: integer('winning_trades').notNull(),
    losingTrades: integer('losing_trades').notNull(),
    winRate: decimal('win_rate', { precision: 18, scale: 4 }).notNull(),
    totalReturn: decimal('total_return', { precision: 18, scale: 4 }).notNull(),
    maxDrawdown: decimal('max_drawdown', { precision: 18, scale: 4 }).notNull(),
    avgReturn: decimal('avg_return', { precision: 18, scale: 4 }).notNull(),
    trades: jsonb('trades').notNull().$type<unknown[]>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('backtest_records_created_at_idx').on(table.createdAt),
    index('backtest_records_stock_code_idx').on(table.stockCode),
  ],
);

export type BacktestRecord = typeof backtestRecords.$inferSelect;
export type NewBacktestRecord = typeof backtestRecords.$inferInsert;

// ==================== Chat Messages ====================
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    sessionId: varchar('session_id', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull(), // user, assistant, tool
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
