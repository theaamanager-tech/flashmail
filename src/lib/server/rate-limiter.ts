// Rate limiter abstraction.
// Production deployments should provide a Redis/upstash-backed implementation.
// The default in-memory fallback is safe for single-instance development and
// small deployments, but will not share state across serverless instances.

export type RateLimiterKey = string;

export interface RateLimiter {
  isAllowed(key: RateLimiterKey, windowMs: number, maxRequests: number): Promise<boolean>;
  record(key: RateLimiterKey, windowMs: number): Promise<void>;
}

class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, number[]>();

  async isAllowed(key: string, windowMs: number, maxRequests: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = this.buckets.get(key) ?? [];
    const inWindow = timestamps.filter((t) => t > windowStart);
    return inWindow.length < maxRequests;
  }

  async record(key: string, windowMs: number): Promise<void> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = (this.buckets.get(key) ?? []).filter((t) => t > windowStart);
    timestamps.push(now);
    this.buckets.set(key, timestamps);
  }
}

let globalLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!globalLimiter) {
    globalLimiter = new MemoryRateLimiter();
  }
  return globalLimiter;
}

export function setRateLimiter(limiter: RateLimiter): void {
  globalLimiter = limiter;
}

export async function checkRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number,
): Promise<boolean> {
  const limiter = getRateLimiter();
  const allowed = await limiter.isAllowed(key, windowMs, maxRequests);
  if (!allowed) return false;
  await limiter.record(key, windowMs);
  return true;
}

export function getIpKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : (request.headers.get("x-real-ip") ?? "unknown");
  return `${prefix}:${ip}`;
}

export function getUserKey(userId: string, prefix: string): string {
  return `${prefix}:${userId}`;
}
