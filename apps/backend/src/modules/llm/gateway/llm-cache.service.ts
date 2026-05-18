import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../../core/cache/cache.service.js';
import * as crypto from 'crypto';

export interface CachedLlmResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
}

@Injectable()
export class LlmCacheService {
  private readonly logger = new Logger(LlmCacheService.name);
  private static readonly DEFAULT_TTL_MS = 5 * 60 * 1000;

  constructor(private readonly cacheService: CacheService) {}

  private generateCacheKey(module: string, task: string, messages: Array<{ role: string; content: string }>): string {
    const content = JSON.stringify({ module, task, messages });
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `llm:cache:${hash}`;
  }

  async get(module: string, task: string, messages: Array<{ role: string; content: string }>): Promise<CachedLlmResponse | null> {
    const key = this.generateCacheKey(module, task, messages);
    const cached = await this.cacheService.get<CachedLlmResponse>(key);
    if (cached) {
      this.logger.log(`LlmCacheService.get: cache hit for module=${module}, task=${task}`);
    }
    return cached ?? null;
  }

  async set(
    module: string,
    task: string,
    messages: Array<{ role: string; content: string }>,
    response: CachedLlmResponse,
    ttlMs?: number,
  ): Promise<void> {
    const key = this.generateCacheKey(module, task, messages);
    await this.cacheService.set(key, response, ttlMs ?? LlmCacheService.DEFAULT_TTL_MS);
  }
}
