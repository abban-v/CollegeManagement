import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { issueService } from "@/modules/issues/service";
import { IssueStatusTransitionSchema } from "@/lib/validation/issue";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export const POST = withAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  session
) => {
  try {
    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const { toStatus, reason } = IssueStatusTransitionSchema.parse(body);

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: { participants: true },
    });

    if (!issue) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    const isStaff = session.role === "OFFICIAL" || session.role === "MODERATOR" || session.role === "ADMIN";
    const isReporterOrParticipant = issue.reporterId === session.userId || issue.participants.some((p) => p.userId === session.userId);

    // Permission checks based on target status
    if (toStatus === "IN_PROGRESS" || toStatus === "UNDER_REVIEW" || toStatus === "RESOLUTION_SUBMITTED") {
      if (!isStaff) {
        return sendJSON(errorResponse("Only maintenance officials and admins can dispatch or resolve work", 403));
      }
    } else if (toStatus === "VERIFIED" || toStatus === "REOPENED" || toStatus === "DISPUTED") {
      if (!isStaff && !isReporterOrParticipant) {
        return sendJSON(errorResponse("Only the reporter or affected members can verify or reopen this issue", 403));
      }
    } else if (toStatus === "CLOSED") {
      if (!isStaff && !isReporterOrParticipant) {
        return sendJSON(errorResponse("Forbidden", 403));
      }
    }

    // Attempt status transition
    const updated = await issueService.transitionStatus(
      id,
      toStatus,
      reason || "Status updated",
      session.userId
    );

    return sendJSON(
      successResponse(
        {
          message: "Status updated successfully",
          issue: updated,
        },
        200
      )
    );
  } catch (error: unknown) {
    console.error("Error transitioning status:", error);

    if (error instanceof ZodError) {
      return sendJSON(errorResponse(`Validation error: ${error.message}`, 400));
    }

    if (error instanceof Error && error.message.includes("Cannot transition")) {
      return sendJSON(
        errorResponse(
          `Invalid status transition: ${error.message}`,
          400
        )
      );
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return sendJSON(errorResponse("Issue not found", 404));
    }

    return sendJSON(
      errorResponse(getErrorMessage(error, "Failed to update status"), 500)
    );
  }
});

export const PATCH = POST;
