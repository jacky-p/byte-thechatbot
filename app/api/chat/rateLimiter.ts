const LIMIT = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "127.0.0.1";
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now >= entry.resetAt) {
    // Prune all expired entries on each new window to prevent unbounded growth.
    for (const [key, val] of store) {
      if (now >= val.resetAt) store.delete(key);
    }
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: LIMIT - 1 };
  }

  if (entry.count >= LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: LIMIT - entry.count };
}

// Exported for tests only — do not call in production code.
export function _resetStore() {
  store.clear();
}
