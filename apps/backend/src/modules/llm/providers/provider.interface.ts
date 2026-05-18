export interface LlmProviderResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  latencyMs: number;
}

export interface LlmProviderRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' };
}

export const LLM_PROVIDER_TOKEN = 'ILlmProvider';

export interface ILlmProvider {
  readonly name: string;
  readonly supportedModels: string[];
  chatCompletion(request: LlmProviderRequest): Promise<LlmProviderResponse>;
  isAvailable(): Promise<boolean>;
}
