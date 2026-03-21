import { Module } from '@nestjs/common';
import { BlacklistService } from './blacklist.service.js';
import { BlacklistController } from './blacklist.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [BlacklistController],
  providers: [BlacklistService],
  exports: [BlacklistService],
})
export class BlacklistModule {}
