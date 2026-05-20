import { Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { APP_GUARD } from '@nestjs/core';
import { DbModule } from './core/db/db.module.js';
import { CacheModule } from './core/cache/cache.module.js';
import { QueueModule } from './core/queue/queue.module.js';
import { VectorModule } from './core/vector/vector.module.js';
import { VolcengineModule } from './core/volcengine/volcengine.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { NewsModule } from './modules/news/news.module.js';
import { SignalsModule } from './modules/signals/signals.module.js';
import { KlinesModule } from './modules/klines/klines.module.js';
import { SchedulerModule } from './modules/scheduler/scheduler.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { BacktestModule } from './modules/backtest/backtest.module.js';
import { BlacklistModule } from './modules/blacklist/blacklist.module.js';
import { StockModule } from './modules/stock/stock.module.js';
import { SimulationModule } from './modules/simulation/simulation.module.js';
import { StockTrackingModule } from './modules/stock-tracking/stock-tracking.module.js';
import { EventModule } from './modules/event/event.module.js';
import { AgentModule } from './modules/agent/agent.module.js';
import { ApiKeyModule } from './modules/api-key/api-key.module.js';
import { McpModule } from './modules/mcp/mcp.module.js';
import { SignalRuleModule } from './modules/signal-rule/signal-rule.module.js';
import { SignalGeneratorModule } from './modules/signal-generator/signal-generator.module.js';
import { StrategyModule } from './modules/strategy/strategy.module.js';
import { AuditLogModule } from './modules/audit-log/audit-log.module.js';
import { TradingMemoryModule } from './modules/trading-memory/trading-memory.module.js';
import { LlmModule } from './modules/llm/llm.module.js';
import { NewsFilterAgentModule } from './modules/news-filter-agent/news-filter-agent.module.js';
import { AuthController } from './interfaces/admin/auth/auth.controller.js';
import { AuditLogController } from './interfaces/admin/audit-log/audit-log.controller.js';
import { TradingMemoryController } from './interfaces/admin/trading-memory/trading-memory.controller.js';
import { TradingAgentController } from './interfaces/admin/trading-agent/trading-agent.controller.js';
import { LlmController } from './interfaces/admin/llm/llm.controller.js';
import { NewsFilterAgentController } from './interfaces/admin/news-filter-agent/news-filter-agent.controller.js';
import { NewsController } from './interfaces/admin/news/news.controller.js';
import { SignalsController } from './interfaces/admin/signals/signals.controller.js';
import { SignalRulesController } from './interfaces/admin/signal-rules/signal-rules.controller.js';
import { BacktestController } from './interfaces/admin/backtest/backtest.controller.js';
import { StocksController } from './interfaces/admin/stock/stocks.controller.js';
import { KlinesController } from './interfaces/admin/klines/klines.controller.js';
import { DashboardController } from './interfaces/admin/dashboard/dashboard.controller.js';
import { BlacklistController } from './interfaces/admin/blacklist/blacklist.controller.js';
import { SimulationController } from './interfaces/admin/simulation/simulation.controller.js';
import { StockTrackingController } from './interfaces/admin/stock-tracking/stock-tracking.controller.js';
import { SchedulerController } from './interfaces/admin/scheduler/scheduler.controller.js';
import { WebhooksController } from './interfaces/admin/notifications/webhooks.controller.js';
import { ApiKeyController } from './interfaces/admin/api-key/api-key.controller.js';
import { AgentController } from './interfaces/admin/agent/agent.controller.js';
import { EventsController } from './interfaces/admin/events/events.controller.js';
import { StrategyController } from './interfaces/admin/strategy/strategy.controller.js';
import { StockController } from './interfaces/admin/stock/stock.controller.js';
import { McpController } from './interfaces/mcp/mcp.controller.js';
import { HealthController } from './interfaces/admin/health/health.controller.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { SchedulerTasksService } from './jobs/scheduler-tasks.service.js';
import { NewsCrawlConsumer } from './jobs/news-crawl.consumer.js';
import { NewsVectorizeConsumer } from './jobs/news-vectorize.consumer.js';
import { KlineFetchConsumer } from './jobs/kline-fetch.consumer.js';
import { StockTrackFetchConsumer } from './jobs/stock-track-fetch.consumer.js';
import { EventAnalyzeConsumer } from './jobs/event-analyze.consumer.js';

const jwtAuthGuardProvider: Provider = {
  provide: APP_GUARD,
  useClass: JwtAuthGuard,
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../docker/.env', '.env'],
    }),
    TerminusModule,
    DbModule,
    CacheModule,
    QueueModule,
    VectorModule,
    VolcengineModule,
    AuthModule,
    UsersModule,
    NewsModule,
    SignalsModule,
    KlinesModule,
    SchedulerModule,
    NotificationsModule,
    DashboardModule,
    BacktestModule,
    BlacklistModule,
    StockModule,
    SimulationModule,
    StockTrackingModule,
    EventModule,
    AgentModule,
    ApiKeyModule,
    McpModule,
    SignalRuleModule,
    SignalGeneratorModule,
    StrategyModule,
    AuditLogModule,
    TradingMemoryModule,
    LlmModule,
    NewsFilterAgentModule,
  ],
  controllers: [
    AuthController,
    NewsController,
    SignalsController,
    SignalRulesController,
    BacktestController,
    StocksController,
    KlinesController,
    DashboardController,
    BlacklistController,
    SimulationController,
    StockTrackingController,
    SchedulerController,
    WebhooksController,
    ApiKeyController,
    AgentController,
    EventsController,
    StrategyController,
    StockController,
    McpController,
    HealthController,
    AuditLogController,
    TradingMemoryController,
    TradingAgentController,
    LlmController,
    NewsFilterAgentController,
  ],
  providers: [
    jwtAuthGuardProvider,
    SchedulerTasksService,
    NewsCrawlConsumer,
    NewsVectorizeConsumer,
    KlineFetchConsumer,
    StockTrackFetchConsumer,
    EventAnalyzeConsumer,
  ],
})
export class AppModule {}
