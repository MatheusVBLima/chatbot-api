import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
  private readonly cache = new Map<string, any>();

  /**
   * Stores a value in the cache with a Time-To-Live (TTL).
   * @param key The cache key.
   * @param value The value to store.
   * @param ttl The TTL in milliseconds. Defaults to 60 seconds.
   */
  set(key: string, value: any, ttl: number = 60000): void {
    // Clear any existing timeout for this key
    if (this.cache.has(key)) {
        const oldTimeout = this.cache.get(key).timeout;
        clearTimeout(oldTimeout);
    }

    const timeout = setTimeout(() => this.cache.delete(key), ttl);
    this.cache.set(key, { value, timeout });
  }

  /**
   * Retrieves a value from the cache.
   * @param key The cache key.
   * @returns The cached value or undefined if not found.
   */
  get(key: string): any {
    const entry = this.cache.get(key);
    return entry ? entry.value : undefined;
  }

  /**
   * Deletes a value from the cache.
   * @param key The cache key.
   */
  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
        clearTimeout(entry.timeout);
        this.cache.delete(key);
    }
  }
} 