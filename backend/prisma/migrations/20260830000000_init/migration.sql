-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'OFFICIAL', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('REPORTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'VERIFIED', 'CLOSED', 'REOPENED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('NORMAL', 'FLAGGED', 'UNDER_REVIEW', 'APPROVED', 'DUPLICATE', 'REMOVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "department" TEXT,
    "location" TEXT,
    "suspectedCause" TEXT,
    "proposedSolution" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'REPORTED',
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'NORMAL',
    "reporterId" TEXT NOT NULL,
    "affectedUserCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_participants" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_followers" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_followers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_resolutions" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "resolvedById" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolution_evidence" (
    "id" TEXT NOT NULL,
    "resolutionId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resolution_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_status_history" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "fromStatus" "IssueStatus" NOT NULL,
    "toStatus" "IssueStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_reports" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_disputes" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resolutionId" TEXT,
    "reason" TEXT NOT NULL,
    "evidenceUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "issueId" TEXT,
    "readAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analysis" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "suggestedDepartment" TEXT,
    "aiPriority" "IssuePriority" NOT NULL,
    "severity" TEXT NOT NULL,
    "spamScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "toxicityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "moderationFlags" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duplicateCandidates" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_embeddings" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "embedding" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");
CREATE INDEX "issues_status_idx" ON "issues"("status");
CREATE INDEX "issues_priority_idx" ON "issues"("priority");
CREATE INDEX "issues_moderationStatus_idx" ON "issues"("moderationStatus");
CREATE INDEX "issues_reporterId_idx" ON "issues"("reporterId");
CREATE INDEX "issues_createdAt_idx" ON "issues"("createdAt");
CREATE UNIQUE INDEX "issue_participants_issueId_userId_key" ON "issue_participants"("issueId", "userId");
CREATE UNIQUE INDEX "issue_followers_issueId_userId_key" ON "issue_followers"("issueId", "userId");
CREATE INDEX "comments_issueId_idx" ON "comments"("issueId");
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");
CREATE INDEX "issue_resolutions_issueId_idx" ON "issue_resolutions"("issueId");
CREATE INDEX "issue_resolutions_resolvedById_idx" ON "issue_resolutions"("resolvedById");
CREATE INDEX "resolution_evidence_resolutionId_idx" ON "resolution_evidence"("resolutionId");
CREATE INDEX "issue_status_history_issueId_idx" ON "issue_status_history"("issueId");
CREATE INDEX "issue_status_history_createdAt_idx" ON "issue_status_history"("createdAt");
CREATE INDEX "audit_logs_issueId_idx" ON "audit_logs"("issueId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "issue_reports_issueId_idx" ON "issue_reports"("issueId");
CREATE INDEX "issue_reports_reporterId_idx" ON "issue_reports"("reporterId");
CREATE INDEX "issue_reports_reason_idx" ON "issue_reports"("reason");
CREATE UNIQUE INDEX "issue_reports_issueId_reporterId_reason_key" ON "issue_reports"("issueId", "reporterId", "reason");
CREATE INDEX "issue_disputes_issueId_idx" ON "issue_disputes"("issueId");
CREATE INDEX "issue_disputes_userId_idx" ON "issue_disputes"("userId");
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");
CREATE INDEX "notifications_issueId_idx" ON "notifications"("issueId");
CREATE UNIQUE INDEX "ai_analysis_issueId_key" ON "ai_analysis"("issueId");
CREATE INDEX "ai_analysis_issueId_idx" ON "ai_analysis"("issueId");
CREATE UNIQUE INDEX "issue_embeddings_issueId_key" ON "issue_embeddings"("issueId");
CREATE INDEX "issue_embeddings_issueId_idx" ON "issue_embeddings"("issueId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issues" ADD CONSTRAINT "issues_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_participants" ADD CONSTRAINT "issue_participants_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_participants" ADD CONSTRAINT "issue_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_followers" ADD CONSTRAINT "issue_followers_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_followers" ADD CONSTRAINT "issue_followers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_resolutions" ADD CONSTRAINT "issue_resolutions_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_resolutions" ADD CONSTRAINT "issue_resolutions_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resolution_evidence" ADD CONSTRAINT "resolution_evidence_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "issue_resolutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_status_history" ADD CONSTRAINT "issue_status_history_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_disputes" ADD CONSTRAINT "issue_disputes_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_disputes" ADD CONSTRAINT "issue_disputes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_disputes" ADD CONSTRAINT "issue_disputes_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "issue_resolutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_embeddings" ADD CONSTRAINT "issue_embeddings_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
