import { NextResponse } from "next/server";

/**
 * Health check endpoint
 * GET /api/v1/health
 * 
 * Returns 200 if the backend is running
 * Used for monitoring and readiness checks
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    message: "Slashforge backend is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
}
