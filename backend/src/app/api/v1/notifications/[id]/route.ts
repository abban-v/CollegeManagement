import { NextRequest } from "next/server";
import { issueService } from "@/modules/issues/service";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withAuth } from "@/lib/auth";

export const PATCH = withAuth(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session
) => {
  try {
    const { id } = await params;
    const notification = await issueService.markNotificationRead(id, session.userId);

    return sendJSON(successResponse({ notification }, 200));
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not found")) {
      return sendJSON(errorResponse("Notification not found", 404));
    }

    return sendJSON(errorResponse(getErrorMessage(error, "Failed to mark notification read"), 500));
  }
});

export const POST = PATCH;
