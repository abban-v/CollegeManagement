import prisma from "@/lib/db";
import { IssueStatus, IssuePriority, ModerationStatus, Prisma } from "@prisma/client";
import { CreateIssueInput, UpdateIssueInput } from "@/lib/validation/issue";
import type { CreateCommentInput } from "@/lib/validation/comment";
import type {
  DisputeResolutionInput,
  ModerateIssueInput,
  ReportIssueInput,
  SubmitResolutionInput,
} from "@/lib/validation/workflows";
import { analyzeIssue, findDuplicateCandidates } from "@/modules/ai/analyzer";
import { fileExists } from "@/lib/storage";

/**
 * IssueService handles all business logic for issues.
 *
 * This service:
 * - Encapsulates issue lifecycle management
 * - Handles status transitions with validation
 * - Creates audit logs for important changes
 * - Manages relationships (comments, followers, resolutions)
 *
 * The API routes will call these methods rather than directly manipulating the database.
 * This keeps business logic centralized and testable.
 */

export class IssueService {
  /**
   * Create a new issue
   *
   * The issue is created first with a PENDING AI analysis status.
   * AI analysis runs after the issue is committed, so failures
   * do not prevent issue creation.
   */
  async createIssue(
    input: CreateIssueInput,
    reporterId: string
  ) {
    // Create the issue first with a default category, so the issue exists
    // even if AI analysis fails. AI analysis runs after issue creation.
    const issue = await prisma.$transaction(async (tx) => {
      const issue = await tx.issue.create({
        data: {
          title: input.title,
          description: input.description,
          category: input.category || "UNCATEGORIZED",
          department: input.department,
          location: input.location,
          suspectedCause: input.suspectedCause,
          proposedSolution: input.proposedSolution,
          attachments: input.attachments || [],
          assetId: input.assetId,
          reporterId,
          priority: IssuePriority.MEDIUM,
          moderationStatus: ModerationStatus.NORMAL,
          status: IssueStatus.REPORTED,
        },
      });

      // If attached to an asset, increment reported issues on asset
      if (input.assetId) {
        await tx.asset.update({
          where: { id: input.assetId },
          data: { reportedIssuesCount: { increment: 1 } },
        }).catch(() => {});
      }

      // Create a PENDING analysis record
      await tx.aIAnalysis.create({
        data: {
          issueId: issue.id,
          category: input.category || "UNCATEGORIZED",
          aiPriority: IssuePriority.MEDIUM,
          severity: "MEDIUM",
          spamScore: 0,
          toxicityScore: 0,
          moderationFlags: [],
          confidence: 0,
          duplicateCandidates: [],
          analysisStatus: "PENDING",
        },
      });

      // Record the initial status in history
      await tx.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: IssueStatus.REPORTED,
          toStatus: IssueStatus.REPORTED,
          reason: "Issue created",
        },
      });

      // Create an audit log
      await tx.auditLog.create({
        data: {
          issueId: issue.id,
          action: "CREATE",
          actor: reporterId,
          details: JSON.stringify({ title: input.title, assetId: input.assetId }),
        },
      });

      await tx.issueParticipant.create({
        data: { issueId: issue.id, userId: reporterId },
      });

      await tx.issueFollower.create({
        data: { issueId: issue.id, userId: reporterId },
      });

