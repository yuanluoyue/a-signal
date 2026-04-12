import { Injectable, Logger } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly limits = new Map<string, RateLimitEntry>();
  private readonly windowMs = 60 * 1000;
  private readonly maxRequests = 60;

  async checkRateLimit(apiKeyId: string): Promise<boolean> {
    const now = Date.now();
    const entry = this.limits.get(apiKeyId);

    if (!entry || now >= entry.resetTime) {
      this.limits.set(apiKeyId, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      this.logger.warn(
        `[RateLimiterService] Rate limit exceeded for API key: ${apiKeyId}`,
      );
      return false;
    }

    entry.count++;
    return true;
  }

  getRemainingRequests(apiKeyId: string): number {
    const entry = this.limits.get(apiKeyId);
    if (!entry || Date.now() >= entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(apiKeyId: string): number {
    const entry = this.limits.get(apiKeyId);
    if (!entry || Date.now() >= entry.resetTime) {
      return Date.now() + this.windowMs;
    }
    return entry.resetTime;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}
