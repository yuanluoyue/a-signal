import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VolcengineService } from './volcengine.service.js';

@Module({
  imports: [ConfigModule],
  providers: [VolcengineService],
  exports: [VolcengineService],
})
export class VolcengineModule {}
