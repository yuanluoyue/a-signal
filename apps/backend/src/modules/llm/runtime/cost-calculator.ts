export interface ModelPricing {
  promptPricePerMToken: number;
  completionPricePerMToken: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'deepseek-v3-2-251201': { promptPricePerMToken: 2, completionPricePerMToken: 8 },
  'deepseek-chat': { promptPricePerMToken: 1, completionPricePerMToken: 2 },
  'deepseek-reasoner': { promptPricePerMToken: 4, completionPricePerMToken: 16 },
  'deepseek/deepseek-chat': { promptPricePerMToken: 1, completionPricePerMToken: 2 },
  'deepseek-r1:8b': { promptPricePerMToken: 0, completionPricePerMToken: 0 },
  'doubao-1.5-pro-256k': { promptPricePerMToken: 3, completionPricePerMToken: 9 },
  'doubao-1.5-lite-32k': { promptPricePerMToken: 0.35, completionPricePerMToken: 0.65 },
};

export class CostCalculator {
  static calculate(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) return 0;
    const promptCost = (promptTokens / 1_000_000) * pricing.promptPricePerMToken;
    const completionCost = (completionTokens / 1_000_000) * pricing.completionPricePerMToken;
    return promptCost + completionCost;
  }

  static getPricing(model: string): ModelPricing | undefined {
    return MODEL_PRICING[model];
  }

  static getAllPricing(): Record<string, ModelPricing> {
    return { ...MODEL_PRICING };
  }
}
