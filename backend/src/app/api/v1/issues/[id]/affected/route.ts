import { NextRequest } from "next/server";
import { issueService } from "@/modules/issues/service";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withAuth } from "@/lib/auth";

export const POST = withAuth(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session
) => {
  try {
    const { id } = await params;
    const issue = await issueService.markAffected(id, session.userId);

    return sendJSON(successResponse({ message: "Marked as affected", issue }, 200));
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not found")) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    return sendJSON(errorResponse(getErrorMessage(error, "Failed to mark affected"), 500));
  }
});

export const DELETE = withAuth(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session
) => {
  try {
    const { id } = await params;
    const issue = await issueService.unmarkAffected(id, session.userId);

    return sendJSON(successResponse({ message: "Removed affected marker", issue }, 200));
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not found")) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    return sendJSON(errorResponse(getErrorMessage(error, "Failed to unmark affected"), 500));
  }
});
