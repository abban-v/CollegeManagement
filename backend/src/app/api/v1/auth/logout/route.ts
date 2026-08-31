import { NextRequest } from "next/server";
import { successResponse, errorResponse, sendJSON } from "@/lib/api";
import { logoutCurrentSession } from "@/lib/auth";

/**
 * POST /api/v1/auth/logout
 *
 * Invalidates the current session both in the database and in the browser cookie.
 */
export async function POST(request: NextRequest) {
  try {
    await logoutCurrentSession(request);

    return sendJSON(successResponse({ message: "Logged out successfully" }, 200));
  } catch (error: unknown) {
    console.error("Logout error:", error);
    return sendJSON(errorResponse(error instanceof Error ? error.message : "Logout failed", 500));
  }
}
