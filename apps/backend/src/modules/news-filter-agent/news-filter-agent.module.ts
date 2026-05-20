import { Module } from '@nestjs/common';
import { DbModule } from '../../core/db/db.module.js';
import { LlmModule } from '../llm/llm.module.js';
import { NewsFilterAgentService } from './news-filter-agent.service.js';
import { NewsFilterAgentController } from '../../interfaces/admin/news-filter-agent/news-filter-agent.controller.js';

@Module({
  imports: [DbModule, LlmModule],
  providers: [NewsFilterAgentService],
  controllers: [NewsFilterAgentController],
  exports: [NewsFilterAgentService],
})
export class NewsFilterAgentModule {}
