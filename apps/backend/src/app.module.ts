import { Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
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
  ],
  controllers: [HealthController],
  providers: [jwtAuthGuardProvider],
})
export class AppModule {}
