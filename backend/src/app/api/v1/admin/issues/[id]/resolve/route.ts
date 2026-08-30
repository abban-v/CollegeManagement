import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { issueService } from "@/modules/issues/service";
import { SubmitResolutionSchema } from "@/lib/validation/workflows";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withRole } from "@/lib/auth";

export const POST = withRole("OFFICIAL", "MODERATOR", "ADMIN")(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = SubmitResolutionSchema.parse(body);
    const result = await issueService.submitResolution(id, session.userId, input);

    return sendJSON(successResponse(result, 201));
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

    return sendJSON(errorResponse(getErrorMessage(error, "Failed to submit resolution"), 500));
  }
});
