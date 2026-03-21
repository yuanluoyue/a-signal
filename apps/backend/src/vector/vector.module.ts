import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VectorService } from './vector.service.js';

@Module({
  imports: [ConfigModule],
  providers: [VectorService],
  exports: [VectorService],
})
export class VectorModule {}
