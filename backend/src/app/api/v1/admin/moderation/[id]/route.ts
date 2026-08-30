import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { issueService } from "@/modules/issues/service";
import { ModerateIssueSchema } from "@/lib/validation/workflows";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withRole } from "@/lib/auth";

export const PATCH = withRole("MODERATOR", "ADMIN")(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = ModerateIssueSchema.parse(body);
    const issue = await issueService.moderateIssue(id, session.userId, input);

    return sendJSON(successResponse({ issue }, 200));
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return sendJSON(errorResponse(`Validation error: ${error.message}`, 400));
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    return sendJSON(errorResponse(getErrorMessage(error, "Failed to moderate issue"), 500));
  }
});
