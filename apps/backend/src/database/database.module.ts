import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './schema.js';
import { DatabaseService } from './database.service.js';
import { DRIZZLE_PROVIDER } from './database.constants.js';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_PROVIDER,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        
        const pool = new Pool({
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          user: configService.get<string>('DB_USER', 'admin'),
          password: configService.get<string>('DB_PASSWORD', 'password'),
          database: configService.get<string>('DB_NAME', 'a_signal'),
          ssl: false,
        });

        const db = drizzle(pool, { schema });

        // 自动执行迁移
        try {
          logger.log('Running database migrations...');
          await migrate(db, { migrationsFolder: './src/migrations' });
          logger.log('Database migrations completed successfully');
        } catch (error) {
          logger.error('Database migration failed:', error.message);
          // 如果是首次运行，可能没有迁移文件夹，忽略错误
          if (!error.message.includes('meta/_journal.json')) {
            throw error;
          }
        }

        return db;
      },
    },
    DatabaseService,
  ],
  exports: [DRIZZLE_PROVIDER, DatabaseService],
})
export class DatabaseModule {}
