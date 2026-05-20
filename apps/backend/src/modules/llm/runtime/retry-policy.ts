export interface RetryResult<T> {
  result: T;
  retryCount: number;
}

export class RetryPolicy {
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY_MS = 1000;
  private static readonly MAX_DELAY_MS = 10000;

  static isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('timeout') || message.includes('timed out')) return true;
      if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests'))
        return true;
      if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504'))
        return true;
      if (
        message.includes('internal server error') ||
        message.includes('bad gateway') ||
        message.includes('service unavailable') ||
        message.includes('gateway timeout')
      )
        return true;
      if (message.includes('econnreset') || message.includes('econnrefused') || message.includes('socket hang up'))
        return true;
    }
    return false;
  }

  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    onRetry?: (error: Error, attempt: number) => void,
  ): Promise<RetryResult<T>> {
    let lastError: Error | undefined;
    let retryCount = 0;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const result = await fn();
        return { result, retryCount };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.MAX_RETRIES && this.isRetryableError(error)) {
          retryCount++;
          const delay = Math.min(this.BASE_DELAY_MS * Math.pow(2, attempt), this.MAX_DELAY_MS);
          const jitter = Math.random() * 0.3 * delay;
          onRetry?.(lastError, attempt + 1);
          await this.sleep(delay + jitter);
        } else {
          break;
        }
      }
    }

    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
