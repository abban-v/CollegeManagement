import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting configuration
 *
 * Uses Upstash Redis for distributed rate limiting if configured.
 * Falls back to in-memory rate limiting when Redis is not provided.
 */

// Helper to check if URL is a valid Upstash Redis URL
function isValidUpstashUrl(url?: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return trimmed.startsWith("https://") && !trimmed.includes("your-upstash-redis-url");
}

// Initialize Redis client (if configured with valid URL)
const redis = (isValidUpstashUrl(process.env.UPSTASH_REDIS_REST_URL) && process.env.UPSTASH_REDIS_REST_TOKEN && process.env.UPSTASH_REDIS_REST_TOKEN !== "your-upstash-redis-token")
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Create rate limiter
export const ratelimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(120, "1 m"), // 120 requests per minute
      analytics: true,
      prefix: "@slashforge/ratelimit",
    })
  : null;

// In-memory fallback
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Parse a duration string like "10 s" or "1 m" into milliseconds.
 */
function parseWindow(window: string): number {
  const match = window.match(/(\d+)\s*(s|m|h)/);
  if (!match) return 60000; // default 1 minute
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    default: return 60000;
  }
}

/**
 * Check if a request should be rate limited.
 *
 * If Redis is configured, uses Upstash distributed rate limiter.
 * Otherwise, falls back to in-memory rate limiting.
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 120,
  window: string = "1 m"
): Promise<{ success: boolean; remaining: number; reset: number }> {
  if (ratelimit) {
    try {
      const result = await ratelimit.limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (e) {
      console.warn("Upstash Redis error, falling back to in-memory:", e);
    }
  }

  // In-memory fallback
  const now = Date.now();
  const windowMs = parseWindow(window);
  const record = inMemoryStore.get(identifier);

  if (!record || now > record.resetTime) {
    inMemoryStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, reset: record.resetTime };
  }

  record.count++;
  return { success: true, remaining: limit - record.count, reset: record.resetTime };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
  result: { success: boolean; remaining: number; reset: number },
  limit: number = 20
): Record<string, string> {
  return {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": Math.max(0, result.remaining).toString(),
    "X-RateLimit-Reset": new Date(result.reset).toISOString(),
  };
}

/**
 * Generate identifier for rate limiting.
 */
export function getRateLimitIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

  return `ip:${ip}`;
}

/**
 * Generate a rate limit identifier specifically for login attempts.
 */
export function getLoginRateLimitIdentifier(email: string, request: Request): string {
  const normalizedEmail = email.toLowerCase().trim();
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

  return `login:${normalizedEmail}:${ip}`;
}
