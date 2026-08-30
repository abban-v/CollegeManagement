import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { issueService } from "@/modules/issues/service";
import { DisputeResolutionSchema } from "@/lib/validation/workflows";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withAuth } from "@/lib/auth";

export const POST = withAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = DisputeResolutionSchema.parse(body);
    const result = await issueService.disputeResolution(id, session.userId, input);

    return sendJSON(successResponse(result, 201));
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return sendJSON(errorResponse(`Validation error: ${error.message}`, 400));
    }

    if (error instanceof Error && error.message.includes("Only the reporter")) {
      return sendJSON(errorResponse("Forbidden", 403));
    }

    if (error instanceof Error && error.message.includes("Cannot transition")) {
      return sendJSON(errorResponse(`Invalid status transition: ${error.message}`, 400));
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    return sendJSON(errorResponse(getErrorMessage(error, "Failed to dispute resolution"), 500));
  }
});
