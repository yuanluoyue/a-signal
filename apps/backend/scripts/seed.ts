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
        role: 'admin',
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

      if (!adminUser.role || adminUser.role !== 'admin') {
        await db
          .update(schema.users)
          .set({ role: 'admin' })
          .where(eq(schema.users.id, adminUser.id));
        console.log('Updated admin user role to admin');
      }
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
      {
        name: 'simulation-refresh',
        cronExpression: '0 0 */4 * * *',
        description: '每4小时刷新模拟交易持仓价格和止盈止损',
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

    // ==================== 交易代理运行时数据 ====================
    console.log('Seeding trading agent runtimes...');

    const existingAgentRuntime = await db
      .select()
      .from(schema.tradingAgentRuntimes)
      .where(eq(schema.tradingAgentRuntimes.userId, adminUser!.id))
      .limit(1);

    if (existingAgentRuntime.length === 0) {
      await db.insert(schema.tradingAgentRuntimes).values({
        userId: adminUser!.id,
        status: 'stopped',
      });
      console.log('Created trading agent runtime for admin user');
    } else {
      console.log('Trading agent runtime already exists for admin user');
    }

    // ==================== LLM 供应商配置数据 ====================
    console.log('Seeding LLM provider configs...');

    const providerConfigs = [
      {
        provider: 'volcengine',
        enabled: true,
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        defaultModel: 'deepseek-v3-2-251201',
        rpmLimit: 60,
        dailyBudget: 1000000,
      },
      {
        provider: 'deepseek',
        enabled: false,
        baseUrl: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
        rpmLimit: 60,
        dailyBudget: 1000000,
      },
      {
        provider: 'openrouter',
        enabled: false,
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultModel: 'deepseek/deepseek-chat',
        rpmLimit: 60,
        dailyBudget: 1000000,
      },
      {
        provider: 'ollama',
        enabled: false,
        baseUrl: 'http://localhost:11434',
        defaultModel: 'deepseek-r1:8b',
        rpmLimit: 120,
        dailyBudget: null,
      },
    ];

    for (const config of providerConfigs) {
      const existing = await db
        .select()
        .from(schema.llmProviderConfigs)
        .where(eq(schema.llmProviderConfigs.provider, config.provider));
      if (existing.length === 0) {
        await db.insert(schema.llmProviderConfigs).values(config);
        console.log(`Created LLM provider config: ${config.provider}`);
      } else {
        console.log(`LLM provider config already exists: ${config.provider}`);
      }
    }

    // ==================== 新闻过滤 Agent 配置数据 ====================
    console.log('Seeding news filter agent configs...');

    const existingFilterConfig = await db
      .select()
      .from(schema.newsFilterAgentConfigs)
      .limit(1);

    if (existingFilterConfig.length === 0) {
      await db.insert(schema.newsFilterAgentConfigs).values({
        enabled: false,
        prompt: `你是一个金融新闻过滤器。你的任务是根据新闻标题判断这条新闻是否值得进行深度金融事件分析。

判断标准：
1. 新闻是否与金融市场、股票、经济政策相关
2. 新闻是否可能包含影响交易决策的信息
3. 新闻是否涉及上市公司、行业政策、宏观经济等

应该跳过（skip）的新闻类型：
- 纯娱乐、体育新闻
- 与金融市场无关的社会新闻
- 重复或无实质内容的新闻
- 广告或推广内容

应该通过（analyze）的新闻类型：
- 上市公司相关新闻（业绩、并购、重组等）
- 宏观经济政策新闻（利率、GDP、通胀等）
- 行业政策变化新闻
- 市场行情相关新闻
- 国际贸易、地缘政治对市场有影响的新闻

请根据新闻标题做出判断，返回 JSON 格式结果。

新闻标题：{newsTitle}`,
      });
      console.log('Created default news filter agent config');
    } else {
      console.log('News filter agent config already exists');
    }

    // ==================== 菜单数据 ====================
    console.log('Seeding menus...');

    const existingMenus = await db.select().from(schema.menus);
    if (existingMenus.length === 0) {
      const allRoles = ['admin', 'normal'];
      const adminOnly = ['admin'];

      const menuData = [
        { name: '仪表盘', path: '/dashboard', icon: 'DashboardOutlined', sort: 0, visibleRoles: allRoles, parentId: null },
        { name: '数据中心', path: null, icon: 'DatabaseOutlined', sort: 1, visibleRoles: allRoles, parentId: null },
        { name: '新闻管理', path: '/news', icon: 'ReadOutlined', sort: 0, visibleRoles: allRoles, parentId: null },
        { name: '股票查询', path: '/stocks', icon: 'SearchOutlined', sort: 1, visibleRoles: allRoles, parentId: null },
        { name: '股票追踪', path: '/stock-trackings', icon: 'EyeOutlined', sort: 2, visibleRoles: allRoles, parentId: null },
        { name: '策略中心', path: null, icon: 'ExperimentOutlined', sort: 2, visibleRoles: allRoles, parentId: null },
        { name: '信号规则', path: '/signal-rules', icon: 'SettingOutlined', sort: 0, visibleRoles: allRoles, parentId: null },
        { name: '信号管理', path: '/signals', icon: 'BellOutlined', sort: 1, visibleRoles: allRoles, parentId: null },
        { name: '事件管理', path: '/events', icon: 'ThunderboltOutlined', sort: 2, visibleRoles: allRoles, parentId: null },
        { name: '策略管理', path: '/strategies', icon: 'CodeOutlined', sort: 3, visibleRoles: allRoles, parentId: null },
        { name: '回测记录', path: '/backtest', icon: 'LineChartOutlined', sort: 4, visibleRoles: allRoles, parentId: null },
        { name: '交易中心', path: null, icon: 'WalletOutlined', sort: 3, visibleRoles: allRoles, parentId: null },
        { name: '运行管理', path: '/runtime', icon: 'ControlOutlined', sort: 0, visibleRoles: allRoles, parentId: null },
        { name: '账户模拟', path: '/simulation', icon: 'DollarOutlined', sort: 1, visibleRoles: allRoles, parentId: null },
        { name: 'AI 智能体', path: null, icon: 'RobotOutlined', sort: 4, visibleRoles: allRoles, parentId: null },
        { name: '研究员 Agent', path: '/agent-chat', icon: 'MessageOutlined', sort: 0, visibleRoles: allRoles, parentId: null },
        { name: '交易 Agent', path: '/trading-agent', icon: 'ThunderboltOutlined', sort: 1, visibleRoles: allRoles, parentId: null },
        { name: '新闻过滤 Agent', path: '/news-filter-agent', icon: 'FilterOutlined', sort: 2, visibleRoles: allRoles, parentId: null },
        { name: '交易经验', path: '/trading-memory', icon: 'BulbOutlined', sort: 3, visibleRoles: allRoles, parentId: null },
        { name: 'AI 运行中心', path: '/llm-center', icon: 'CloudServerOutlined', sort: 4, visibleRoles: allRoles, parentId: null },
        { name: 'LLM 日志', path: '/llm-logs', icon: 'FileTextOutlined', sort: 5, visibleRoles: allRoles, parentId: null },
        { name: '分析中心', path: null, icon: 'FundOutlined', sort: 5, visibleRoles: allRoles, parentId: null },
        { name: '综合分析', path: '/analysis/overview', icon: 'BarChartOutlined', sort: 0, visibleRoles: allRoles, parentId: null },
        { name: '策略总览', path: '/analysis/strategies', icon: 'PieChartOutlined', sort: 1, visibleRoles: allRoles, parentId: null },
        { name: '系统设置', path: null, icon: 'SettingOutlined', sort: 6, visibleRoles: adminOnly, parentId: null },
        { name: '通知设置', path: '/settings/notifications', icon: 'NotificationOutlined', sort: 0, visibleRoles: adminOnly, parentId: null },
        { name: '定时任务', path: '/settings/scheduler', icon: 'ClockCircleOutlined', sort: 1, visibleRoles: adminOnly, parentId: null },
        { name: 'API Key', path: '/settings/api-keys', icon: 'KeyOutlined', sort: 2, visibleRoles: adminOnly, parentId: null },
        { name: '黑名单', path: '/blacklist', icon: 'BlockOutlined', sort: 3, visibleRoles: adminOnly, parentId: null },
        { name: '审计日志', path: '/audit-logs', icon: 'AuditOutlined', sort: 4, visibleRoles: adminOnly, parentId: null },
        { name: '用户管理', path: '/settings/users', icon: 'UserOutlined', sort: 5, visibleRoles: adminOnly, parentId: null },
        { name: '菜单管理', path: '/settings/menu-management', icon: 'MenuOutlined', sort: 6, visibleRoles: adminOnly, parentId: null },
      ];

      const insertedMenus = await db.insert(schema.menus).values(menuData).returning();

      const dataCenter = insertedMenus.find(m => m.name === '数据中心');
      const strategyCenter = insertedMenus.find(m => m.name === '策略中心');
      const tradingCenter = insertedMenus.find(m => m.name === '交易中心');
      const aiCenter = insertedMenus.find(m => m.name === 'AI 智能体');
      const analysisCenter = insertedMenus.find(m => m.name === '分析中心');
      const systemSettings = insertedMenus.find(m => m.name === '系统设置');

      const childUpdates: { menuId: string; parentId: string }[] = [];

      if (dataCenter) {
        ['新闻管理', '股票查询', '股票追踪'].forEach(name => {
          const menu = insertedMenus.find(m => m.name === name);
          if (menu) childUpdates.push({ menuId: menu.id, parentId: dataCenter.id });
        });
      }
      if (strategyCenter) {
        ['信号规则', '信号管理', '事件管理', '策略管理', '回测记录'].forEach(name => {
          const menu = insertedMenus.find(m => m.name === name);
          if (menu) childUpdates.push({ menuId: menu.id, parentId: strategyCenter.id });
        });
      }
      if (tradingCenter) {
        ['运行管理', '账户模拟'].forEach(name => {
          const menu = insertedMenus.find(m => m.name === name);
          if (menu) childUpdates.push({ menuId: menu.id, parentId: tradingCenter.id });
        });
      }
      if (aiCenter) {
        ['研究员 Agent', '交易 Agent', '新闻过滤 Agent', '交易经验', 'AI 运行中心', 'LLM 日志'].forEach(name => {
          const menu = insertedMenus.find(m => m.name === name);
          if (menu) childUpdates.push({ menuId: menu.id, parentId: aiCenter.id });
        });
      }
      if (analysisCenter) {
        ['综合分析', '策略总览'].forEach(name => {
          const menu = insertedMenus.find(m => m.name === name);
          if (menu) childUpdates.push({ menuId: menu.id, parentId: analysisCenter.id });
        });
      }
      if (systemSettings) {
        ['通知设置', '定时任务', 'API Key', '黑名单', '审计日志', '用户管理', '菜单管理'].forEach(name => {
          const menu = insertedMenus.find(m => m.name === name);
          if (menu) childUpdates.push({ menuId: menu.id, parentId: systemSettings.id });
        });
      }

      for (const update of childUpdates) {
        await db
          .update(schema.menus)
          .set({ parentId: update.parentId })
          .where(eq(schema.menus.id, update.menuId));
      }

      console.log(`Created ${insertedMenus.length} menus with parent-child relationships`);
    } else {
      console.log('Menus already exist, skipping menu creation');
    }

  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
