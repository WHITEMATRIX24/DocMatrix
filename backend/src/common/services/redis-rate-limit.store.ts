import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RateLimitStore, CounterResult } from './rate-limit-store.interface.js';

export class RedisRateLimitStore implements RateLimitStore {
  readonly name = 'redis';
  private readonly logger = new Logger(RedisRateLimitStore.name);
  private client: Redis | null = null;
  private connected = false;

  // Lua script for atomic increment with conditional expire
  private readonly INCR_SCRIPT = `
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    local ttl = redis.call('TTL', KEYS[1])
    return {current, ttl}
  `;

  constructor(private readonly redisUrl: string) {
    try {
      this.client = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 2,
        connectTimeout: 5000,
        enableReadyCheck: true,
        lazyConnect: false,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.error(`Redis connection failed after ${times} retries.`);
            return null; // Stop retrying automatically after 5 attempts
          }
          return Math.min(times * 200, 2000);
        },
      });

      this.client.on('connect', () => {
        this.connected = true;
        this.logger.log('Connected to shared Redis rate-limiting store.');
      });

      this.client.on('error', (err) => {
        this.connected = false;
        this.logger.error(`Redis rate-limit store error: ${err.message}`);
      });

      this.client.on('close', () => {
        this.connected = false;
      });
    } catch (err: any) {
      this.logger.error(`Failed to initialize Redis client: ${err.message}`);
      this.connected = false;
    }
  }

  isAvailable(): boolean {
    return this.connected && this.client !== null && this.client.status === 'ready';
  }

  async increment(key: string, ttlSeconds: number): Promise<CounterResult> {
    if (!this.client) {
      throw new Error('Redis client is not initialized');
    }

    try {
      // Execute atomic Lua script
      const res = (await this.client.eval(
        this.INCR_SCRIPT,
        1,
        key,
        String(ttlSeconds),
      )) as [number, number];

      const count = Number(res[0]);
      let ttl = Number(res[1]);
      if (ttl < 0) ttl = ttlSeconds;

      return { count, ttlRemainingSeconds: ttl };
    } catch (err: any) {
      this.logger.error(`Redis increment failed for key ${key}: ${err.message}`);
      throw err;
    }
  }

  async get(key: string): Promise<CounterResult | null> {
    if (!this.client) return null;
    try {
      const pipeline = this.client.pipeline();
      pipeline.get(key);
      pipeline.ttl(key);
      const results = await pipeline.exec();

      if (!results || !results[0] || !results[0][1]) {
        return null;
      }

      const count = parseInt(String(results[0][1]), 10);
      const ttl = Number(results[1]?.[1] ?? -1);

      if (isNaN(count)) return null;

      return {
        count,
        ttlRemainingSeconds: ttl > 0 ? ttl : 0,
      };
    } catch (err: any) {
      this.logger.error(`Redis get failed for key ${key}: ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: string | number, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, String(value), 'EX', ttlSeconds);
    } catch (err: any) {
      this.logger.error(`Redis set failed for key ${key}: ${err.message}`);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (err: any) {
      this.logger.error(`Redis del failed for key ${key}: ${err.message}`);
    }
  }

  async destroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.client = null;
      this.connected = false;
    }
  }
}

