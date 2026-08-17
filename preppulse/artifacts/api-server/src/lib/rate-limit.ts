export interface RateLimitResult {
  ok: boolean;
  retryAfterMs?: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  clear(): void;
}

export function createRateLimiter(windowMs: number, max: number): RateLimiter {
  const hits = new Map<string, number[]>();

  function check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowMs;
    const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);
    if (recent.length >= max) {
      hits.set(key, recent);
      return { ok: false, retryAfterMs: Math.max(1, windowMs - (now - recent[0])) };
    }
    recent.push(now);
    hits.set(key, recent);
    return { ok: true };
  }

  return { check, clear: () => hits.clear() };
}