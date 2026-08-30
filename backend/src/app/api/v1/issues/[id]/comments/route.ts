import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { issueService } from "@/modules/issues/service";
import { CreateCommentSchema } from "@/lib/validation/comment";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withAuth } from "@/lib/auth";

/**
 * GET /api/v1/issues/:id/comments
 *
 * Returns comments for an issue.
 * The issue detail endpoint already includes recent comments, but this route
 * gives the frontend a dedicated endpoint when it needs the comment feed.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const issue = await issueService.getIssueById(id);
    if (!issue) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    return sendJSON(
      successResponse(
        {
          issueId: issue.id,
          comments: issue.comments,
        },
        200
      )
    );
  } catch (error: unknown) {
    console.error("Error fetching comments:", error);
    return sendJSON(
      errorResponse(getErrorMessage(error, "Failed to fetch comments"), 500)
    );
  }
}

/**
 * POST /api/v1/issues/:id/comments
 *
 * Adds a new comment from the authenticated user.
 */
export const POST = withAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = CreateCommentSchema.parse(body);

    const comment = await issueService.addComment(id, session.userId, validated);

    return sendJSON(successResponse(comment, 201));
  } catch (error: unknown) {
    console.error("Error adding comment:", error);

    if (error instanceof ZodError) {
      return sendJSON(errorResponse(`Validation error: ${error.message}`, 400));
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    return sendJSON(
      errorResponse(getErrorMessage(error, "Failed to add comment"), 500)
    );
  }
});
