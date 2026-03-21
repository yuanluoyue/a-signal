import { Module } from '@nestjs/common';
import { NewsService } from './news.service.js';
import { NewsController } from './news.controller.js';
import { NewsCrawlConsumer } from './news-crawl.consumer.js';
import { NewsVectorizeConsumer } from './news-vectorize.consumer.js';
import { DatabaseModule } from '../database/database.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { SignalsModule } from '../signals/signals.module.js';
import { VolcengineModule } from '../volcengine/volcengine.module.js';
import { VectorModule } from '../vector/vector.module.js';

@Module({
  imports: [DatabaseModule, QueueModule, SignalsModule, VolcengineModule, VectorModule],
  controllers: [NewsController],
  providers: [NewsService, NewsCrawlConsumer, NewsVectorizeConsumer],
  exports: [NewsService],
})
export class NewsModule {}
