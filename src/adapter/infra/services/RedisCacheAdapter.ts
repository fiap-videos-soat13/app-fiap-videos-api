import Redis from "ioredis";
import { CachePort } from "@domain/services/CoreServices";

export class RedisCacheAdapter extends CachePort {
  private readonly client: Redis;

  constructor(redisUrl: string) {
    super();
    this.client = new Redis(redisUrl, { maxRetriesPerRequest: 2 });
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  }

  async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}
