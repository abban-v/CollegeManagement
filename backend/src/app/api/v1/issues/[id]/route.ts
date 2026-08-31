import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { issueService } from "@/modules/issues/service";
import { UpdateIssueSchema } from "@/lib/validation/issue";
import { getErrorMessage, successResponse, errorResponse, sendJSON } from "@/lib/api";
import { withAuth, withRole } from "@/lib/auth";

/**
 * GET /api/v1/issues/:id
 * 
 * Get a specific issue by ID
 * 
 * Authentication: Not required
 * Returns: Issue with related data (comments, history, analysis, etc.)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const issue = await issueService.getIssueById(id);

    if (!issue) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    return sendJSON(successResponse(issue, 200));
  } catch (error: unknown) {
    console.error("Error fetching issue:", error);
    return sendJSON(
      errorResponse(getErrorMessage(error, "Failed to fetch issue"), 500)
    );
  }
}

/**
 * PATCH /api/v1/issues/:id
 * 
 * Update issue fields (non-status fields)
 * 
 * Request body:
 * {
 *   title?: string
 *   description?: string
 *   category?: string
 *   department?: string
 *   location?: string
 *   suspectedCause?: string
 *   proposedSolution?: string
 *   priority?: IssuePriority
 * }
 * 
 * Authentication: Required
 * Authorization: Issue reporter or ADMIN
 */
export const PATCH = withAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session
) => {
  try {
    const { id } = await params;

    // Verify issue exists
    const issue = await issueService.getIssueById(id);
    if (!issue) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    if (issue.reporterId !== session.userId && session.role !== "ADMIN") {
      return sendJSON(errorResponse("Forbidden", 403));
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedInput = UpdateIssueSchema.parse(body);

    // Update the issue
    const updated = await issueService.updateIssue(id, validatedInput, session.userId);

    return sendJSON(successResponse(updated, 200));
  } catch (error: unknown) {
    console.error("Error updating issue:", error);

    if (error instanceof ZodError) {
      return sendJSON(errorResponse(`Validation error: ${error.message}`, 400));
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    return sendJSON(
      errorResponse(getErrorMessage(error, "Failed to update issue"), 500)
    );
  }
});

/**
 * DELETE /api/v1/issues/:id
 * 
 * Soft-delete an issue (sets moderationStatus to REMOVED)
 * 
 * Authentication: Required
 * Authorization: ADMIN or MODERATOR
 */
export const DELETE = withRole("MODERATOR", "ADMIN")(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;

    const updated = await issueService.deleteIssue(id);

    return sendJSON(
      successResponse({ message: "Issue deleted", issue: updated }, 200)
    );
  } catch (error: unknown) {
    console.error("Error deleting issue:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    return sendJSON(
      errorResponse(getErrorMessage(error, "Failed to delete issue"), 500)
    );
  }
});
