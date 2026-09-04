-- Enable Row Level Security on all public tables

-- ============================================
-- USERS TABLE
-- ============================================
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY users_view_own ON "public"."users"
  FOR SELECT USING (auth.uid()::text = id);

-- Policy: Users can update their own profile (except sensitive fields)
CREATE POLICY users_update_own ON "public"."users"
  FOR UPDATE USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- Policy: Admins can view all users
CREATE POLICY users_view_admin ON "public"."users"
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT id FROM "public"."users" WHERE role = 'ADMIN'
    )
  );

-- Policy: Admins can update all users
CREATE POLICY users_update_admin ON "public"."users"
  FOR UPDATE USING (
    auth.uid()::text IN (
      SELECT id FROM "public"."users" WHERE role = 'ADMIN'
    )
  );

-- ============================================
-- SESSIONS TABLE
-- ============================================
ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY sessions_view_own ON "public"."sessions"
  FOR SELECT USING (auth.uid()::text = "userId");

-- Policy: Users can delete their own sessions
CREATE POLICY sessions_delete_own ON "public"."sessions"
  FOR DELETE USING (auth.uid()::text = "userId");

-- ============================================
-- ISSUES TABLE
-- ============================================
ALTER TABLE "public"."issues" ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view public issues
CREATE POLICY issues_view_public ON "public"."issues"
  FOR SELECT USING (true);

-- Policy: Reporters can insert new issues
CREATE POLICY issues_insert_authenticated ON "public"."issues"
  FOR INSERT WITH CHECK (auth.uid()::text = "reporterId");

-- Policy: Reporters and admins can update issues
CREATE POLICY issues_update_own ON "public"."issues"
  FOR UPDATE USING (
    auth.uid()::text = "reporterId" OR
    auth.uid()::text IN (
      SELECT id FROM "public"."users" WHERE role IN ('ADMIN', 'MODERATOR')
    )
  );

-- ============================================
-- COMMENTS TABLE
-- ============================================
ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view comments
CREATE POLICY comments_view_public ON "public"."comments"
  FOR SELECT USING (true);

-- Policy: Authenticated users can insert comments
CREATE POLICY comments_insert_authenticated ON "public"."comments"
  FOR INSERT WITH CHECK (auth.uid()::text = "authorId");

-- Policy: Users can update their own comments
CREATE POLICY comments_update_own ON "public"."comments"
  FOR UPDATE USING (auth.uid()::text = "authorId");

-- Policy: Users can delete their own comments
CREATE POLICY comments_delete_own ON "public"."comments"
  FOR DELETE USING (auth.uid()::text = "authorId");

-- ============================================
-- ISSUE FOLLOWERS TABLE
-- ============================================
ALTER TABLE "public"."issue_followers" ENABLE ROW LEVEL SECURITY;

-- Policy: All users can view follower relationships
CREATE POLICY issue_followers_view ON "public"."issue_followers"
  FOR SELECT USING (true);

-- Policy: Users can follow/unfollow issues for themselves
CREATE POLICY issue_followers_manage_own ON "public"."issue_followers"
  FOR ALL USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ============================================
-- ISSUE PARTICIPANTS TABLE
-- ============================================
ALTER TABLE "public"."issue_participants" ENABLE ROW LEVEL SECURITY;

-- Policy: All users can view participant relationships
CREATE POLICY issue_participants_view ON "public"."issue_participants"
  FOR SELECT USING (true);

-- Policy: Admins and moderators can manage participants
CREATE POLICY issue_participants_manage ON "public"."issue_participants"
  FOR ALL USING (
    auth.uid()::text IN (
      SELECT id FROM "public"."users" WHERE role IN ('ADMIN', 'MODERATOR')
    )
  );

-- ============================================
-- ISSUE RESOLUTIONS TABLE
-- ============================================
ALTER TABLE "public"."issue_resolutions" ENABLE ROW LEVEL SECURITY;

-- Policy: All users can view resolutions
CREATE POLICY issue_resolutions_view ON "public"."issue_resolutions"
  FOR SELECT USING (true);

-- Policy: Admins and official users can create resolutions
CREATE POLICY issue_resolutions_insert ON "public"."issue_resolutions"
  FOR INSERT WITH CHECK (
    auth.uid()::text IN (
      SELECT id FROM "public"."users" WHERE role IN ('ADMIN', 'OFFICIAL', 'MODERATOR')
    )
  );

-- Policy: Admins can update resolutions
CREATE POLICY issue_resolutions_update ON "public"."issue_resolutions"
  FOR UPDATE USING (
    auth.uid()::text IN (
      SELECT id FROM "public"."users" WHERE role IN ('ADMIN', 'MODERATOR')
    )
  );

-- ============================================
-- RESOLUTION EVIDENCE TABLE
-- ============================================
ALTER TABLE "public"."resolution_evidence" ENABLE ROW LEVEL SECURITY;

-- Policy: All users can view resolution evidence
CREATE POLICY resolution_evidence_view ON "public"."resolution_evidence"
  FOR SELECT USING (true);

-- Policy: Admins can manage resolution evidence
CREATE POLICY resolution_evidence_manage ON "public"."resolution_evidence"
  FOR ALL USING (
    auth.uid()::text IN (
      SELECT id FROM "public"."users" WHERE role IN ('ADMIN', 'OFFICIAL', 'MODERATOR')
    )
  );

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own notifications
CREATE POLICY notifications_view_own ON "public"."notifications"
  FOR SELECT USING (auth.uid()::text = "userId");

-- Policy: System can insert notifications (assuming service account)
CREATE POLICY notifications_insert_system ON "public"."notifications"
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own notifications (e.g., mark as read)
CREATE POLICY notifications_update_own ON "public"."notifications"
  FOR UPDATE USING (auth.uid()::text = "userId");

