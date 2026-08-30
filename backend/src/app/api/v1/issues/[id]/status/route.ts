import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { issueService } from "@/modules/issues/service";
import { IssueStatusTransitionSchema } from "@/lib/validation/issue";
import { getErrorMessage, successResponse, errorResponse, sendJSON } from "@/lib/api";
import { withRole } from "@/lib/auth";

/**
 * POST /api/v1/issues/:id/status
 * 
 * Transition issue to a new status
 * 
 * Request body:
 * {
 *   toStatus: IssueStatus
 *   reason?: string
 * }
 * 
 * This is a separate endpoint from PATCH because:
 * - Status transitions are special operations with validation
 * - They create audit logs and status history automatically
 * - They have their own authorization rules
 * - They're conceptually different from field updates
 * 
 * Authentication: Required
 * Authorization: OFFICIAL, MODERATOR, ADMIN (depends on status)
 */
export const POST = withRole("OFFICIAL", "MODERATOR", "ADMIN")(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  _session
) => {
  try {
    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const { toStatus, reason } = IssueStatusTransitionSchema.parse(body);

    // Attempt status transition
    const updated = await issueService.transitionStatus(
      id,
      toStatus,
      reason || "No reason provided",
      _session.userId
    );

    return sendJSON(
      successResponse(
        {
          message: "Status updated successfully",
          issue: updated,
        },
        200
      )
    );
  } catch (error: unknown) {
    console.error("Error transitioning status:", error);

    if (error instanceof ZodError) {
      return sendJSON(errorResponse(`Validation error: ${error.message}`, 400));
    }

    if (error instanceof Error && error.message.includes("Cannot transition")) {
      return sendJSON(
        errorResponse(
          `Invalid status transition: ${error.message}`,
          400
        )
      );
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    return sendJSON(
      errorResponse(getErrorMessage(error, "Failed to update status"), 500)
    );
  }
});
