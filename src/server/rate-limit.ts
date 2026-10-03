// A per-client token bucket, in memory. Enough for the demo; its limits are in docs/DECISIONS.md
// (D-17): it is per server instance, it is lost on a restart, and the client key is only as
// trustworthy as the proxy that sets it.
export interface RateLimiter {
  // Takes one token for `key`. `perMinute` is both the burst size and the refill per minute.
  take(key: string, perMinute: number): { allowed: boolean; retryAfterSeconds: number };
}

interface Bucket {
  tokens: number;
  at: number; // ms, on the limiter's clock
}

const MINUTE_MS = 60_000;
// Above this many clients the buckets that have refilled are forgotten, so the map cannot grow
// without bound. A forgotten bucket is a full one: nothing is lost.
const MAX_BUCKETS = 10_000;

export function createRateLimiter(now: () => number): RateLimiter {
  const buckets = new Map<string, Bucket>();

  return {
    take(key, perMinute) {
      const time = now();
      const bucket = buckets.get(key) ?? { tokens: perMinute, at: time };
      bucket.tokens = Math.min(perMinute, bucket.tokens + ((time - bucket.at) * perMinute) / MINUTE_MS);
      bucket.at = time;
      buckets.set(key, bucket);

      if (buckets.size > MAX_BUCKETS) {
        for (const [other, b] of buckets) {
          if (other !== key && b.tokens + ((time - b.at) * perMinute) / MINUTE_MS >= perMinute) buckets.delete(other);
        }
        // Still full of active clients: forget the oldest entries (insertion order).
        for (const other of buckets.keys()) {
          if (buckets.size <= MAX_BUCKETS) break;
          if (other !== key) buckets.delete(other);
        }
      }

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { allowed: true, retryAfterSeconds: 0 };
      }
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(((1 - bucket.tokens) * MINUTE_MS) / perMinute / 1000)) };
    },
  };
}
