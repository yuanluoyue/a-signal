import { Module } from '@nestjs/common';
import { NewsService } from './news.service.js';
import { NewsController } from './news.controller.js';
import { NewsCrawlConsumer } from './news-crawl.consumer.js';
import { DatabaseModule } from '../database/database.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { SignalsModule } from '../signals/signals.module.js';

@Module({
  imports: [DatabaseModule, QueueModule, SignalsModule],
  controllers: [NewsController],
  providers: [NewsService, NewsCrawlConsumer],
  exports: [NewsService],
})
export class NewsModule {}