      return issue;
    });

    // Run AI analysis immediately so the caller receives the enriched issue
    try {
      await this.runAnalysisAsync(issue.id, input);
    } catch (error) {
      console.warn("Inline AI analysis error:", error);
    }

    const enriched = await prisma.issue.findUnique({
      where: { id: issue.id },
      include: {
        reporter: { select: { id: true, name: true } },
        analysis: true,
        asset: true,
        followers: true,
        participants: true,
        resolutions: {
          include: {
            resolvedBy: { select: { id: true, name: true } },
            evidenceImages: true,
          },
        },
      },
    });

    return enriched || issue;
  }

  /**
   * Run AI analysis for an issue and update the analysis record.
   * This is called after issue creation so failures don't block the user.
   */
  private async runAnalysisAsync(issueId: string, input: CreateIssueInput) {
    const recentIssues = await prisma.issue.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, title: true, description: true },
    });
    const duplicateCandidates = findDuplicateCandidates(input, recentIssues);

    try {
      const analysis = await analyzeIssue(input, duplicateCandidates);

      await prisma.$transaction(async (tx) => {
        await tx.aIAnalysis.update({
          where: { issueId },
          data: {
            category: analysis.category,
            suggestedDepartment: analysis.suggestedDepartment,
            aiPriority: analysis.aiPriority,
            severity: analysis.severity,
            spamScore: analysis.spamScore,
            toxicityScore: analysis.toxicityScore,
            moderationFlags: analysis.moderationFlags,
            confidence: analysis.confidence,
            duplicateCandidates: analysis.duplicateCandidates.map((candidate) => JSON.stringify(candidate)),
            analysisStatus: "COMPLETED",
            modelUsed: analysis.modelUsed,
            reasoning: analysis.reasoning,
          },
        });

        // Update issue priority and moderation status based on analysis
        await tx.issue.update({
          where: { id: issueId },
          data: {
            priority: analysis.aiPriority,
            moderationStatus: analysis.moderationFlags.length > 0 ? ModerationStatus.FLAGGED : ModerationStatus.NORMAL,
          },
        });

        await tx.auditLog.create({
          data: {
            issueId,
            action: "AI_ANALYSIS_COMPLETED",
            actor: "SYSTEM",
            details: JSON.stringify({
              category: analysis.category,
              priority: analysis.aiPriority,
              spamScore: analysis.spamScore,
              toxicityScore: analysis.toxicityScore,
              confidence: analysis.confidence,
            }),
          },
        });
      });
    } catch (error) {
      await prisma.aIAnalysis.update({
        where: { issueId },
        data: {
          analysisStatus: "FAILED",
          reasoning: error instanceof Error ? error.message : "Analysis failed",
        },
      });
      throw error;
    }
  }

  /**
   * Get issue by ID
   *
   * Returns issue data with related records.
   * Email addresses are excluded from public-facing fields.
   */
  async getIssueById(id: string) {
    return await prisma.issue.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
          },
        },
        analysis: true,
        asset: true,
        embedding: true,
        statusHistory: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        comments: {
          orderBy: { createdAt: "desc" },
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        followers: true,
        participants: true,
        reports: true,
        disputes: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        resolutions: {
          orderBy: { createdAt: "desc" },
          include: {
            evidenceImages: true,
            resolvedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * List issues with pagination and filtering
   *
   * Email addresses are excluded from public-facing fields.
   */
  async listIssues(options: {
    skip?: number;
    take?: number;
    status?: IssueStatus;
    priority?: IssuePriority;
    reporterId?: string;
    includeRemoved?: boolean;
  } = {}) {
    const { skip = 0, take = 20, status, priority, reporterId, includeRemoved = false } = options;

    const where: Prisma.IssueWhereInput = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (reporterId) where.reporterId = reporterId;
    if (!includeRemoved) {
      where.moderationStatus = { not: "REMOVED" };
    }

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
            },
          },
          analysis: true,
          asset: true,
          followers: true,
          participants: true,
          resolutions: {
            orderBy: { createdAt: "desc" },
            include: {
              evidenceImages: true,
              resolvedBy: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.issue.count({ where }),
    ]);

    return {
      issues,
      total,
      pages: Math.ceil(total / take),
      skip,
      take,
    };
  }

  /**
   * Update issue (non-status fields)
   */
  async updateIssue(id: string, input: UpdateIssueInput, updatedBy: string) {
    const issue = await prisma.issue.update({
      where: { id },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.description && { description: input.description }),
        ...(input.category && { category: input.category }),
        ...(input.department && { department: input.department }),
        ...(input.location && { location: input.location }),
        ...(input.suspectedCause && { suspectedCause: input.suspectedCause }),
        ...(input.proposedSolution && {
          proposedSolution: input.proposedSolution,
        }),
        ...(input.attachments && { attachments: input.attachments }),
        ...(input.priority && { priority: input.priority }),
      },
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        issueId: id,
        action: "UPDATE",
        actor: updatedBy,
        details: `Updated issue fields`,
      },
    });

    return issue;
  }

  /**
   * Transition issue status with validation
   *
   * This is a state machine.
   * The rules define what transitions are allowed.
   */
  async transitionStatus(
    id: string,
    toStatus: IssueStatus,
    reason: string,
    transitionedBy: string
  ) {
    const issue = await prisma.issue.findUniqueOrThrow({
      where: { id },
    });

    // Validate transition
    const isValidTransition = this.isValidTransition(issue.status, toStatus);
    if (!isValidTransition) {
      throw new Error(
        `Cannot transition from ${issue.status} to ${toStatus}`
      );
    }

    // Update status and log the transition
    return await prisma.$transaction(async (tx) => {
      // Update the issue status
      const updated = await tx.issue.update({
        where: { id },
        data: {
          status: toStatus,
          updatedAt: new Date(),
        },
      });

      // Record status change
      await tx.issueStatusHistory.create({
        data: {
          issueId: id,
          fromStatus: issue.status,
          toStatus,
          reason,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          issueId: id,
          action: "STATUS_CHANGE",
          actor: transitionedBy,
          details: `Status changed from ${issue.status} to ${toStatus}. Reason: ${reason}`,
        },
      });

      await this.notifyIssueWatchers(tx, id, {
        actorId: transitionedBy,
        type: "STATUS_CHANGED",
        title: "Issue status changed",
        body: `Status changed from ${issue.status} to ${toStatus}.`,
      });

      return updated;
    });
  }

  /**
   * Check if a status transition is valid
   *
   * This is the state machine definition.
   * Update this method when the lifecycle changes.
   */
  private isValidTransition(from: IssueStatus, to: IssueStatus): boolean {
    const validTransitions: Record<IssueStatus, IssueStatus[]> = {
      [IssueStatus.REPORTED]: [
        IssueStatus.UNDER_REVIEW,
        IssueStatus.CLOSED, // Can close if duplicate/spam
      ],
      [IssueStatus.UNDER_REVIEW]: [
        IssueStatus.IN_PROGRESS,
        IssueStatus.CLOSED,
      ],
      [IssueStatus.IN_PROGRESS]: [
        IssueStatus.RESOLUTION_SUBMITTED,
        IssueStatus.CLOSED,
      ],
      [IssueStatus.RESOLUTION_SUBMITTED]: [
        IssueStatus.VERIFIED,
        IssueStatus.DISPUTED,
      ],
      [IssueStatus.VERIFIED]: [
        IssueStatus.CLOSED,
        IssueStatus.DISPUTED,
        IssueStatus.REOPENED,
      ],
      [IssueStatus.CLOSED]: [IssueStatus.REOPENED],
      [IssueStatus.REOPENED]: [IssueStatus.IN_PROGRESS, IssueStatus.CLOSED],
      [IssueStatus.DISPUTED]: [IssueStatus.REOPENED, IssueStatus.CLOSED],
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Delete issue (soft delete via moderation status)
   */
  async deleteIssue(id: string) {
    return await prisma.issue.update({
      where: { id },
      data: {
        moderationStatus: ModerationStatus.REMOVED,
      },
    });
  }

  /**
   * Add a comment to an issue.
   */
  async addComment(issueId: string, authorId: string, input: CreateCommentInput) {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { id: true },
    });

    if (!issue) {
      throw new Error("Issue not found");
    }

    return await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          issueId,
          authorId,
          content: input.content.trim(),
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          issueId,
          action: "COMMENT_ADDED",
          actor: authorId,
          details: `Comment added by ${authorId}`,
        },
      });

      await this.notifyIssueWatchers(tx, issueId, {
        actorId: authorId,
        type: "COMMENT",
        title: "New comment on followed issue",
        body: input.content.trim().slice(0, 160),
      });

      return comment;
    });
  }

  /**
   * Follow an issue.
   */
  async followIssue(issueId: string, userId: string) {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { id: true },
    });

    if (!issue) {
      throw new Error("Issue not found");
    }

    return await prisma.issueFollower.upsert({
      where: {
        issueId_userId: {
          issueId,
          userId,
        },
      },
      update: {},
      create: {
        issueId,
        userId,
      },
    });
  }

  /**
   * Unfollow an issue.
   */
  async unfollowIssue(issueId: string, userId: string) {
    return await prisma.issueFollower.deleteMany({
      where: {
        issueId,
        userId,
      },
    });
  }

  async markAffected(issueId: string, userId: string) {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { id: true, reporterId: true, title: true },
    });

    if (!issue) {
      throw new Error("Issue not found");
    }

    return await prisma.$transaction(async (tx) => {
      await tx.issueParticipant.upsert({
        where: { issueId_userId: { issueId, userId } },
        update: {},
        create: { issueId, userId },
      });

      await tx.issueFollower.upsert({
        where: { issueId_userId: { issueId, userId } },
        update: {},
        create: { issueId, userId },
      });

      const affectedUserCount = await tx.issueParticipant.count({ where: { issueId } });
      const updated = await tx.issue.update({
        where: { id: issueId },
        data: { affectedUserCount },
      });

      if (issue.reporterId !== userId) {
        await tx.notification.create({
          data: {
            userId: issue.reporterId,
            type: "AFFECTED_UPVOTE",
            title: "Another user is affected",
            body: `Your issue "${issue.title.slice(0, 80)}" now has ${affectedUserCount} affected users.`,
            issueId,
          },
        });
      }

      return updated;
    });
  }

  async unmarkAffected(issueId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      await tx.issueParticipant.deleteMany({ where: { issueId, userId } });
      const affectedUserCount = await tx.issueParticipant.count({ where: { issueId } });

      return tx.issue.update({
        where: { id: issueId },
        data: { affectedUserCount },
      });
    });
  }

  /**
   * Submit a resolution for an issue.
   *
   * Security: Evidence is referenced by upload IDs that were previously
   * uploaded via the /api/v1/upload endpoint. The backend verifies:
   * 1. Each upload reference exists in the database
   * 2. The upload belongs to the authenticated user
   * 3. The upload has not already been consumed
   * 4. The file actually exists in GCS
   * 5. The upload is marked as consumed after use
   */
  async submitResolution(issueId: string, resolvedById: string, input: SubmitResolutionInput) {
    const issue = await prisma.issue.findUniqueOrThrow({ where: { id: issueId } });

    if (!this.isValidTransition(issue.status, IssueStatus.RESOLUTION_SUBMITTED)) {
      throw new Error(`Cannot transition from ${issue.status} to ${IssueStatus.RESOLUTION_SUBMITTED}`);
    }

    return await prisma.$transaction(async (tx) => {
      // Atomically claim upload references: verify they exist, belong to the
      // authenticated user, and are unconsumed — all within the transaction.
      // This prevents the TOCTOU race condition where two concurrent requests
      // could both see the same upload as unconsumed.
      const uploadRefs = await tx.uploadReference.findMany({
        where: {
          id: { in: input.uploadIds },
          userId: resolvedById,
          consumed: false,
        },
      });

      if (uploadRefs.length !== input.uploadIds.length) {
        throw new Error("One or more upload references are invalid, do not belong to you, or have already been used");
      }

      // Verify each file actually exists in GCS
      for (const ref of uploadRefs) {
        const exists = await fileExists(ref.storageKey);
        if (!exists) {
          throw new Error(`Evidence file not found in storage: ${ref.storageKey}`);
        }
      }

      // Create evidence records from verified upload references
      const evidenceData = uploadRefs.map((ref) => ({
        storageKey: ref.storageKey,
        mimeType: ref.mimeType,
        fileSize: ref.fileSize,
      }));

      const resolution = await tx.issueResolution.create({
        data: {
          issueId,
          resolvedById,
          description: input.description,
          evidenceImages: {
            create: evidenceData,
          },
        },
        include: {
          evidenceImages: true,
          resolvedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Atomically consume uploads: the update condition includes consumed: false
      // so that if another transaction already consumed them, this update
      // affects zero rows and we can detect the conflict.
      const consumeResult = await tx.uploadReference.updateMany({
        where: {
          id: { in: input.uploadIds },
          userId: resolvedById,
          consumed: false,
        },
        data: {
          consumed: true,
          consumedAt: new Date(),
        },
      });

      // If not all uploads were consumed, another concurrent transaction
      // beat us to it. Fail the transaction to prevent duplicate resolutions.
      if (consumeResult.count !== input.uploadIds.length) {
        throw new Error("Concurrent resolution submission detected: some uploads were already consumed");
      }

      const updated = await tx.issue.update({
        where: { id: issueId },
        data: { status: IssueStatus.RESOLUTION_SUBMITTED },
      });

      await tx.issueStatusHistory.create({
        data: {
          issueId,
          fromStatus: issue.status,
          toStatus: IssueStatus.RESOLUTION_SUBMITTED,
          reason: input.description,
        },
      });

      await tx.auditLog.create({
        data: {
          issueId,
          action: "RESOLUTION_SUBMITTED",
          actor: resolvedById,
          details: JSON.stringify({ resolutionId: resolution.id, evidenceCount: evidenceData.length }),
        },
      });

      await this.notifyIssueWatchers(tx, issueId, {
        actorId: resolvedById,
        type: "RESOLUTION_SUBMITTED",
        title: "Resolution proof submitted",
        body: input.description.slice(0, 160),
      });

      return { issue: updated, resolution };
    });
  }


  async disputeResolution(issueId: string, userId: string, input: DisputeResolutionInput) {
    const issue = await prisma.issue.findUniqueOrThrow({
      where: { id: issueId },
      include: {
        participants: true,
        resolutions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const canDispute =
      issue.reporterId === userId || issue.participants.some((participant) => participant.userId === userId);

    if (!canDispute) {
      throw new Error("Only the reporter or affected users can dispute a resolution");
    }

    if (!this.isValidTransition(issue.status, IssueStatus.DISPUTED)) {
      throw new Error(`Cannot dispute resolution when status is ${issue.status}`);
    }

    return await prisma.$transaction(async (tx) => {
      const dispute = await tx.issueDispute.create({
        data: {
          issueId,
          userId,
          resolutionId: issue.resolutions[0]?.id,
          reason: input.reason,
          evidenceUrls: input.evidenceUrls,
        },
      });

      // Perform a single update to REOPENED (DISPUTED is a transient logical state).
      // Both transition steps are recorded in status history for a full audit trail.
      const updated = await tx.issue.update({ where: { id: issueId }, data: { status: IssueStatus.REOPENED } });

      await tx.issueStatusHistory.createMany({
        data: [
          { issueId, fromStatus: issue.status, toStatus: IssueStatus.DISPUTED, reason: input.reason },
          {
            issueId,
            fromStatus: IssueStatus.DISPUTED,
            toStatus: IssueStatus.REOPENED,
            reason: "Resolution disputed and reopened",
          },
        ],
      });

      await tx.auditLog.create({
        data: {
          issueId,
          action: "RESOLUTION_DISPUTED",
          actor: userId,
          details: JSON.stringify({ disputeId: dispute.id }),
        },
      });

      await this.notifyIssueWatchers(tx, issueId, {
        actorId: userId,
        type: "REOPENED",
        title: "Issue reopened after dispute",
        body: input.reason.slice(0, 160),
      });

      return { issue: updated, dispute };
    });
  }

  async reportIssue(issueId: string, reporterId: string, input: ReportIssueInput) {
    const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { id: true } });
    if (!issue) {
      throw new Error("Issue not found");
    }

    return await prisma.$transaction(async (tx) => {
      const report = await tx.issueReport.upsert({
        where: { issueId_reporterId_reason: { issueId, reporterId, reason: input.reason } },
        update: { details: input.details },
        create: {
          issueId,
          reporterId,
          reason: input.reason,
          details: input.details,
        },
      });

      const reportCount = await tx.issueReport.count({ where: { issueId } });
      const updated = await tx.issue.update({
        where: { id: issueId },
        data: { moderationStatus: ModerationStatus.FLAGGED },
      });

      await tx.auditLog.create({
        data: {
          issueId,
          action: "ISSUE_REPORTED",
          actor: reporterId,
          details: JSON.stringify({ reportId: report.id, reportCount }),
        },
      });

      return { issue: updated, report, reportCount };
    });
  }

  async moderateIssue(issueId: string, moderatorId: string, input: ModerateIssueInput) {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.issue.update({
        where: { id: issueId },
        data: { moderationStatus: input.moderationStatus },
      });

      await tx.auditLog.create({
        data: {
          issueId,
          action: "MODERATION_DECISION",
          actor: moderatorId,
          details: JSON.stringify(input),
        },
      });

      await tx.notification.create({
        data: {
          userId: updated.reporterId,
          type: "MODERATION",
          title: "Moderation decision recorded",
          body: input.reason || `Issue marked ${input.moderationStatus}.`,
          issueId,
        },
      });

      return updated;
    });
  }

  async listReports() {
    return prisma.issueReport.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { id: true, name: true, role: true } },
        issue: true,
      },
    });
  }

  async listNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async markNotificationRead(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllNotificationsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  private async notifyIssueWatchers(
    tx: Prisma.TransactionClient,
    issueId: string,
    notification: {
      actorId: string;
      type: string;
      title: string;
      body: string;
    }
  ) {
    const watchers = await tx.issueFollower.findMany({
      where: { issueId, userId: { not: notification.actorId } },
      select: { userId: true },
    });

    if (watchers.length === 0) {
      return;
    }

    await tx.notification.createMany({
      data: watchers.map((watcher) => ({
        userId: watcher.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        issueId,
      })),
    });
  }
}

// Export singleton instance
export const issueService = new IssueService();
