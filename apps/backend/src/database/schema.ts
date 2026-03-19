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
    confidenceThreshold: integer('confidence_threshold').notNull(),
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
