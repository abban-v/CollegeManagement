import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting configuration
 *
 * Uses Upstash Redis for distributed rate limiting.
 * In development, falls back to in-memory limiting.
 * In production, Redis is REQUIRED — fails safely if not configured.
 */

// Initialize Redis client (if configured)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Create rate limiter
export const ratelimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
      analytics: true,
      prefix: "@slashforge/ratelimit",
    })
  : null;

// In-memory fallback for development only
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if the application is running in production.
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Parse a duration string like "10 s" or "1 m" into milliseconds.
 */
function parseWindow(window: string): number {
  const match = window.match(/(\d+)\s*(s|m|h)/);
  if (!match) return 10000; // default 10 seconds
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    default: return 10000;
  }
}

/**
 * Check if a request should be rate limited.
 *
 * In production, requires Upstash Redis. If Redis is not configured
 * in production, this function throws an error to fail safely.
 *
 * In development, falls back to in-memory rate limiting.
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  window: string = "10 s"
): Promise<{ success: boolean; remaining: number; reset: number }> {
  if (ratelimit) {
    const result = await ratelimit.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  // In production without Redis, fail safely
  if (isProduction()) {
    throw new Error(
      "Rate limiting is not configured. UPSTASH_REDIS_REST_URL and " +
        "UPSTASH_REDIS_REST_TOKEN must be set in production."
    );
  }

  // In-memory fallback for development
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
export function getRateLimitHeaders(result: { success: boolean; remaining: number; reset: number }): Record<string, string> {
  return {
    "X-RateLimit-Limit": "10",
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.reset).toISOString(),
  };
}

/**
 * Generate identifier for rate limiting.
 *
 * For authenticated requests, uses the user ID as the primary identity.
 * For unauthenticated requests, uses the trusted client IP.
 *
 * @param request - The incoming request
 * @param userId - Optional authenticated user ID
 */
export function getRateLimitIdentifier(request: Request, userId?: string): string {
  // For authenticated requests, use the user ID as the primary identity
  if (userId) {
    return `user:${userId}`;
  }

  // For unauthenticated requests, use the client IP
  // Prefer x-forwarded-for (set by reverse proxies like Vercel),
  // fall back to x-real-ip, then socket remote address
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

  return `ip:${ip}`;
}

/**
 * Generate a rate limit identifier specifically for login attempts.
 * Uses the normalized email to prevent brute-force attacks on specific accounts.
 *
 * @param email - The email being used for login
 * @param request - The incoming request (for IP fallback)
 */
export function getLoginRateLimitIdentifier(email: string, request: Request): string {
  const normalizedEmail = email.toLowerCase().trim();
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

  // Combine email and IP for per-account + per-IP rate limiting
  return `login:${normalizedEmail}:${ip}`;
}
