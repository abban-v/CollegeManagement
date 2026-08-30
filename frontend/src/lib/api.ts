/**
 * Slashforge Campus Infrastructure & Issue Management API Client
 * 
 * Provides HTTP client bindings to the Next.js API backend at http://localhost:3000/api/v1
 * Uses `credentials: 'include'` to pass HTTP-only session cookies across origins.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/** Shape of a user returned by auth endpoints */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: 'STUDENT' | 'OFFICIAL' | 'MODERATOR' | 'ADMIN';
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Ensures HTTP-only slashforge_session cookie is sent
    });

    const json = await response.json();
    return json as ApiResponse<T>;
  } catch (error) {
    console.warn(`API request to ${endpoint} failed:`, error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error or backend unreachable',
      status: 500,
    };
  }
}

export const apiClient = {
  // ─── Authentication ────────────────────────────────────────────────────────

  async googleAuth(params: { credential?: string; email?: string; name?: string }) {
    return apiFetch<AuthUser & { session: { sessionId: string; expiresAt: string } }>(
      '/auth/google',
      { method: 'POST', body: JSON.stringify(params) }
    );
  },

  async login(email: string, password: string) {
    return apiFetch<AuthUser & { session: { sessionId: string; expiresAt: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
  },

  /**
   * Register a new account.
   * Backend returns the new user + session directly (not nested under a `user` key).
   */
  async register(email: string, password: string, name?: string, role: string = 'STUDENT') {
    return apiFetch<AuthUser & { session: { sessionId: string; expiresAt: string } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ email, password, name, role }) }
    );
  },

  async getSession() {
    return apiFetch<{ user: AuthUser; isAuthenticated: boolean }>(
      '/auth/session',
      { method: 'GET' }
    );
  },

  async logout() {
    return apiFetch<{ message: string }>('/auth/logout', { method: 'POST' });
  },

  // ─── Issues ────────────────────────────────────────────────────────────────

  async listIssues(params: { skip?: number; take?: number; status?: string; priority?: string } = {}) {
    const searchParams = new URLSearchParams();
    if (params.skip) searchParams.set('skip', params.skip.toString());
    if (params.take) searchParams.set('take', params.take.toString());
    if (params.status && params.status !== 'ALL') searchParams.set('status', params.status);
    if (params.priority && params.priority !== 'ALL') searchParams.set('priority', params.priority);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiFetch<{ issues: Array<any>; total: number; skip: number; take: number }>(
      `/issues${query}`,
      { method: 'GET' }
    );
  },

  async getIssue(id: string) {
    return apiFetch<any>(`/issues/${id}`, { method: 'GET' });
  },

  async createIssue(data: {
    title: string;
    description: string;
    category?: string;
    department?: string;
    location?: string;
    suspectedCause?: string;
    proposedSolution?: string;
  }) {
    return apiFetch<any>('/issues', { method: 'POST', body: JSON.stringify(data) });
  },

  // ─── Affected ──────────────────────────────────────────────────────────────

  /** Mark the current user as affected by this issue (POST) */
  async markAffected(issueId: string) {
    return apiFetch<{ message: string; issue: any }>(`/issues/${issueId}/affected`, {
      method: 'POST',
    });
  },

  /** Remove the current user's affected marker (DELETE) */
  async markUnaffected(issueId: string) {
    return apiFetch<{ message: string; issue: any }>(`/issues/${issueId}/affected`, {
      method: 'DELETE',
    });
  },

  // ─── Followers ─────────────────────────────────────────────────────────────

  /** Follow an issue (POST) */
  async followIssue(issueId: string) {
    return apiFetch<{ followed: boolean }>(`/issues/${issueId}/followers`, {
      method: 'POST',
    });
  },

  /** Unfollow an issue (DELETE) */
  async unfollowIssue(issueId: string) {
    return apiFetch<{ followed: boolean }>(`/issues/${issueId}/followers`, {
      method: 'DELETE',
    });
  },

  // ─── Comments ──────────────────────────────────────────────────────────────

  async addComment(issueId: string, content: string) {
    return apiFetch<any>(`/issues/${issueId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // ─── Resolution Workflow ───────────────────────────────────────────────────

  /**
   * Submit resolution proof.
   * Backend expects `uploadIds` — an array of UUIDs obtained from a prior /upload call.
   */
  async submitResolution(issueId: string, description: string, uploadIds: string[]) {
    return apiFetch<any>(`/admin/issues/${issueId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ description, uploadIds }),
    });
  },

  /**
   * Dispute a submitted resolution.
   * `evidenceUrls` is optional — these are plain image URLs (not uploadIds).
   */
  async disputeResolution(issueId: string, reason: string, evidenceUrls?: string[]) {
    return apiFetch<any>(`/issues/${issueId}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ reason, evidenceUrls: evidenceUrls || [] }),
    });
  },

  /**
   * Flag issue content for moderation.
   * `reason` must be a lowercase enum: 'spam' | 'duplicate' | 'inappropriate' | 'misleading' | 'other'
   */
  async reportContent(issueId: string, reason: string, details?: string) {
    return apiFetch<any>(`/issues/${issueId}/report`, {
      method: 'POST',
      // Backend ReportIssueSchema expects lowercase enum values — do NOT uppercase
      body: JSON.stringify({ reason, details }),
    });
  },

  // ─── Admin / Moderation ────────────────────────────────────────────────────

  async getModerationQueue() {
    return apiFetch<{ flaggedIssues: Array<any> }>('/admin/moderation', { method: 'GET' });
  },

  async moderateIssue(issueId: string, moderationStatus: string, reason?: string) {
    return apiFetch<any>(`/admin/moderation/${issueId}`, {
      method: 'PATCH',
      body: JSON.stringify({ moderationStatus, reason }),
    });
  },

  // ─── Status Transitions ───────────────────────────────────────────────────

  async transitionStatus(issueId: string, toStatus: string, reason?: string) {
    return apiFetch<{ message: string; issue: any }>(`/issues/${issueId}/status`, {
      method: 'POST',
      body: JSON.stringify({ toStatus, reason }),
    });
  },

  // ─── Notifications ─────────────────────────────────────────────────────────

  async getNotifications() {
    return apiFetch<{ notifications: Array<any> }>('/notifications', { method: 'GET' });
  },

  async markNotificationRead(id: string) {
    return apiFetch<any>(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllNotificationsRead() {
    return apiFetch<{ message: string; count: number }>('/notifications', { method: 'PATCH' });
  },

  // ─── File Upload ───────────────────────────────────────────────────────────

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return apiFetch<{
      uploadId: string;
      storageKey: string;
      publicUrl: string;
      mimeType: string;
      fileSize: number;
    }>('/upload', {
      method: 'POST',
      body: formData,
    });
  },
};
