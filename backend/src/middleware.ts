import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/middleware/rateLimit";

export async function middleware(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await checkRateLimit(request);
  if (!rateLimitResult.success) {
    return new NextResponse(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: {
        ...getRateLimitHeaders(rateLimitResult),
        "Access-Control-Allow-Origin": process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL || "*" : "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  // CORS headers for all responses
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL || "*" : "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Allow-Credentials", "true");

  // Add rate limit headers
  response.headers.append("X-RateLimit-Limit", String(rateLimitResult.limit || 100));
  response.headers.append("X-RateLimit-Remaining", String(Math.max(0, (rateLimitResult.limit || 100) - (rateLimitResult.count || 0))));
  response.headers.append("X-RateLimit-Reset", String(Math.ceil((rateLimitResult.resetTime || Date.now()) / 1000)));

  return response;
}

// Apply middleware only to /api routes
export const config = {
  matcher: "/api/:path*",
};
