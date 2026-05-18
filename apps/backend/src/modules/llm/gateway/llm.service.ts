import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { LlmProviderRequest, LlmProviderResponse } from '../providers/provider.interface.js';
import { LlmRouterService } from './llm-router.service.js';
import { LlmCacheService, CachedLlmResponse } from './llm-cache.service.js';
import { LlmFallbackService } from './llm-fallback.service.js';
import { LlmUsageService } from './llm-usage.service.js';
import { RetryPolicy } from '../runtime/retry-policy.js';
import { CostCalculator } from '../runtime/cost-calculator.js';
import { ModelSelector } from '../runtime/model-selector.js';

export interface ChatCompletionOptions {
  module: string;
  task: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' };
  userId?: string;
  traceId?: string;
  enableCache?: boolean;
  enableFallback?: boolean;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly routerService: LlmRouterService,
    private readonly cacheService: LlmCacheService,
    private readonly fallbackService: LlmFallbackService,
    private readonly usageService: LlmUsageService,
  ) {}

  async chatCompletion(options: ChatCompletionOptions): Promise<string> {
    const {
      module,
      task,
      messages,
      provider: requestedProvider,
      model: requestedModel,
      temperature,
      maxTokens,
      responseFormat,
      userId,
      traceId,
      enableCache = true,
      enableFallback = true,
    } = options;

    const requestId = crypto.randomUUID();

    let providerName = requestedProvider;
    let modelName = requestedModel;

    if (!providerName) {
      const enabledProviders = await this.usageService.getEnabledProviders();
      const selection = ModelSelector.selectModel(task, enabledProviders);
      if (selection) {
        providerName = selection.provider;
        if (!modelName) modelName = selection.model;
      } else {
        providerName = 'volcengine';
      }
    }

    if (!modelName) {
      const config = await this.usageService.getProviderConfig(providerName);
      modelName = config?.defaultModel || 'deepseek-v3-2-251201';
    }

    const budgetCheck = await this.usageService.checkBudget(providerName);
    if (!budgetCheck.allowed) {
      this.logger.error(`LlmService.chatCompletion: LLM daily budget exceeded for provider ${providerName}`);
      throw new Error(`LLM daily budget exceeded for provider ${providerName}`);
    }

    const rpmAllowed = await this.usageService.checkRpmLimit(providerName);
    if (!rpmAllowed) {
      this.logger.error(`LlmService.chatCompletion: LLM RPM limit exceeded for provider ${providerName}`);
      throw new Error(`LLM RPM limit exceeded for provider ${providerName}`);
    }

    if (enableCache) {
      const cached = await this.cacheService.get(module, task, messages);
      if (cached) {
        await this.usageService.recordRequest({
          module,
          task,
          provider: providerName,
          model: modelName,
          userId,
          requestId,
          traceId,
          promptTokens: cached.promptTokens,
          completionTokens: cached.completionTokens,
          totalTokens: cached.totalTokens,
          estimatedCost: 0,
          latencyMs: 0,
          success: true,
          retryCount: 0,
          cacheHit: true,
        });
        return cached.content;
      }
    }

    const providerRequest: LlmProviderRequest = {
      messages,
      model: modelName,
      temperature,
      maxTokens,
      responseFormat,
    };

    const provider = this.routerService.getProvider(providerName);
    if (!provider) {
      throw new Error(`LLM provider not found: ${providerName}`);
    }

    let response: LlmProviderResponse;
    let retryCount = 0;
    let usedProvider = providerName;

    try {
      const retryResult = await RetryPolicy.executeWithRetry(
        () => provider.chatCompletion(providerRequest),
        (error, attempt) => {
          this.logger.warn(`LlmService.chatCompletion: retry attempt ${attempt} for provider ${providerName}: ${error.message}`);
        },
      );
      response = retryResult.result;
      retryCount = retryResult.retryCount;
    } catch (primaryError) {
      if (enableFallback) {
        try {
          const enabledProviders = await this.usageService.getEnabledProviders();
          const fallbackResult = await this.fallbackService.executeWithFallback(
            providerName,
            providerRequest,
            enabledProviders,
          );
          response = fallbackResult.response;
          usedProvider = fallbackResult.usedProvider;
        } catch (fallbackError) {
          const estimatedCost = CostCalculator.calculate(modelName, 0, 0);
          await this.usageService.recordRequest({
            module,
            task,
            provider: providerName,
            model: modelName,
            userId,
            requestId,
            traceId,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            estimatedCost,
            latencyMs: 0,
            success: false,
            errorMessage: primaryError instanceof Error ? primaryError.message : String(primaryError),
            retryCount,
            cacheHit: false,
          });
          throw primaryError;
        }
      } else {
        const estimatedCost = CostCalculator.calculate(modelName, 0, 0);
        await this.usageService.recordRequest({
          module,
          task,
          provider: providerName,
          model: modelName,
          userId,
          requestId,
          traceId,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost,
          latencyMs: 0,
          success: false,
          errorMessage: primaryError instanceof Error ? primaryError.message : String(primaryError),
          retryCount,
          cacheHit: false,
        });
        throw primaryError;
      }
    }

    const estimatedCost = CostCalculator.calculate(response.model, response.promptTokens, response.completionTokens);

    if (enableCache) {
      await this.cacheService.set(module, task, messages, {
        content: response.content,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        totalTokens: response.totalTokens,
        model: response.model,
      });
    }

    await this.usageService.recordRequest({
      module,
      task,
      provider: usedProvider,
      model: response.model,
      userId,
      requestId,
      traceId,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      totalTokens: response.totalTokens,
      estimatedCost,
      latencyMs: response.latencyMs,
      success: true,
      retryCount,
      cacheHit: false,
    });

    return response.content;
  }
}
