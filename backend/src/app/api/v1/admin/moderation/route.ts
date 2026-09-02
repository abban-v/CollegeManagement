import prisma from "@/lib/db";
import { issueService } from "@/modules/issues/service";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withRole } from "@/lib/auth";

export const GET = withRole("MODERATOR", "ADMIN")(async () => {
  try {
    const [reports, flaggedIssues] = await Promise.all([
      issueService.listReports(),
      prisma.issue.findMany({
        where: {
          moderationStatus: {
            in: ["FLAGGED", "UNDER_REVIEW"],
          },
        },
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          analysis: true,
          asset: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return sendJSON(successResponse({ reports, flaggedIssues }, 200));
  } catch (error: unknown) {
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to list reports"), 500));
  }
});