-- Policy: Users can delete their own notifications
CREATE POLICY notifications_delete_own ON "public"."notifications"
  FOR DELETE USING (auth.uid()::text = "userId");

-- ============================================
-- ISSUE REPORTS TABLE
-- ============================================
ALTER TABLE "public"."issue_reports" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reports for their own issues (as reporter)
CREATE POLICY issue_reports_view_own_issue ON "public"."issue_reports"
  FOR SELECT USING (
    "issueId" IN (
      SELECT id FROM "public"."issues" WHERE "reporterId" = auth.uid()::text
    )
  );

-- Policy: Admins and moderators can view all reports
CREATE POLICY issue_reports_view_admin ON "public"."issue_reports"
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT id FROM "public"."users" WHERE role IN ('ADMIN', 'MODERATOR')
    )
  );

-- Policy: Authenticated users can report issues
CREATE POLICY issue_reports_insert ON "public"."issue_reports"
  FOR INSERT WITH CHECK (auth.uid()::text = "reporterId");

-- Policy: Admins can update reports
CREATE POLICY issue_reports_update ON "public"."issue_reports"
  FOR UPDATE USING (
    auth.uid()::text IN (
      SELECT id FROM "public"."users" WHERE role IN ('ADMIN', 'MODERATOR')
    )
  );

-- ============================================
-- ISSUE DISPUTES TABLE
-- ============================================
ALTER TABLE "public"."issue_disputes" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view disputes for issues they're involved with
CREATE POLICY issue_disputes_view_involved ON "public"."issue_disputes"
  FOR SELECT USING (
    auth.uid()::text = "userId" OR
    "issueId" IN (
      SELECT id FROM "public"."issues" WHERE "reporterId" = auth.uid()::text
    )
  );

-- Policy: Admins can view all disputes
CREATE POLICY issue_disputes_view_admin ON "public"."issue_disputes"
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT id FROM "public"."users" WHERE role IN ('ADMIN', 'MODERATOR')
    )
  );

-- Policy: Users can create disputes
CREATE POLICY issue_disputes_insert ON "public"."issue_disputes"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- Policy: Admins can update disputes
CREATE POLICY issue_disputes_update ON "public"."issue_disputes"
  FOR UPDATE USING (
    auth.uid()::text IN (
      SELECT id FROM "public"."users" WHERE role IN ('ADMIN', 'MODERATOR')
    )
  );

-- ============================================
-- ISSUE STATUS HISTORY TABLE
-- ============================================
ALTER TABLE "public"."issue_status_history" ENABLE ROW LEVEL SECURITY;

-- Policy: All users can view status history
CREATE POLICY issue_status_history_view ON "public"."issue_status_history"
  FOR SELECT USING (true);

-- Policy: System only (internal)
CREATE POLICY issue_status_history_insert ON "public"."issue_status_history"
  FOR INSERT WITH CHECK (true);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all audit logs
CREATE POLICY audit_logs_view ON "public"."audit_logs"
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT id FROM "public"."users" WHERE role IN ('ADMIN', 'MODERATOR')
    )
  );

-- Policy: System only for inserts
CREATE POLICY audit_logs_insert ON "public"."audit_logs"
  FOR INSERT WITH CHECK (true);

-- ============================================
-- UPLOAD REFERENCES TABLE
-- ============================================
ALTER TABLE "public"."upload_references" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own uploads
CREATE POLICY upload_references_view_own ON "public"."upload_references"
  FOR SELECT USING (auth.uid()::text = "userId");

-- Policy: Admins can view all uploads
CREATE POLICY upload_references_view_admin ON "public"."upload_references"
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT id FROM "public"."users" WHERE role IN ('ADMIN', 'MODERATOR')
    )
  );

-- Policy: Users can insert their own uploads
CREATE POLICY upload_references_insert ON "public"."upload_references"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- Policy: Users can update their own uploads
CREATE POLICY upload_references_update ON "public"."upload_references"
  FOR UPDATE USING (auth.uid()::text = "userId");

-- Policy: Users can delete their own uploads
CREATE POLICY upload_references_delete ON "public"."upload_references"
  FOR DELETE USING (auth.uid()::text = "userId");

-- ============================================
-- AI ANALYSIS TABLE
-- ============================================
ALTER TABLE "public"."ai_analysis" ENABLE ROW LEVEL SECURITY;

-- Policy: All users can view AI analysis
CREATE POLICY ai_analysis_view ON "public"."ai_analysis"
  FOR SELECT USING (true);

-- Policy: System only for inserts/updates
CREATE POLICY ai_analysis_manage ON "public"."ai_analysis"
  FOR ALL USING (true)
  WITH CHECK (true);

-- ============================================
-- ISSUE EMBEDDINGS TABLE
-- ============================================
ALTER TABLE "public"."issue_embeddings" ENABLE ROW LEVEL SECURITY;

-- Policy: All users can view embeddings (for semantic search)
CREATE POLICY issue_embeddings_view ON "public"."issue_embeddings"
  FOR SELECT USING (true);

-- Policy: System only for inserts/updates
CREATE POLICY issue_embeddings_manage ON "public"."issue_embeddings"
  FOR ALL USING (true)
  WITH CHECK (true);

-- ============================================
-- ASSETS TABLE
-- ============================================
ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;

-- Policy: All users can view assets
CREATE POLICY assets_view ON "public"."assets"
  FOR SELECT USING (true);

-- Policy: Admins and official users can manage assets
CREATE POLICY assets_manage ON "public"."assets"
  FOR ALL USING (
    auth.uid()::text IN (
      SELECT id FROM "public"."users" WHERE role IN ('ADMIN', 'OFFICIAL')
    )
  );
