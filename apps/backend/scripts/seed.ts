import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import * as schema from '../src/core/db/schema';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'a_signal',
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log('Starting seed...');

  try {
    const adminEmail = 'admin@example.com';
    const adminPassword = '123456';

    const existingAdmin = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, adminEmail))
      .limit(1);

    let adminUser = existingAdmin[0] || null;

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await db.insert(schema.users).values({
        nickname: 'admin',
        email: adminEmail,
        password: hashedPassword,
      });

      const [created] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, adminEmail))
        .limit(1);
      adminUser = created;

      console.log('Admin user created successfully');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    } else {
      console.log('Admin user already exists, skipping user creation');
    }

    // ==================== 信号规则数据 ====================
    console.log('Seeding signal rules...');

    const initialRules = [
      {
        name: 'global_default',
        type: 'global',
        eventType: null,
        enabled: true,
        multiplier: '1.0',
        threshold: '0.2',
        enableSurprise: true,
        enableConfidence: true,
        description: '全局默认规则',
      },
      {
        name: 'm_a_v1',
        type: 'specific',
        eventType: 'm_a',
        enabled: true,
        multiplier: '0.8',
        threshold: '0.2',
        enableSurprise: true,
        enableConfidence: true,
        description: '并购事件规则',
      },
      {
        name: 'earnings_forecast_v1',
        type: 'specific',
        eventType: 'earnings_forecast',
        enabled: true,
        multiplier: '1.2',
        threshold: '0.4',
        enableSurprise: true,
        enableConfidence: true,
        description: '盈利预测规则',
      },
      {
        name: 'earnings_actual_v1',
        type: 'specific',
        eventType: 'earnings_actual',
        enabled: true,
        multiplier: '1.2',
        threshold: '0.4',
        enableSurprise: true,
        enableConfidence: true,
        description: '实际盈利规则',
      },
      {
        name: 'policy_v1',
        type: 'specific',
        eventType: 'policy',
        enabled: false,
        multiplier: '1.0',
        threshold: '0.3',
        enableSurprise: true,
        enableConfidence: true,
        description: '政策事件规则',
      },
      {
        name: 'macro_v1',
        type: 'specific',
        eventType: 'macro',
        enabled: true,
        multiplier: '1.5',
        threshold: '0.15',
        enableSurprise: true,
        enableConfidence: true,
        description: '宏观经济规则',
      },
    ];

    for (const rule of initialRules) {
      const existing = await db
        .select()
        .from(schema.signalRules)
        .where(eq(schema.signalRules.name, rule.name));
      if (existing.length === 0) {
        await db.insert(schema.signalRules).values(rule);
        console.log(`Created signal rule: ${rule.name}`);
      } else {
        console.log(`Signal rule already exists: ${rule.name}`);
      }
    }

    // ==================== 定时任务数据 ====================
    console.log('Seeding scheduler tasks...');

    const schedulerTasksData = [
      {
        name: 'news-crawl',
        cronExpression: '0 0 19 * * *',
        description: '每天晚上7点抓取东方财富新闻',
        enabled: true,
      },
      {
        name: 'event-analyze',
        cronExpression: '0 0 20 * * *',
        description: '每天晚上8点分析未分析的新闻',
        enabled: true,
      },
      {
        name: 'kline-update',
        cronExpression: '0 0 8 * * *',
        description: '每天早上8点更新K线数据',
        enabled: true,
      },
    ];

    for (const task of schedulerTasksData) {
      const existing = await db
        .select()
        .from(schema.schedulerTasks)
        .where(eq(schema.schedulerTasks.name, task.name));
      if (existing.length === 0) {
        await db.insert(schema.schedulerTasks).values(task);
        console.log(`Created scheduler task: ${task.name}`);
      } else {
        console.log(`Scheduler task already exists: ${task.name}`);
      }
    }

    // ==================== 策略数据 ====================
    console.log('Seeding strategies...');

    const initialStrategies = [
      {
        name: '保守多头',
        description: '低风险多头策略，仅接受高分信号',
        enabled: true,
        minScore: '0.3',
        maxScore: null,
        allowedRuleIds: null,
        allowedCategories: null,
        directionMode: 'long_only',
        entryMode: 'next_open',
        holdPeriod: 5,
        stopLossPct: '0.03',
        takeProfitPct: '0.05',
        maxSignalsPerDay: 3,
        maxPositions: 5,
      },
      {
        name: '激进双向',
        description: '高频双向交易策略，接受更多信号',
        enabled: true,
        minScore: '0.15',
        maxScore: null,
        allowedRuleIds: null,
        allowedCategories: null,
        directionMode: 'both',
        entryMode: 'next_open',
        holdPeriod: 3,
        stopLossPct: '0.05',
        takeProfitPct: '0.08',
        maxSignalsPerDay: 5,
        maxPositions: 10,
      },
      {
        name: '空头对冲',
        description: '空头对冲策略，默认禁用',
        enabled: false,
        minScore: '0.25',
        maxScore: null,
        allowedRuleIds: null,
        allowedCategories: null,
        directionMode: 'short_only',
        entryMode: 'next_open',
        holdPeriod: 4,
        stopLossPct: '0.04',
        takeProfitPct: '0.06',
        maxSignalsPerDay: 2,
        maxPositions: 3,
      },
    ];

    for (const strategy of initialStrategies) {
      const existing = await db
        .select()
        .from(schema.strategies)
        .where(eq(schema.strategies.name, strategy.name));
      if (existing.length === 0) {
        await db.insert(schema.strategies).values({
          ...strategy,
          userId: adminUser!.id,
        });
        console.log(`Created strategy: ${strategy.name}`);
      } else {
        console.log(`Strategy already exists: ${strategy.name}`);
      }
    }

    console.log('Seeding strategies runtime...');

    const runtimeData = [
      {
        strategyName: '保守多头',
        webhookId: null,
        enableWebhook: true,
        enableSimulation: false,
        enableLiveTrading: false,
      },
      {
        strategyName: '激进双向',
        webhookId: null,
        enableWebhook: true,
        enableSimulation: false,
        enableLiveTrading: false,
      },
      {
        strategyName: '空头对冲',
        webhookId: null,
        enableWebhook: true,
        enableSimulation: false,
        enableLiveTrading: false,
      },
    ];

    for (const runtime of runtimeData) {
      const [strategy] = await db
        .select()
        .from(schema.strategies)
        .where(eq(schema.strategies.name, runtime.strategyName))
        .limit(1);

      if (strategy) {
        const existingRuntime = await db
          .select()
          .from(schema.strategiesRuntime)
          .where(eq(schema.strategiesRuntime.strategyId, strategy.id))
          .limit(1);

        if (existingRuntime.length === 0) {
          await db.insert(schema.strategiesRuntime).values({
            strategyId: strategy.id,
            webhookId: runtime.webhookId,
            enableWebhook: runtime.enableWebhook,
            enableSimulation: runtime.enableSimulation,
            enableLiveTrading: runtime.enableLiveTrading,
            accountId: null,
          });
          console.log(`Created runtime for strategy: ${runtime.strategyName}`);
        } else {
          console.log(`Runtime already exists for strategy: ${runtime.strategyName}`);
        }
      }
    }
    // ==================== 交易经验数据 ====================
    console.log('Seeding trading memories...');

    const initialTradingMemories = [
      {
        type: 'event_pattern',
        title: '并购事件短期做多模式',
        summary: '并购类事件发生后，标的公司股价在3-5个交易日内平均上涨2.3%，胜率68%',
        rationale: '基于过去200次并购事件的历史回测，市场对并购消息的反应通常在短期内偏正面，尤其是被收购方',
        tags: ['并购', '短期', '做多'],
        pattern: {
          eventType: 'm_a',
          signalDirection: 'long' as const,
        },
        stats: {
          sampleSize: 200,
          avgReturn: 0.023,
          winRate: 0.68,
          sharpeRatio: 1.45,
          maxDrawdown: -0.08,
          avgHoldDays: 4,
          profitFactor: 2.1,
        },
        confidence: '0.8500',
        status: 'active',
        firstObservedAt: new Date('2024-01-15'),
        lastValidatedAt: new Date('2025-05-01'),
        lastComputedAt: new Date('2025-05-10'),
      },
      {
        type: 'signal_pattern',
        title: '高分信号跟随策略',
        summary: '信号分数大于0.5时跟随做多，平均收益1.8%，胜率62%',
        tags: ['高分信号', '做多'],
        pattern: {
          scoreRange: [0.5, 1.0] as [number, number],
          signalDirection: 'long' as const,
        },
        stats: {
          sampleSize: 350,
          avgReturn: 0.018,
          winRate: 0.62,
          sharpeRatio: 1.2,
          maxDrawdown: -0.12,
          avgHoldDays: 3,
          profitFactor: 1.8,
        },
        confidence: '0.7800',
        status: 'active',
        firstObservedAt: new Date('2024-03-01'),
        lastValidatedAt: new Date('2025-04-28'),
        lastComputedAt: new Date('2025-05-08'),
      },
      {
        type: 'strategy_pattern',
        title: '保守多头低波动策略',
        summary: '低波动环境下保守多头策略表现稳定，夏普比率1.8',
        tags: ['保守', '多头', '低波动'],
        pattern: {
          marketRegime: 'low_volatility',
          strategyId: 'conservative_long',
        },
        stats: {
          sampleSize: 120,
          avgReturn: 0.012,
          expectancy: 0.008,
          winRate: 0.72,
          sharpeRatio: 1.8,
          maxDrawdown: -0.05,
          avgHoldDays: 5,
          profitFactor: 2.5,
          pnlStdDev: 0.015,
        },
        confidence: '0.9200',
        status: 'active',
        firstObservedAt: new Date('2024-02-01'),
        lastValidatedAt: new Date('2025-05-05'),
        lastComputedAt: new Date('2025-05-12'),
      },
      {
        type: 'market_regime_pattern',
        title: '高波动环境做空优势',
        summary: '高波动环境下做空策略胜率提升至58%，但需注意止损',
        tags: ['高波动', '做空', '风险控制'],
        pattern: {
          marketRegime: 'high_volatility',
          signalDirection: 'short' as const,
        },
        stats: {
          sampleSize: 85,
          avgReturn: 0.015,
          winRate: 0.58,
          sharpeRatio: 0.9,
          maxDrawdown: -0.15,
          avgHoldDays: 2,
          profitFactor: 1.4,
        },
        confidence: '0.6500',
        status: 'testing',
        firstObservedAt: new Date('2024-06-01'),
        lastValidatedAt: new Date('2025-03-15'),
        lastComputedAt: new Date('2025-04-20'),
      },
      {
        type: 'risk_pattern',
        title: '盈利超预期后追高风险',
        summary: '盈利超预期事件后追高买入风险较大，3日内回撤概率45%',
        rationale: '市场对盈利超预期的反应往往已经price-in，追高容易遭遇获利回吐',
        tags: ['盈利超预期', '追高', '风险'],
        pattern: {
          eventType: 'earnings_actual',
          eventSubcategory: 'earnings_beat',
          signalDirection: 'long' as const,
        },
        stats: {
          sampleSize: 150,
          avgReturn: -0.005,
          winRate: 0.45,
          sharpeRatio: -0.3,
          maxDrawdown: -0.2,
          avgHoldDays: 3,
          profitFactor: 0.8,
        },
        confidence: '0.7100',
        status: 'invalidated',
        firstObservedAt: new Date('2024-01-20'),
        lastValidatedAt: new Date('2025-01-10'),
        invalidatedAt: new Date('2025-02-01'),
        lastComputedAt: new Date('2025-02-01'),
      },
      {
        type: 'event_pattern',
        title: '政策利好短期效应',
        summary: '政策利好事件短期效应明显，但持续时间有限',
        tags: ['政策', '短期'],
        pattern: {
          eventType: 'policy',
        },
        stats: {
          sampleSize: 60,
          avgReturn: 0.01,
          winRate: 0.55,
          sharpeRatio: 0.7,
          maxDrawdown: -0.1,
          avgHoldDays: 2,
          profitFactor: 1.2,
        },
        confidence: '0.5200',
        status: 'dormant',
        firstObservedAt: new Date('2024-04-01'),
        lastValidatedAt: new Date('2024-12-01'),
        lastComputedAt: new Date('2025-01-15'),
      },
    ];

    for (const memory of initialTradingMemories) {
      const existing = await db
        .select()
        .from(schema.tradingMemories)
        .where(eq(schema.tradingMemories.title, memory.title));
      if (existing.length === 0) {
        await db.insert(schema.tradingMemories).values(memory);
        console.log(`Created trading memory: ${memory.title}`);
      } else {
        console.log(`Trading memory already exists: ${memory.title}`);
      }
    }

  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
