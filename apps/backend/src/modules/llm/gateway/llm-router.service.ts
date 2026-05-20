import { Injectable, Logger } from '@nestjs/common';
import { ILlmProvider } from '../providers/provider.interface.js';
import { VolcengineProvider } from '../providers/volcengine.provider.js';
import { DeepseekProvider } from '../providers/deepseek.provider.js';
import { OpenRouterProvider } from '../providers/openrouter.provider.js';
import { OllamaProvider } from '../providers/ollama.provider.js';

@Injectable()
export class LlmRouterService {
  private readonly logger = new Logger(LlmRouterService.name);
  private readonly providers: Map<string, ILlmProvider> = new Map();

  constructor(
    private readonly volcengineProvider: VolcengineProvider,
    private readonly deepseekProvider: DeepseekProvider,
    private readonly openRouterProvider: OpenRouterProvider,
    private readonly ollamaProvider: OllamaProvider,
  ) {
    this.providers.set('volcengine', this.volcengineProvider);
    this.providers.set('deepseek', this.deepseekProvider);
    this.providers.set('openrouter', this.openRouterProvider);
    this.providers.set('ollama', this.ollamaProvider);
  }

  getProvider(providerName: string): ILlmProvider | null {
    return this.providers.get(providerName) ?? null;
  }

  getAllProviders(): Map<string, ILlmProvider> {
    return new Map(this.providers);
  }

  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  async getAvailableProviders(): Promise<string[]> {
    const available: string[] = [];
    for (const [name, provider] of this.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        if (isAvailable) available.push(name);
      } catch {
        // provider not available
      }
    }
    return available;
  }
}
