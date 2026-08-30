import { issueService } from "@/modules/issues/service";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withRole } from "@/lib/auth";

export const GET = withRole("MODERATOR", "ADMIN")(async () => {
  try {
    const reports = await issueService.listReports();

    return sendJSON(successResponse({ reports }, 200));
  } catch (error: unknown) {
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to list reports"), 500));
  }
});
