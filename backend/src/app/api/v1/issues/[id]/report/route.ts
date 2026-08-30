import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { issueService } from "@/modules/issues/service";
import { ReportIssueSchema } from "@/lib/validation/workflows";
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
    const input = ReportIssueSchema.parse(body);
    const result = await issueService.reportIssue(id, session.userId, input);

    return sendJSON(successResponse(result, 201));
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return sendJSON(errorResponse(`Validation error: ${error.message}`, 400));
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    return sendJSON(errorResponse(getErrorMessage(error, "Failed to report issue"), 500));
  }
});
