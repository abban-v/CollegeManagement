import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { IssueStatusTransitionSchema } from "@/lib/validation/issue";
import { issueService } from "@/modules/issues/service";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withRole } from "@/lib/auth";

async function handleStatusUpdate(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session: { userId: string }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { toStatus, reason } = IssueStatusTransitionSchema.parse(body);
    const issue = await issueService.transitionStatus(id, toStatus, reason || "Admin status update", session.userId);

    return sendJSON(successResponse({ issue }, 200));
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return sendJSON(errorResponse(`Validation error: ${error.message}`, 400));
    }

    if (error instanceof Error && error.message.includes("Cannot transition")) {
      return sendJSON(errorResponse(`Invalid status transition: ${error.message}`, 400));
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    return sendJSON(errorResponse(getErrorMessage(error, "Failed to update status"), 500));
  }
}

export const POST = withRole("OFFICIAL", "MODERATOR", "ADMIN")(handleStatusUpdate);
export const PATCH = withRole("OFFICIAL", "MODERATOR", "ADMIN")(handleStatusUpdate);
