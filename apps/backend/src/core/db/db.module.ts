import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './schema.js';
import { DbService } from './db.service.js';
import { DRIZZLE_PROVIDER } from './db.constants.js';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_PROVIDER,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DbModule');

        const pool = new Pool({
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          user: configService.get<string>('DB_USER', 'admin'),
          password: configService.get<string>('DB_PASSWORD', 'password'),
          database: configService.get<string>('DB_NAME', 'a_signal'),
          ssl: false,
        });

        const db = drizzle(pool, { schema });

        try {
          logger.log('Running database migrations...');
          await migrate(db, { migrationsFolder: './migrations' });
          logger.log('Database migrations completed successfully');
        } catch (error) {
          logger.error('Database migration failed:', error.message);
          if (!error.message.includes('meta/_journal.json')) {
            throw error;
          }
        }

        return db;
      },
    },
    DbService,
  ],
  exports: [DRIZZLE_PROVIDER, DbService],
})
export class DbModule {}
