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

export class FabricatedSpamError extends Error {
  public status: number;
  constructor(
    message: string = "This issue is likely fabricated or spam (spam rating > 80%, confidence < 30%). Please word the issue differently and ensure better flow before submitting again."
  ) {
    super(message);
    this.name = "FabricatedSpamError";
    this.status = 422;
  }
}

export class DuplicateIssueError extends Error {
  public status: number;
  public duplicateIssueId?: string | null;
  public duplicateIssueTitle?: string | null;

  constructor(
    message: string = "Issue already exists, instead of creating new one, upvote the previous issue",
    duplicateIssueId?: string | null,
    duplicateIssueTitle?: string | null
  ) {
    super(message);
    this.name = "DuplicateIssueError";
    this.status = 409;
    this.duplicateIssueId = duplicateIssueId;
    this.duplicateIssueTitle = duplicateIssueTitle;
  }
}

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
   * Analyzes the issue for spam, duplicates, and confidence:
   * 1. If duplicate of an existing unresolved issue: Reject with "Issue already exists, instead of creating new one, upvote the previous issue".
   * 2. If spamScore > 0.8 AND confidence < 0.3: Reject immediately (deleted/not created).
   * 3. If spamScore > 0.5 AND confidence < 0.6: Kept for review (UNDER_REVIEW) and not shown on public feed.
   * 4. Otherwise: Normal issue creation.
   */
  async createIssue(
    input: CreateIssueInput,
    reporterId: string
  ) {
    // 1. Run duplicate detection against currently active / unresolved issues
    const activeIssues = await prisma.issue.findMany({
      where: {
        status: { notIn: [IssueStatus.VERIFIED, IssueStatus.CLOSED] },
        moderationStatus: { not: ModerationStatus.REMOVED },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, title: true, description: true, location: true, status: true, category: true },
    });
    const duplicateCandidates = findDuplicateCandidates(input, activeIssues);

    // 2. Perform AI analysis for spam score, confidence, duplicate detection and triage
    const analysis = await analyzeIssue(input, activeIssues, duplicateCandidates);

    // Duplicate Check: If AI or similarity matches an existing unresolved issue
    if (analysis.isDuplicate || (duplicateCandidates.length > 0 && duplicateCandidates[0].confidence >= 0.70)) {
      const matchId = analysis.duplicateOfIssueId || duplicateCandidates[0]?.issueId;
      const matchTitle = analysis.duplicateIssueTitle || duplicateCandidates[0]?.title;
      throw new DuplicateIssueError(
        "Issue already exists, instead of creating new one, upvote the previous issue",
        matchId,
        matchTitle
      );
    }

    // Rule 3: If spam rating > 80% and confidence < 30%, reject and delete the issue
    if (analysis.spamScore > 0.8 && analysis.confidence < 0.3) {
      throw new FabricatedSpamError(
        "This issue is likely fabricated or spam (spam rating > 80%, confidence < 30%). Please word the issue differently and ensure better flow before submitting again."
      );
    }

    // Rule 1: If spam rating > 50% or confidence < 60%, keep for review and hide from main page
    const isUnderReview = (analysis.spamScore > 0.5 && analysis.confidence < 0.6) || analysis.spamScore > 0.5 || analysis.confidence < 0.6;
    const initialModerationStatus = isUnderReview
      ? ModerationStatus.UNDER_REVIEW
      : analysis.moderationFlags.length > 0
      ? ModerationStatus.FLAGGED
      : ModerationStatus.NORMAL;

    // 3. Persist issue in database within transaction
    const issue = await prisma.$transaction(async (tx) => {
      const issue = await tx.issue.create({
        data: {
          title: input.title,
          description: input.description,
          category: analysis.category || input.category || "UNCATEGORIZED",
          department: analysis.suggestedDepartment || input.department,
          location: input.location,
          suspectedCause: input.suspectedCause,
          proposedSolution: input.proposedSolution,
          attachments: input.attachments || [],
          assetId: input.assetId,
          reporterId,
          priority: analysis.aiPriority || IssuePriority.MEDIUM,
          moderationStatus: initialModerationStatus,
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

      // Create COMPLETED AI analysis record
      await tx.aIAnalysis.create({
        data: {
          issueId: issue.id,
          category: analysis.category,
          suggestedDepartment: analysis.suggestedDepartment,
          aiPriority: analysis.aiPriority,
          severity: analysis.severity,
          spamScore: analysis.spamScore,
          toxicityScore: analysis.toxicityScore,
          moderationFlags: analysis.moderationFlags,
          confidence: analysis.confidence,
          duplicateCandidates: analysis.duplicateCandidates.map((c) => JSON.stringify(c)),
          analysisStatus: "COMPLETED",
          modelUsed: analysis.modelUsed,
          reasoning: analysis.reasoning,
        },
      });

      // Record initial status in history
      await tx.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          fromStatus: IssueStatus.REPORTED,
          toStatus: IssueStatus.REPORTED,
          reason: isUnderReview ? "Issue created (held for spam review)" : "Issue created",
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          issueId: issue.id,
          action: "CREATE",
          actor: reporterId,
          details: JSON.stringify({
            title: input.title,
            assetId: input.assetId,
            spamScore: analysis.spamScore,
            confidence: analysis.confidence,
            moderationStatus: initialModerationStatus,
          }),
        },
      });

      await tx.issueParticipant.create({
        data: { issueId: issue.id, userId: reporterId },
      });

      await tx.issueFollower.create({
        data: { issueId: issue.id, userId: reporterId },
      });

      // If held for review, notify the reporter
      if (isUnderReview) {
        await tx.notification.create({
          data: {
            userId: reporterId,
            type: "MODERATION",
            title: "Issue Kept for Review",
            body: "Your issue may contain potential spam (spam rating > 50%, confidence < 60%) and has been kept for review before being displayed publicly.",
            issueId: issue.id,
          },
        });

        await tx.auditLog.create({
          data: {
            issueId: issue.id,
            action: "HELD_FOR_REVIEW",
            actor: "SYSTEM",
            details: JSON.stringify({
              spamScore: analysis.spamScore,
              confidence: analysis.confidence,
              reason: "Automated triage: spam > 50% and confidence < 60%",
            }),
          },
        });
      }

      return issue;
    });

    const enriched = await prisma.issue.findUnique({
      where: { id: issue.id },
      include: {
        reporter: { select: { id: true, name: true, role: true } },
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
    if (reporterId) {
      where.reporterId = reporterId;
      if (!includeRemoved) {
        where.NOT = { moderationStatus: ModerationStatus.REMOVED };
      }
    } else {
      if (!includeRemoved) {
        where.NOT = [
          { moderationStatus: ModerationStatus.REMOVED },
          { moderationStatus: ModerationStatus.UNDER_REVIEW },
        ];
      }
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
    return await prisma.$transaction(async (tx) => {
      const issue = await tx.issue.findUnique({
        where: { id },
      });

      if (!issue) {
        throw new Error(`Issue not found: ${id}`);
      }

      if (issue.status === toStatus) {
        return issue;
      }

      const isValidTransition = this.isValidTransition(issue.status, toStatus);
      if (!isValidTransition) {
        throw new Error(
          `Cannot transition from ${issue.status} to ${toStatus}`
        );
      }

      const updateResult = await tx.issue.updateMany({
        where: {
          id,
          status: issue.status,
        },
        data: {
          status: toStatus,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        const latestIssue = await tx.issue.findUnique({ where: { id } });
        if (latestIssue && latestIssue.status === toStatus) {
          return latestIssue;
        }
        throw new Error(`Issue ${id} has already transitioned and cannot be updated again.`);
      }

      const updated = await tx.issue.findUniqueOrThrow({
        where: { id },
      });

      await tx.issueStatusHistory.create({
        data: {
          issueId: id,
          fromStatus: issue.status,
          toStatus,
          reason,
        },
      });

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
    if (from === to) return true;

    const validTransitions: Record<IssueStatus, IssueStatus[]> = {
      [IssueStatus.REPORTED]: [
        IssueStatus.UNDER_REVIEW,
        IssueStatus.IN_PROGRESS,
        IssueStatus.RESOLUTION_SUBMITTED,
        IssueStatus.CLOSED,
      ],
      [IssueStatus.UNDER_REVIEW]: [
        IssueStatus.IN_PROGRESS,
        IssueStatus.RESOLUTION_SUBMITTED,
        IssueStatus.CLOSED,
        IssueStatus.REPORTED,
      ],
      [IssueStatus.IN_PROGRESS]: [
        IssueStatus.RESOLUTION_SUBMITTED,
        IssueStatus.UNDER_REVIEW,
        IssueStatus.CLOSED,
      ],
      [IssueStatus.RESOLUTION_SUBMITTED]: [
        IssueStatus.VERIFIED,
        IssueStatus.DISPUTED,
        IssueStatus.REOPENED,
        IssueStatus.IN_PROGRESS,
        IssueStatus.CLOSED,
      ],
      [IssueStatus.VERIFIED]: [
        IssueStatus.CLOSED,
        IssueStatus.DISPUTED,
        IssueStatus.REOPENED,
      ],
      [IssueStatus.CLOSED]: [
        IssueStatus.REOPENED,
        IssueStatus.IN_PROGRESS,
      ],
      [IssueStatus.REOPENED]: [
        IssueStatus.IN_PROGRESS,
        IssueStatus.UNDER_REVIEW,
        IssueStatus.RESOLUTION_SUBMITTED,
        IssueStatus.CLOSED,
      ],
      [IssueStatus.DISPUTED]: [
        IssueStatus.IN_PROGRESS,
        IssueStatus.UNDER_REVIEW,
        IssueStatus.RESOLUTION_SUBMITTED,
        IssueStatus.REOPENED,
        IssueStatus.CLOSED,
      ],
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
      });

      await tx.auditLog.create({
        data: {
          issueId,
          action: "MODERATION_DECISION",
          actor: moderatorId,
          details: JSON.stringify(input),
        },
      });

      let notifyTitle = `Issue Moderation: ${input.moderationStatus}`;
      let notifyBody = input.reason || `Issue marked ${input.moderationStatus}.`;

      if (input.moderationStatus === ModerationStatus.APPROVED) {
        notifyTitle = "Issue Approved for Public Feed";
        notifyBody = "Your issue has been reviewed and approved by administrators. It is now publicly visible on the campus feed.";
      } else if (input.moderationStatus === ModerationStatus.REMOVED) {
        notifyTitle = "Issue Removed by Moderator";
        notifyBody = input.reason || "Your issue was removed by administrators due to policy violations or spam.";
      }

      await tx.notification.create({
        data: {
          userId: updated.reporterId,
          type: "MODERATION",
          title: notifyTitle,
          body: notifyBody,
          issueId,
        },
      });

      return updated;
    });
  }

  /**
   * Permanently delete an issue from database (Admin action)
   */
  async hardDeleteIssue(id: string, actorId: string = "ADMIN") {
    const issue = await prisma.issue.findUnique({
      where: { id },
      select: { id: true, reporterId: true, title: true },
    });

    if (!issue) return null;

    try {
      await prisma.notification.create({
        data: {
          userId: issue.reporterId,
          type: "MODERATION",
          title: "Issue Deleted",
          body: `Your issue "${issue.title.slice(0, 60)}" was permanently deleted by administrator ${actorId}.`,
        },
      });
    } catch {}

    return await prisma.issue.delete({
      where: { id },
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
