import { RateLimitStore, CounterResult } from './rate-limit-store.interface.js';

interface MemoryEntry {
  count: number;
  expiresAt: number;
}

export class MemoryRateLimitStore implements RateLimitStore {
  readonly name = 'memory';
  private readonly store = new Map<string, MemoryEntry>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  isAvailable(): boolean {
    return true;
  }

  async increment(key: string, ttlSeconds: number): Promise<CounterResult> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || existing.expiresAt <= now) {
      const expiresAt = now + ttlSeconds * 1000;
      this.store.set(key, { count: 1, expiresAt });
      return { count: 1, ttlRemainingSeconds: ttlSeconds };
    }

    existing.count += 1;
    const ttlRemainingSeconds = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
    return { count: existing.count, ttlRemainingSeconds };
  }

  async get(key: string): Promise<CounterResult | null> {
    const now = Date.now();
    const existing = this.store.get(key);
    if (!existing || existing.expiresAt <= now) {
      if (existing) this.store.delete(key);
      return null;
    }
    const ttlRemainingSeconds = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
    return { count: existing.count, ttlRemainingSeconds };
  }

  async set(key: string, value: string | number, ttlSeconds: number): Promise<void> {
    const now = Date.now();
    const count = typeof value === 'number' ? value : parseInt(value, 10) || 1;
    this.store.set(key, {
      count,
      expiresAt: now + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  async destroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }
}

