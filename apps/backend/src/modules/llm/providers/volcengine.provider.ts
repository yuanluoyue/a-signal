import { Injectable, Logger } from '@nestjs/common';
import { VolcengineService } from '../../../core/volcengine/volcengine.service.js';
import { ILlmProvider, LlmProviderRequest, LlmProviderResponse } from './provider.interface.js';
import { TokenCounter } from '../runtime/token-counter.js';

@Injectable()
export class VolcengineProvider implements ILlmProvider {
  private readonly logger = new Logger(VolcengineProvider.name);
  readonly name = 'volcengine';
  readonly supportedModels = ['deepseek-v3-2-251201', 'doubao-1.5-pro-256k', 'doubao-1.5-lite-32k'];

  constructor(private readonly volcengineService: VolcengineService) {}

  async chatCompletion(request: LlmProviderRequest): Promise<LlmProviderResponse> {
    const startTime = Date.now();
    const model = request.model || 'deepseek-v3-2-251201';

    const content = await this.volcengineService.chatCompletion(
      request.messages,
      {
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        responseFormat: request.responseFormat,
      },
    );

    const latencyMs = Date.now() - startTime;

    const promptText = request.messages.map((m) => m.content).join('');
    const promptTokens = TokenCounter.estimateTokens(promptText);
    const completionTokens = TokenCounter.estimateTokens(content);
    const totalTokens = promptTokens + completionTokens;

    return {
      content,
      promptTokens,
      completionTokens,
      totalTokens,
      model,
      latencyMs,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      return !!this.volcengineService;
    } catch {
      return false;
    }
  }
}
