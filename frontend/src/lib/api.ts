/**
 * Slashforge Campus Infrastructure & Issue Management API Client
 * 
 * Provides HTTP client bindings to the Next.js API backend at http://localhost:3000/api/v1
 * Uses `credentials: 'include'` to pass HTTP-only session cookies across origins.
 */

const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
export const API_BASE_URL = rawBase.replace(/\/+$/, '');

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

export interface Issue {
  id: string;
  title: string;
  description: string;
  category?: string;
  department?: string;
  location?: string;
  status: string;
  priority: string;
  categoryId?: string;
  departmentId?: string;
  locationId?: string;
  reporterId: string;
  reporter?: {
    id: string;
    name?: string | null;
    email?: string;
    role?: string;
  };
  reporterName?: string;
  reporterEmail?: string;
  reporterRole?: string;
  affectedUserCount?: number;
  affectedUserIds?: string[];
  followerUserIds?: string[];
  followers?: Array<{ userId: string; issueId: string }>;
  participants?: Array<{ userId: string; issueId: string }>;
  comments?: Array<{
    id: string;
    authorId: string;
    content: string;
    createdAt: string;
    author?: { id: string; name?: string | null; role?: string };
  }>;
  statusHistory?: Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    reason?: string | null;
    createdAt: string;
  }>;
  resolutions?: Array<{
    id: string;
    resolvedById: string;
    description: string;
    createdAt: string;
    resolvedBy?: { id: string; name?: string | null };
    evidenceImages?: Array<{ storageKey: string; mimeType: string; fileSize: number }>;
  }>;
  analysis?: {
    category: string;
    suggestedDepartment?: string | null;
    severity: string;
    aiPriority: string;
    confidence?: number;
    spamScore?: number;
    moderationFlags?: string[];
    duplicateCandidates?: string[];
    reasoning?: string | null;
    modelUsed?: string | null;
  } | null;
  assetId?: string | null;
  asset?: Asset | null;
  createdAt: string;
  updatedAt: string;
  locationDetails?: string;
  possibleCause?: string;
  suspectedCause?: string | null;
  suggestedSolution?: string;
  proposedSolution?: string | null;
  occurredAt?: string;
  attachments?: string[];
  resolutionProof?: {
    description?: string;
    notes?: string;
    imageUrl?: string;
    resolvedAt?: string;
    resolvedById?: string;
    resolvedByName?: string;
  };
  moderationStatus?: string;
}

export interface IssueComment {
  id: string;
  issueId: string;
  userId?: string;
  authorId?: string;
  authorName?: string;
  userName?: string;
  authorRole?: string;
  userRole?: string;
  content: string;
  body?: string;
  author?: {
    id: string;
    name?: string | null;
    role?: string;
  };
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  assetTag: string;
  category: string;
  departmentId: string;
  locationId: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'OUT_OF_SERVICE' | 'UNDER_MAINTENANCE' | string;
  modelNumber?: string | null;
  serialNumber?: string | null;
  installedAt?: string;
  lastServicedAt?: string;
  reportedIssuesCount?: number;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface IssueStatusHistory {
  id: string;
  issueId: string;
  fromStatus: string;
  toStatus: string;
  changedBy?: string;
  changedById?: string;
  changedByName?: string;
  changedByRole?: string;
  changedAt?: string;
  createdAt?: string;
  reason?: string | null;
}

function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let base = API_BASE_URL;
  if (!base.includes('/api/v1')) {
    base = `${base}/api/v1`;
  }
  return `${base}${cleanEndpoint}`;
}

/**
 * Normalizes any image URL (local upload, relative path, base64 data URI, or external GCS URL)
 * into a valid browser-loadable image source.
 */
