import { successResponse, errorResponse, sendJSON } from "@/lib/api";
import { getSession } from "@/lib/auth";

/**
 * GET /api/v1/auth/session
 *
 * Returns the currently authenticated user, if any.
 * This endpoint is the canonical source of truth for session state.
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return sendJSON(errorResponse("Unauthorized", 401));
    }

    return sendJSON(
      successResponse(
        {
          user: session,
          isAuthenticated: true,
        },
        200
      )
    );
  } catch (error: unknown) {
    console.error("Session error:", error);
    return sendJSON(errorResponse(error instanceof Error ? error.message : "Failed to get session", 500));
  }
}
