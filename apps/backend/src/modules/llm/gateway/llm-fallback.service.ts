import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderRequest, LlmProviderResponse } from '../providers/provider.interface.js';
import { LlmRouterService } from './llm-router.service.js';

const FALLBACK_CHAINS: Record<string, string[]> = {
  volcengine: ['deepseek', 'openrouter', 'ollama'],
  deepseek: ['volcengine', 'openrouter', 'ollama'],
  openrouter: ['volcengine', 'deepseek', 'ollama'],
  ollama: ['volcengine', 'deepseek', 'openrouter'],
};

@Injectable()
export class LlmFallbackService {
  private readonly logger = new Logger(LlmFallbackService.name);

  constructor(private readonly routerService: LlmRouterService) {}

  async executeWithFallback(
    primaryProvider: string,
    request: LlmProviderRequest,
    enabledProviders: string[],
  ): Promise<{ response: LlmProviderResponse; usedProvider: string }> {
    const chain = FALLBACK_CHAINS[primaryProvider] || ['volcengine', 'deepseek', 'openrouter', 'ollama'];

    for (const fallbackName of chain) {
      if (fallbackName === primaryProvider) continue;
      if (!enabledProviders.includes(fallbackName)) continue;

      const provider = this.routerService.getProvider(fallbackName);
      if (!provider) continue;

      try {
        this.logger.log(`LlmFallbackService: trying fallback provider ${fallbackName}`);
        const response = await provider.chatCompletion(request);
        return { response, usedProvider: fallbackName };
      } catch (error) {
        this.logger.warn(`LlmFallbackService: fallback provider ${fallbackName} failed: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
    }

    throw new Error(`All fallback providers failed for primary provider: ${primaryProvider}`);
  }
}
