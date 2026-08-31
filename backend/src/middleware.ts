import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, getRateLimitIdentifier, getRateLimitHeaders } from "@/lib/middleware/rateLimit";

/**
 * Middleware for CORS and rate limiting
 */
export async function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  const configuredFrontend = process.env.FRONTEND_URL?.replace(/\/$/, "");

  // Determine allowed origin for CORS (supports all Vercel previews and production)
  let allowedOrigin = configuredFrontend || origin || "http://localhost:3001";
  if (origin) {
    if (
      origin === configuredFrontend ||
      origin === "http://localhost:3000" ||
      origin === "http://localhost:3001" ||
      origin.endsWith(".vercel.app") ||
      origin.includes("localhost")
    ) {
      allowedOrigin = origin;
    }
  }

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const response = NextResponse.next();

  // Attach CORS headers to response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  const pathname = request.nextUrl.pathname;

  // Apply rate limiting selectively to mutating auth routes and prevent throttling on read/polling APIs
  const isAuthMutation = pathname.startsWith("/api/v1/auth/login") || pathname.startsWith("/api/v1/auth/register");
  const isExcludedFromThrottling = pathname.includes("/health") || pathname.startsWith("/api/v1/storage") || pathname.startsWith("/uploads");

  if (pathname.startsWith("/api/v1") && !isExcludedFromThrottling) {
    const identifier = getRateLimitIdentifier(request);

    try {
      const limit = isAuthMutation ? 20 : 180;
      const rateLimitResult = await checkRateLimit(identifier, limit, "1 m");

      // Add rate limit headers
      const rlHeaders = getRateLimitHeaders(rateLimitResult, limit);
      Object.entries(rlHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Return 429 if rate limited
      if (!rateLimitResult.success) {
        return new NextResponse(
          JSON.stringify({
            data: null,
            error: "Too many requests. Please try again in a moment.",
            status: 429,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    } catch (error) {
      console.warn("Rate limiting middleware warning:", error);
    }
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
