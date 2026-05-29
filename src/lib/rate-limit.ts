export class RateLimiter {
  private cache = new Map<string, { count: number; expiresAt: number }>();

  constructor(
    private readonly windowMs: number,
    private readonly maxRequests: number
  ) {}

  /**
   * Checks if the given key (e.g. IP address or User ID) has exceeded the rate limit.
   * @param key The unique identifier for the client (e.g. user ID or IP)
   * @returns An object indicating whether the limit is exceeded, and how many requests are remaining.
   */
  public check(key: string): { success: boolean; remaining: number } {
    const now = Date.now();
    const record = this.cache.get(key);

    if (record) {
      if (now > record.expiresAt) {
        // Window expired, reset
        this.cache.set(key, { count: 1, expiresAt: now + this.windowMs });
        return { success: true, remaining: this.maxRequests - 1 };
      }

      if (record.count >= this.maxRequests) {
        // Rate limit exceeded
        return { success: false, remaining: 0 };
      }

      // Increment count
      record.count += 1;
      this.cache.set(key, record);
      return { success: true, remaining: this.maxRequests - record.count };
    }

    // First request in the window
    this.cache.set(key, { count: 1, expiresAt: now + this.windowMs });
    return { success: true, remaining: this.maxRequests - 1 };
  }
}

// Create a global instance for AI API Routes (e.g. max 10 requests per minute per user)
export const aiRateLimiter = new RateLimiter(60 * 1000, 10);

// Global instance for general API routes (e.g. max 100 requests per minute)
export const globalRateLimiter = new RateLimiter(60 * 1000, 100);
