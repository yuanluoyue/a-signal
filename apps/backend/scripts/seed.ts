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

    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await db.insert(schema.users).values({
        nickname: 'admin',
        email: adminEmail,
        password: hashedPassword,
      });

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
        await db.insert(schema.strategies).values(strategy);
        console.log(`Created strategy: ${strategy.name}`);
      } else {
        console.log(`Strategy already exists: ${strategy.name}`);
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
