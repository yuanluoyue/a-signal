import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private store = new Map<string, CacheEntry<unknown>>();
  private pendingRequests = new Map<string, Promise<unknown>>();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
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
    this.store.delete(key);
    this.pendingRequests.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.pendingRequests.clear();
  }
}
