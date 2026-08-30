import { NextRequest } from "next/server";
import { issueService } from "@/modules/issues/service";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withAuth } from "@/lib/auth";

/**
 * POST /api/v1/issues/:id/followers
 *
 * Follow an issue as the current user.
 */
export const POST = withAuth(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session
) => {
  try {
    const { id } = await params;
    const follower = await issueService.followIssue(id, session.userId);

    return sendJSON(successResponse({ followed: true, follower }, 201));
  } catch (error: unknown) {
    console.error("Error following issue:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    return sendJSON(
      errorResponse(getErrorMessage(error, "Failed to follow issue"), 500)
    );
  }
});

/**
 * DELETE /api/v1/issues/:id/followers
 *
 * Unfollow an issue as the current user.
 */
export const DELETE = withAuth(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session
) => {
  try {
    const { id } = await params;
    await issueService.unfollowIssue(id, session.userId);

    return sendJSON(successResponse({ followed: false }, 200));
  } catch (error: unknown) {
    console.error("Error unfollowing issue:", error);
    return sendJSON(
      errorResponse(getErrorMessage(error, "Failed to unfollow issue"), 500)
    );
  }
});
