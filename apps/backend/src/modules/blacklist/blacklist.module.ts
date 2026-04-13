import { Module } from '@nestjs/common';
import { BlacklistService } from './blacklist.service.js';
import { DbModule } from '../../core/db/db.module.js';

@Module({
  imports: [DbModule],
  providers: [BlacklistService],
  exports: [BlacklistService],
})
export class BlacklistModule {}
