import { Injectable } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimiterService {
  private readonly storage = new Map<string, RateLimitEntry>();

  /**
   * 检查是否超过限流阈值
   * @param key 限流键（通常是 API Key）
   * @param limit 每分钟限制次数
   * @returns 是否允许请求
   */
  async checkLimit(key: string, limit: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // 当前分钟的开始时间

    const entry = this.storage.get(key);

    if (!entry || entry.resetTime < now) {
      // 新窗口或已过期，重置计数
      this.storage.set(key, {
        count: 1,
        resetTime: windowStart + 60000, // 下一分钟
      });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * 获取当前限流状态
   */
  getStatus(key: string): { remaining: number; resetTime: number } | null {
    const entry = this.storage.get(key);
    if (!entry) {
      return null;
    }
    return {
      remaining: Math.max(0, entry.count),
      resetTime: entry.resetTime,
    };
  }

  /**
   * 清理过期的限流记录
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (entry.resetTime < now) {
        this.storage.delete(key);
      }
    }
  }
}
