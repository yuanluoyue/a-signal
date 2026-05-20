import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILlmProvider, LlmProviderRequest, LlmProviderResponse } from './provider.interface.js';
import { TokenCounter } from '../runtime/token-counter.js';

@Injectable()
export class OllamaProvider implements ILlmProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  readonly name = 'ollama';
  readonly supportedModels = ['deepseek-r1:8b', 'qwen2.5:7b', 'llama3.1:8b'];

  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
  }

  async chatCompletion(request: LlmProviderRequest): Promise<LlmProviderResponse> {
    const startTime = Date.now();
    const model = request.model || 'deepseek-r1:8b';

    const requestBody: Record<string, unknown> = {
      model,
      messages: request.messages,
      stream: false,
    };

    if (request.temperature !== undefined) requestBody.options = { temperature: request.temperature };
    if (request.maxTokens !== undefined)
      requestBody.options = { ...(requestBody.options as object), num_predict: request.maxTokens };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as {
      message?: { content?: string };
      model?: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    const content = data.message?.content || '';
    const latencyMs = Date.now() - startTime;

    const promptTokens = data.prompt_eval_count || TokenCounter.estimateTokens(request.messages.map((m) => m.content).join(''));
    const completionTokens = data.eval_count || TokenCounter.estimateTokens(content);

    return {
      content,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      model: data.model || model,
      latencyMs,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }
}
