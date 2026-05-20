export class TokenCounter {
  private static readonly CHARS_PER_TOKEN = 4;

  static estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / TokenCounter.CHARS_PER_TOKEN);
  }

  static extractUsage(raw: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  }): { promptTokens: number; completionTokens: number; totalTokens: number } {
    const promptTokens = raw.promptTokens ?? 0;
    const completionTokens = raw.completionTokens ?? 0;
    const totalTokens = raw.totalTokens ?? promptTokens + completionTokens;
    return { promptTokens, completionTokens, totalTokens };
  }
}
