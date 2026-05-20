import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILlmProvider, LlmProviderRequest, LlmProviderResponse } from './provider.interface.js';
import { TokenCounter } from '../runtime/token-counter.js';

@Injectable()
export class OpenRouterProvider implements ILlmProvider {
  private readonly logger = new Logger(OpenRouterProvider.name);
  readonly name = 'openrouter';
  readonly supportedModels = [
    'deepseek/deepseek-chat',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o-mini',
  ];

  constructor(private readonly configService: ConfigService) {}

  private getApiKey(): string | null {
    return this.configService.get<string>('OPENROUTER_API_KEY') || null;
  }

  async chatCompletion(request: LlmProviderRequest): Promise<LlmProviderResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('OpenRouterProvider: OPENROUTER_API_KEY not configured');

    const startTime = Date.now();
    const model = request.model || 'deepseek/deepseek-chat';

    const requestBody: Record<string, unknown> = {
      model,
      messages: request.messages,
      stream: false,
    };

    if (request.temperature !== undefined) requestBody.temperature = request.temperature;
    if (request.maxTokens !== undefined) requestBody.max_tokens = request.maxTokens;
    if (request.responseFormat) requestBody.response_format = request.responseFormat;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://a-signal.app',
        'X-Title': 'A Signal',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content || '';
    const latencyMs = Date.now() - startTime;
    const usage = TokenCounter.extractUsage({
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
    });

    return {
      content,
      promptTokens: usage.promptTokens || TokenCounter.estimateTokens(request.messages.map((m) => m.content).join('')),
      completionTokens: usage.completionTokens || TokenCounter.estimateTokens(content),
      totalTokens: usage.totalTokens || 0,
      model,
      latencyMs,
    };
  }

  async isAvailable(): Promise<boolean> {
    return !!this.getApiKey();
  }
}