export function formatImageUrl(url?: string): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('/api/v1/storage/')) {
    return `${apiOrigin}${cleanUrl}`;
  }
  return `${apiOrigin}/uploads/${url}`;
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = buildApiUrl(endpoint);
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('slashforge_auth_token');
      if (storedToken && !headers['Authorization'] && !headers['authorization']) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }
    }

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

  async googleAuth(params: { credential?: string; accessToken?: string; email?: string; name?: string; avatarUrl?: string }) {
    const res = await apiFetch<AuthUser & { session: { sessionId: string; token?: string; expiresAt: string } }>(
      '/auth/google',
      { method: 'POST', body: JSON.stringify(params) }
    );
    if (res.data?.session && typeof window !== 'undefined') {
      const token = res.data.session.token || res.data.session.sessionId;
      localStorage.setItem('slashforge_auth_token', token);
    }
    return res;
  },

  async login(email: string, password: string) {
    const res = await apiFetch<AuthUser & { session: { sessionId: string; token?: string; expiresAt: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    if (res.data?.session && typeof window !== 'undefined') {
      const token = res.data.session.token || res.data.session.sessionId;
      localStorage.setItem('slashforge_auth_token', token);
    }
    return res;
  },

  /**
   * Register a new account.
   * Backend returns the new user + session directly (not nested under a `user` key).
   */
  async register(email: string, password: string, name?: string) {
    const res = await apiFetch<AuthUser & { session: { sessionId: string; token?: string; expiresAt: string } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ email, password, name }) }
    );
    if (res.data?.session && typeof window !== 'undefined') {
      const token = res.data.session.token || res.data.session.sessionId;
      localStorage.setItem('slashforge_auth_token', token);
    }
    return res;
  },

  async getSession() {
    return apiFetch<{ user: AuthUser; isAuthenticated: boolean }>(
      '/auth/session',
      { method: 'GET' }
    );
  },

  async logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('slashforge_auth_token');
    }
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
    return apiFetch<{ issues: Array<Issue>; total: number; pages: number; skip: number; take: number }>(
      `/issues${query}`,
      { method: 'GET' }
    );
  },

  async getIssue(id: string) {
    return apiFetch<Issue>(`/issues/${id}`, { method: 'GET' });
  },

  async createIssue(data: {
    title: string;
    description: string;
    category?: string;
    department?: string;
    location?: string;
    suspectedCause?: string;
    proposedSolution?: string;
    attachments?: string[];
  }) {
    return apiFetch<Issue>('/issues', { method: 'POST', body: JSON.stringify(data) });
  },

  // ─── Affected ──────────────────────────────────────────────────────────────

  /** Mark the current user as affected by this issue (POST) */
  async markAffected(issueId: string) {
    return apiFetch<{ message: string; issue: Issue }>(`/issues/${issueId}/affected`, {
      method: 'POST',
    });
  },

  /** Remove the current user's affected marker (DELETE) */
  async markUnaffected(issueId: string) {
    return apiFetch<{ message: string; issue: Issue }>(`/issues/${issueId}/affected`, {
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
    return apiFetch<IssueComment>(`/issues/${issueId}/comments`, {
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
    return apiFetch<Issue>(`/admin/issues/${issueId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ description, uploadIds }),
    });
  },

  /**
   * Dispute a submitted resolution.
   * `evidenceUrls` is optional — these are plain image URLs (not uploadIds).
   */
  async disputeResolution(issueId: string, reason: string, evidenceUrls?: string[]) {
    return apiFetch<Issue>(`/issues/${issueId}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ reason, evidenceUrls: evidenceUrls || [] }),
    });
  },

  /**
   * Flag issue content for moderation.
   * `reason` must be a lowercase enum: 'spam' | 'duplicate' | 'inappropriate' | 'misleading' | 'other'
   */
  async reportContent(issueId: string, reason: string, details?: string) {
    return apiFetch<Issue>(`/issues/${issueId}/report`, {
      method: 'POST',
      // Backend ReportIssueSchema expects lowercase enum values — do NOT uppercase
      body: JSON.stringify({ reason, details }),
    });
  },

  // ─── Admin / Moderation ────────────────────────────────────────────────────

  async getModerationQueue() {
    return apiFetch<{ reports: Array<unknown>; flaggedIssues: Array<Issue> }>('/admin/moderation', { method: 'GET' });
  },

  async moderateIssue(issueId: string, moderationStatus: string, reason?: string) {
    return apiFetch<Issue>(`/admin/moderation/${issueId}`, {
      method: 'PATCH',
      body: JSON.stringify({ moderationStatus, reason }),
    });
  },

  async deleteModeratedIssue(issueId: string) {
    return apiFetch<{ message: string; id: string }>(`/admin/moderation/${issueId}`, {
      method: 'DELETE',
    });
  },

  // ─── Status Transitions ───────────────────────────────────────────────────

  async transitionStatus(issueId: string, toStatus: string, reason?: string) {
    return apiFetch<{ message: string; issue: Issue }>(`/issues/${issueId}/status`, {
      method: 'POST',
      body: JSON.stringify({ toStatus, reason }),
    });
  },

  // ─── Notifications ─────────────────────────────────────────────────────────

  async getNotifications() {
    return apiFetch<{ notifications: Array<{ id: string; issueId: string; message: string; createdAt: string; read: boolean }> }>('/notifications', { method: 'GET' });
  },

  async markNotificationRead(id: string) {
    return apiFetch<{ id: string; read: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllNotificationsRead() {
    return apiFetch<{ message: string; count: number }>('/notifications', { method: 'PATCH' });
  },

  // ─── Assets ───────────────────────────────────────────────────────────────

  async listAssets(params: { departmentId?: string; category?: string; status?: string; search?: string; skip?: number; take?: number } = {}) {
    const searchParams = new URLSearchParams();
    if (params.departmentId) searchParams.set('departmentId', params.departmentId);
    if (params.category) searchParams.set('category', params.category);
    if (params.status && params.status !== 'ALL') searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.skip) searchParams.set('skip', params.skip.toString());
    if (params.take) searchParams.set('take', params.take.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiFetch<{ assets: Array<Asset>; total: number; skip: number; take: number }>(`/assets${query}`, {
      method: 'GET',
    });
  },

  async getAsset(id: string) {
    return apiFetch<Asset>(`/assets/${id}`, { method: 'GET' });
  },

  async createAsset(data: {
    name: string;
    assetTag: string;
    category: string;
    departmentId: string;
    locationId: string;
    status?: string;
    modelNumber?: string;
    serialNumber?: string;
    imageUrl?: string;
  }) {
    return apiFetch<Asset>('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAsset(id: string, data: Partial<Asset>) {
    return apiFetch<Asset>(`/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteAsset(id: string) {
    return apiFetch<{ message: string }>(`/assets/${id}`, {
      method: 'DELETE',
    });
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
