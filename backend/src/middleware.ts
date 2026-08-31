import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, getRateLimitIdentifier, getRateLimitHeaders } from "@/lib/middleware/rateLimit";

/**
 * Middleware for CORS and rate limiting
 */
export async function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  const configuredFrontend = process.env.FRONTEND_URL?.replace(/\/$/, "");

  // Determine allowed origin for CORS
  let allowedOrigin = configuredFrontend || "http://localhost:3001";
  if (origin) {
    if (
      origin === configuredFrontend ||
      origin === "http://localhost:3000" ||
      origin === "http://localhost:3001" ||
      origin.endsWith(".vercel.app")
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

  // Apply rate limiting to API routes (skip for health check)
  if (request.nextUrl.pathname.startsWith("/api/v1") && !request.nextUrl.pathname.includes("/health")) {
    const identifier = getRateLimitIdentifier(request);

    try {
      const rateLimitResult = await checkRateLimit(identifier);

      // Add rate limit headers
      const rlHeaders = getRateLimitHeaders(rateLimitResult);
      Object.entries(rlHeaders).forEach(([key, value]) => {
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
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    } catch (error) {
      console.error("Rate limiting middleware warning:", error);
    }
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
