import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VolcengineService } from './volcengine.service.js';
import { VolcengineEmbeddingService } from './volcengine-embedding.service.js';

@Module({
  imports: [ConfigModule],
  providers: [VolcengineService, VolcengineEmbeddingService],
  exports: [VolcengineService, VolcengineEmbeddingService],
})
export class VolcengineModule {}
