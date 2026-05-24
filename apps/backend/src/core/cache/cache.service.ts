import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private pendingRequests = new Map<string, Promise<unknown>>();
  private readonly redis;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getClient();
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.redis.get(key);
      if (value === null) return undefined;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`CacheService.get: error reading key ${key}:`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'PX', ttlMs);
    } catch (error) {
      this.logger.error(`CacheService.set: error writing key ${key}:`, error);
    }
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      this.logger.debug(`CacheService.getOrSet: cache hit for key ${key}`);
      return cached;
    }

    const pending = this.pendingRequests.get(key) as Promise<T> | undefined;
    if (pending) {
      this.logger.debug(`CacheService.getOrSet: dedup hit for key ${key}`);
      return pending;
    }

    this.logger.debug(`CacheService.getOrSet: cache miss for key ${key}, fetching...`);
    const promise = factory().then(async (value) => {
      await this.set(key, value, ttlMs);
      this.pendingRequests.delete(key);
      return value;
    }).catch((error) => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.pendingRequests.delete(key);
    } catch (error) {
      this.logger.error(`CacheService.delete: error deleting key ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      const patterns = ['llm:cache:*', 'kline:check:*', 'price:*'];
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
      this.pendingRequests.clear();
    } catch (error) {
      this.logger.error('CacheService.clear: error clearing cache:', error);
    }
  }
}
