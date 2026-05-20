import { Module } from '@nestjs/common';
import { DbModule } from '../../core/db/db.module.js';
import { CacheModule } from '../../core/cache/cache.module.js';
import { VolcengineModule } from '../../core/volcengine/volcengine.module.js';
import { ConfigModule } from '@nestjs/config';

import { VolcengineProvider } from './providers/volcengine.provider.js';
import { DeepseekProvider } from './providers/deepseek.provider.js';
import { OpenRouterProvider } from './providers/openrouter.provider.js';
import { OllamaProvider } from './providers/ollama.provider.js';

import { LlmCacheService } from './gateway/llm-cache.service.js';
import { LlmRouterService } from './gateway/llm-router.service.js';
import { LlmFallbackService } from './gateway/llm-fallback.service.js';
import { LlmUsageService } from './gateway/llm-usage.service.js';
import { LlmService } from './gateway/llm.service.js';

@Module({
  imports: [DbModule, CacheModule, VolcengineModule, ConfigModule],
  providers: [
    VolcengineProvider,
    DeepseekProvider,
    OpenRouterProvider,
    OllamaProvider,
    LlmCacheService,
    LlmRouterService,
    LlmFallbackService,
    LlmUsageService,
    LlmService,
  ],
  exports: [LlmService, LlmUsageService],
})
export class LlmModule {}
