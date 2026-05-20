import { Module, forwardRef } from '@nestjs/common';
import { NewsService } from './news.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { QueueModule } from '../../core/queue/queue.module.js';
import { SignalsModule } from '../signals/signals.module.js';
import { VectorModule } from '../../core/vector/vector.module.js';
import { NewsFilterAgentModule } from '../news-filter-agent/news-filter-agent.module.js';

@Module({
  imports: [DbModule, QueueModule, forwardRef(() => SignalsModule), VectorModule, NewsFilterAgentModule],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
