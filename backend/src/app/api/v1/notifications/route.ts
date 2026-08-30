import { NextRequest } from "next/server";
import { issueService } from "@/modules/issues/service";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (
  _request: NextRequest,
  _context,
  session
) => {
  try {
    const notifications = await issueService.listNotifications(session.userId);

    return sendJSON(successResponse({ notifications }, 200));
  } catch (error: unknown) {
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to list notifications"), 500));
  }
});

export const PATCH = withAuth(async (
  _request: NextRequest,
  _context,
  session
) => {
  try {
    const result = await issueService.markAllNotificationsRead(session.userId);

    return sendJSON(successResponse({ message: "Notifications marked read", count: result.count }, 200));
  } catch (error: unknown) {
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to mark notifications read"), 500));
  }
});
