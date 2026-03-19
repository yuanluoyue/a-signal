import { Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { QueueModule } from './queue/queue.module.js';
import { NewsModule } from './news/news.module.js';
import { SignalsModule } from './signals/signals.module.js';
import { KlinesModule } from './klines/klines.module.js';
import { SchedulerModule } from './scheduler/scheduler.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { BacktestModule } from './backtest/backtest.module.js';
import { HealthController } from './health.controller.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';

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
    DatabaseModule,
    AuthModule,
    UsersModule,
    QueueModule,
    NewsModule,
    SignalsModule,
    KlinesModule,
    SchedulerModule,
    NotificationsModule,
    DashboardModule,
    BacktestModule,
  ],
  controllers: [HealthController],
  providers: [jwtAuthGuardProvider],
})
export class AppModule {}
