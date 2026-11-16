export interface CounterResult {
  count: number;
  ttlRemainingSeconds: number;
}

export interface RateLimitStore {
  readonly name: string;
  isAvailable(): boolean;

  /**
   * Atomically increments the counter for key and sets TTL if new key.
   * Returns current count and remaining TTL seconds.
   */
  increment(key: string, ttlSeconds: number): Promise<CounterResult>;

  /**
   * Retrieves current counter value and remaining TTL.
   */
  get(key: string): Promise<CounterResult | null>;

  /**
   * Sets a value with TTL.
   */
  set(key: string, value: string | number, ttlSeconds: number): Promise<void>;

  /**
   * Deletes a key.
   */
  delete(key: string): Promise<void>;

  /**
   * Graceful cleanup.
   */
  destroy(): Promise<void>;
}

