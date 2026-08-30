import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, getRateLimitIdentifier, getRateLimitHeaders } from "@/lib/middleware/rateLimit";

/**
 * Middleware for CORS and rate limiting
 *
 * This middleware applies to all API routes and handles:
 * - CORS headers for cross-origin requests
 * - Rate limiting to prevent abuse
 *
 * In production, rate limiting requires Upstash Redis.
 * If Redis is not configured in production, the middleware
 * returns a 503 error to fail safely.
 */

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // CORS configuration
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";

  // Add CORS headers
  response.headers.set("Access-Control-Allow-Origin", frontendUrl);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  // Apply rate limiting to API routes (skip for health check)
  if (request.nextUrl.pathname.startsWith("/api/v1") && !request.nextUrl.pathname.includes("/health")) {
    const identifier = getRateLimitIdentifier(request);

    try {
      const rateLimitResult = await checkRateLimit(identifier);

      // Add rate limit headers
      const headers = getRateLimitHeaders(rateLimitResult);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Return 429 if rate limited
      if (!rateLimitResult.success) {
        return new NextResponse(
          JSON.stringify({
            data: null,
            error: "Too many requests. Please try again later.",
            status: 429,
          }),
          {
            status: 429,
            headers: {
              ...response.headers,
              "Content-Type": "application/json",
            },
          }
        );
      }
    } catch (error) {
      // In production without Redis, fail safely with 503
      console.error("Rate limiting error:", error);
      return new NextResponse(
        JSON.stringify({
          data: null,
          error: "Service temporarily unavailable. Rate limiting is not configured.",
          status: 503,
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
