'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  Issue,
  IssueStatus,
  ModerationStatus,
  IssuePriority,
  IssueComment,
  IssueStatusHistory,
  AppNotification,
  Asset,
  Department,
  CampusLocation,
  IssueCategory,
  ResolutionProof,
  UserRole,
  AIAnalysis,
  IssueReport,
} from './types';
import {
  MOCK_USERS,
  MOCK_DEPARTMENTS,
  MOCK_LOCATIONS,
  MOCK_CATEGORIES,
  MOCK_ASSETS,
  MOCK_ISSUES,
  MOCK_COMMENTS,
  MOCK_STATUS_HISTORY,
  MOCK_NOTIFICATIONS,
} from './mock-data';
import { apiClient, formatImageUrl } from './api';

interface CreateIssueInput {
  title: string;
  description: string;
  categoryId: string;
  departmentId: string;
  locationId: string;
  locationDetails?: string;
  assetId?: string;
  priority: IssuePriority;
  possibleCause?: string;
  suggestedSolution?: string;
  occurredAt?: string;
  attachments?: string[];
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  isLoadingAuth: boolean;
  login: (email: string, password?: string) => Promise<User>;
  setUserFromAuthResponse: (userData: { id: string; email: string; name: string | null; role: string }) => User;
  logout: () => Promise<void>;
  refreshIssues: () => Promise<void>;
  refreshAssets: () => Promise<void>;
  fetchIssueDetail: (issueId: string) => Promise<Issue | undefined>;
  
  issues: Issue[];
  departments: Department[];
  locations: CampusLocation[];
  categories: IssueCategory[];
  assets: Asset[];
  comments: Record<string, IssueComment[]>;
  statusHistory: Record<string, IssueStatusHistory[]>;
  notifications: AppNotification[];
  reports: IssueReport[];
  
  createIssue: (input: CreateIssueInput) => Promise<Issue>;
  toggleAffected: (issueId: string) => Promise<void>;
  toggleFollow: (issueId: string) => Promise<void>;
  updateStatus: (issueId: string, newStatus: IssueStatus, reason?: string, proof?: { imageUrl: string; notes: string }) => Promise<boolean>;
  submitResolution: (issueId: string, notes: string, imageUrl: string, uploadId?: string) => Promise<boolean>;
  verifyResolution: (issueId: string) => Promise<boolean>;
  disputeResolution: (issueId: string, reason: string, evidenceUrls?: string[]) => Promise<boolean>;
  reopenIssue: (issueId: string, reason: string, evidenceUrls?: string[]) => Promise<boolean>;
  assignIssue: (issueId: string, assigneeId: string, assigneeName: string) => void;
  addComment: (issueId: string, body: string, attachments?: string[]) => Promise<void>;
  reportIssueContent: (issueId: string, reason: IssueReport['reason'], details?: string) => Promise<void>;
  moderateIssue: (issueId: string, moderationStatus: ModerationStatus, reason?: string) => Promise<void>;
  addAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (assetId: string) => Promise<void>;
  
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  
  getAssetById: (id?: string) => Asset | undefined;
  getDepartmentById: (id?: string) => Department | undefined;
  getLocationById: (id?: string) => CampusLocation | undefined;
  getCategoryById: (id?: string) => IssueCategory | undefined;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  CURRENT_USER: 'slashforge_current_user_v6',
  ISSUES: 'slashforge_issues_v6',
  COMMENTS: 'slashforge_comments_v6',
  HISTORY: 'slashforge_history_v6',
  NOTIFICATIONS: 'slashforge_notifications_v6',
  ASSETS: 'slashforge_assets_v6',
  REPORTS: 'slashforge_reports_v6',
};

function findCategoryIdentifier(nameOrId?: string): string {
  if (!nameOrId) return 'cat-general';
  const lower = nameOrId.toLowerCase().trim();
  const found = MOCK_CATEGORIES.find((c) => c.id.toLowerCase() === lower || c.name.toLowerCase() === lower);
  return found ? found.id : nameOrId;
}

function findDepartmentIdentifier(nameOrId?: string): string {
  if (!nameOrId) return 'dept-facilities';
  const lower = nameOrId.toLowerCase().trim();
  const found = MOCK_DEPARTMENTS.find(
    (d) => d.id.toLowerCase() === lower || d.name.toLowerCase() === lower || d.code.toLowerCase() === lower
  );
  return found ? found.id : nameOrId;
}

// Helper to adapt backend issue object to frontend Issue type
function mapBackendIssueToFrontend(item: Record<string, unknown>): Issue {
  const categoryId = findCategoryIdentifier(String(item.category ?? ''));
  const departmentId = findDepartmentIdentifier(String(item.department ?? ''));
  const reporter = (item.reporter as { name?: string; email?: string; role?: string } | undefined) ?? {};
  const resolutionArray = Array.isArray(item.resolutions) ? (item.resolutions as Array<Record<string, unknown>>) : [];
  const analysis = (item.analysis as Record<string, unknown> | undefined) ?? undefined;
  const resolutionProofValue = item.resolutionProof as Record<string, unknown> | undefined;
  const resolutionEntry = resolutionArray[0];
  const evidenceImages = Array.isArray(resolutionEntry?.evidenceImages)
    ? (resolutionEntry.evidenceImages as Array<Record<string, unknown>>)
    : [];

  const mappedResolutionProof = resolutionEntry
    ? {
        imageUrl: formatImageUrl(
          (String((evidenceImages[0]?.storageKey as string | undefined) ?? '') || String((resolutionProofValue?.imageUrl as string | undefined) ?? ''))
        ),
        resolvedById: String((resolutionEntry.resolvedById as string | undefined) ?? 'unknown'),
        resolvedByName: String(((resolutionEntry.resolvedBy as Record<string, unknown> | undefined)?.name as string | undefined) ?? 'Facilities Official'),
        notes: String((resolutionEntry.description as string | undefined) ?? ''),
        resolvedAt: String((resolutionEntry.createdAt as string | undefined) ?? new Date().toISOString()),
      }
    : resolutionProofValue
      ? {
          imageUrl: formatImageUrl(String(resolutionProofValue.imageUrl ?? '')),
          resolvedById: String((resolutionProofValue.resolvedById as string | undefined) ?? 'unknown'),
          resolvedByName: String((resolutionProofValue.resolvedByName as string | undefined) ?? 'Facilities Official'),
          notes: String((resolutionProofValue.notes as string | undefined) ?? ''),
          resolvedAt: String((resolutionProofValue.resolvedAt as string | undefined) ?? new Date().toISOString()),
        }
      : undefined;

  const mappedAnalysis = analysis
    ? {
        category: String(analysis.category ?? 'General Equipment'),
        suggestedDepartment: String(analysis.suggestedDepartment ?? 'Facilities'),
        severity: (String(analysis.severity ?? 'MEDIUM') as AIAnalysis['severity']) || 'MEDIUM',
        priority: (String((analysis.aiPriority ?? analysis.priority) ?? 'MEDIUM') as AIAnalysis['priority']) || 'MEDIUM',
        confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 0.94,
        spamScore: typeof analysis.spamScore === 'number' ? analysis.spamScore : 0.01,
        moderationFlags: Array.isArray(analysis.moderationFlags) ? analysis.moderationFlags.map(String) : [],
        duplicateCandidates: Array.isArray(analysis.duplicateCandidates) ? analysis.duplicateCandidates.map((candidate) => ({
          issueId: String((candidate as Record<string, unknown>).issueId ?? 'unknown'),
          title: String((candidate as Record<string, unknown>).title ?? ''),
          confidence: typeof (candidate as Record<string, unknown>).confidence === 'number' ? Number((candidate as Record<string, unknown>).confidence) : 0,
        })) : [],
        reasoning: String(analysis.reasoning ?? 'Automated AI categorization complete.'),
        modelUsed: String(analysis.modelUsed ?? 'Gemini 2.5 Flash'),
      }
    : undefined;

  return {
    id: String(item.id ?? 'unknown'),
    title: String(item.title ?? 'Untitled issue'),
    description: String(item.description ?? ''),
    categoryId,
    departmentId,
    locationId: String(item.location ?? 'loc-main'),
    locationDetails: String(item.location ?? ''),
    assetId: typeof item.assetId === 'string' ? item.assetId : undefined,
    reporterId: String(item.reporterId ?? 'unknown'),
    reporterName: reporter.name || String(item.reporterName ?? 'Campus Member'),
    reporterEmail: reporter.email || String(item.reporterEmail ?? ''),
    reporterRole: (reporter.role as UserRole) || (String(item.reporterRole ?? 'STUDENT') as UserRole),
    status: (item.status as IssueStatus) || 'REPORTED',
    moderationStatus: (item.moderationStatus as ModerationStatus) || 'NORMAL',
    priority: (item.priority as IssuePriority) || 'MEDIUM',
    possibleCause: (item.suspectedCause as string | undefined) ?? (item.possibleCause as string | undefined),
    suggestedSolution: (item.proposedSolution as string | undefined) ?? (item.suggestedSolution as string | undefined),
    occurredAt: String(item.occurredAt ?? new Date(String(item.createdAt ?? new Date().toISOString())).toLocaleString()),
    attachments: Array.isArray(item.attachments) ? item.attachments.map((a) => formatImageUrl(String(a))) : [],
    affectedUserIds: Array.isArray((item.participants as Array<Record<string, unknown>> | undefined))
      ? ((item.participants as Array<Record<string, unknown>>).map((p) => String(p.userId ?? ''))).filter(Boolean)
      : ((item.reporterId as string | undefined) ? [String(item.reporterId)] : []),
    followerUserIds: Array.isArray((item.followers as Array<Record<string, unknown>> | undefined))
      ? ((item.followers as Array<Record<string, unknown>>).map((f) => String(f.userId ?? ''))).filter(Boolean)
      : ((item.reporterId as string | undefined) ? [String(item.reporterId)] : []),
    aiAnalysis: mappedAnalysis,
    resolutionProof: mappedResolutionProof,
    createdAt: String(item.createdAt ?? new Date().toISOString()),
    updatedAt: String(item.updatedAt ?? new Date().toISOString()),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [issues, setIssues] = useState<Issue[]>(MOCK_ISSUES);
  const [comments, setComments] = useState<Record<string, IssueComment[]>>(MOCK_COMMENTS);
  const [statusHistory, setStatusHistory] = useState<Record<string, IssueStatusHistory[]>>(MOCK_STATUS_HISTORY);
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);
  const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const pendingStatusTransitions = useRef<Set<string>>(new Set());

  // Fetch real issues from backend
  const refreshIssues = useCallback(async () => {
    try {
      const res = await apiClient.listIssues({ take: 100 });
      if (res.data?.issues) {
        const mapped = ((res.data as any)?.issues ?? []).map((item: Record<string, unknown>) => mapBackendIssueToFrontend(item));
        setIssues((prev) => {
          const optimistic = prev.filter(i => i.id.startsWith('iss-'));
          return [...mapped, ...optimistic];
        });
      }
    } catch (e) {
      console.warn('Could not fetch issues from backend:', e);
    }
  }, []);

  // Fetch real assets from backend
  const refreshAssets = useCallback(async () => {
    try {
      const res = await apiClient.listAssets({ take: 100 });
      if (res.data?.assets) {
        setAssets(((res.data as any)?.assets ?? []).map((a: any) => ({
          id: a.id,
          name: a.name,
          assetTag: a.assetTag,
          category: a.category,
          departmentId: a.departmentId,
          locationId: a.locationId,
          status: (a.status as Asset['status']) || 'OPERATIONAL',
          modelNumber: a.modelNumber || undefined,
          serialNumber: a.serialNumber || undefined,
          installedAt: a.installedAt || new Date().toISOString(),
          lastServicedAt: a.lastServicedAt || new Date().toISOString(),
          reportedIssuesCount: a.reportedIssuesCount || 0,
          imageUrl: a.imageUrl || undefined,
        })));
      }
    } catch (e) {
      console.warn('Could not fetch assets from backend:', e);
    }
  }, []);

  // Fetch complete issue details with live comments and status history
  const fetchIssueDetail = useCallback(async (issueId: string): Promise<Issue | undefined> => {
    try {
      const res = await apiClient.getIssue(issueId);
      if (res.data) {
        const mapped = mapBackendIssueToFrontend((res.data as any) ?? {} as Record<string, unknown>);
        setIssues((prev) => [mapped, ...prev.filter((i) => i.id !== issueId)]);

        const detailData = res.data as any;
        if (detailData?.comments && Array.isArray(detailData.comments)) {
          setComments((prev) => ({
            ...prev,
            [issueId]: detailData.comments.map((c: { id: string; authorId: string; author?: { name?: string; role?: string }; content: string; createdAt: string }) => ({
              id: c.id,
              issueId,
              userId: c.authorId,
              authorId: c.authorId,
              userName: c.author?.name || 'Campus Member',
              authorName: c.author?.name || 'Campus Member',
              userRole: (c.author?.role as UserRole) || 'STUDENT',
              authorRole: (c.author?.role as UserRole) || 'STUDENT',
              content: c.content,
              body: c.content,
              createdAt: c.createdAt,
            })),
          }));
        }

        if (detailData?.statusHistory && Array.isArray(detailData.statusHistory)) {
          setStatusHistory((prev) => ({
            ...prev,
            [issueId]: detailData.statusHistory.map((h: { id: string; fromStatus: string; toStatus: string; changedBy?: string; createdAt: string; reason?: string }) => ({
              id: h.id,
              issueId,
              fromStatus: h.fromStatus,
              toStatus: h.toStatus,
              changedById: 'system',
              changedByName: 'Audit Log',
              changedAt: h.createdAt,
              reason: (h.reason as string) || 'Status updated',
            })),
          }));
        }

        return mapped;
      }
    } catch (e) {
      console.warn('Could not fetch issue details:', e);
    }
    return undefined;
  }, []);

  // Initialize auth session and data on load
  useEffect(() => {
    async function init() {
      try {
        // 1. Try checking real backend session
        const sessionRes = await apiClient.getSession();
        if (sessionRes.data?.user) {
          const u = sessionRes.data.user;
          const userObj: User = {
            id: u.id,
            email: u.email,
            name: u.name || u.email.split('@')[0],
            role: (u.role as UserRole) || 'STUDENT',
            departmentId: 'dept-cse',
            avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name || u.email)}`,
          };
          setCurrentUser(userObj);
        } else {
          // Fallback to saved user in storage
          const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
          if (savedUser) setCurrentUser(JSON.parse(savedUser));
        }

        // 2. Load stored data or fetch from backend
        const savedIssues = localStorage.getItem(STORAGE_KEYS.ISSUES);
        const savedComments = localStorage.getItem(STORAGE_KEYS.COMMENTS);
        const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
        const savedNotifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
        const savedAssets = localStorage.getItem(STORAGE_KEYS.ASSETS);
        const savedReports = localStorage.getItem(STORAGE_KEYS.REPORTS);

        if (savedIssues) setIssues(JSON.parse(savedIssues));
        if (savedComments) setComments(JSON.parse(savedComments));
        if (savedHistory) setStatusHistory(JSON.parse(savedHistory));
        if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
        if (savedAssets) setAssets(JSON.parse(savedAssets));
        if (savedReports) setReports(JSON.parse(savedReports));

        // 3. Refresh live issues, assets & notifications from backend API
        await Promise.allSettled([
          refreshIssues(),
          refreshAssets(),
        ]);

        try {
          const notifRes = await apiClient.getNotifications();
          if (notifRes.data?.notifications && notifRes.data.notifications.length > 0) {
            setNotifications((notifRes.data.notifications as any[]).map((n: any) => ({
              id: n.id,
              userId: n.userId,
              title: n.title,
              body: n.body || n.message || '',
              type: (n.type as AppNotification['type']) || 'STATUS_CHANGED',
              read: Boolean(n.read),
              issueId: n.issueId,
              createdAt: n.createdAt,
            })));
          }
        } catch (e: unknown) {
          console.warn('Failed to fetch notifications:', e);
        }
      } catch (e: unknown) {
        console.warn('Initial session loading fallback:', e);
      } finally {
        setIsInitialized(true);
        setIsLoadingAuth(false);
      }
    }

    init();
  }, [refreshIssues, refreshAssets]);

  // Live polling: automatically refresh issues & notifications every 6 seconds so community updates appear in real time
  useEffect(() => {
    if (!isInitialized || !currentUser) return;
    const interval = setInterval(() => {
      refreshIssues();
      apiClient.getNotifications().then((notifRes) => {
        if (notifRes.data?.notifications && notifRes.data.notifications.length > 0) {
          setNotifications(notifRes.data.notifications.map((n: any) => ({
            id: n.id,
            userId: n.userId,
            title: n.title,
            body: n.body || n.message || '',
            type: (n.type as any) || 'STATUS_CHANGED',
            read: Boolean(n.read),
            issueId: n.issueId,
            createdAt: n.createdAt,
          })));
        }
      }).catch(() => {});
    }, 6000);

    return () => clearInterval(interval);
  }, [isInitialized, currentUser, refreshIssues]);

  // Persist state changes to LocalStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
      localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify(issues));
      localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(statusHistory));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
      localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    } catch (e: unknown) {
      console.error('Error persisting to localStorage', e);
    }
  }, [currentUser, issues, comments, statusHistory, notifications, assets, reports, isInitialized]);

  const login = async (email: string, password: string = 'Password123!'): Promise<User> => {
    let loggedInUser: User;

    try {
      // Try logging in to the real backend
      const res = await apiClient.login(email, password);

      if (res.data) {
        // ✅ Backend auth succeeded — use real user
        loggedInUser = {
          id: res.data.id,
          name: res.data.name || email.split('@')[0],
          email: res.data.email,
          role: (res.data.role as UserRole) || 'STUDENT',
          departmentId: 'dept-cse',
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(res.data.name || email)}`,
        };
      } else if (res.status === 500 && res.error?.toLowerCase().includes('network')) {
        // ⚠️ Backend genuinely unreachable — fall back to mock for offline/dev mode
        const matched = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (!matched) throw new Error('Backend unreachable and no matching dev account found.');
        loggedInUser = matched;
      } else {
        // ❌ Auth error (wrong password, user not found, etc.) — throw so caller can display it
        throw new Error(res.error || 'Invalid email or password.');
      }
    } catch (err: unknown) {
      // Re-throw auth errors; only swallow genuine network exceptions with a mock fallback
      if (err instanceof Error && err.message && !err.message.toLowerCase().includes('failed to fetch') && !err.message.toLowerCase().includes('networkerror')) {
        throw err;
      }
      // Network exception (backend down) — fall back to mock for dev convenience
      const matched = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!matched) throw new Error('Cannot reach the backend and no matching dev account found.');
      loggedInUser = matched;
    }

    setCurrentUser(loggedInUser);
    refreshIssues();
    refreshAssets();
    return loggedInUser;
  };

  /**
   * Set the current user directly from an auth response (used after Google OAuth and registration
   * where the session is already established server-side — no need to call login() again).
   */
  const setUserFromAuthResponse = (userData: { id: string; email: string; name: string | null; role: string }) => {
    const user: User = {
      id: userData.id,
      name: userData.name || userData.email.split('@')[0],
      email: userData.email,
      role: (userData.role as UserRole) || 'STUDENT',
      departmentId: 'dept-cse',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name || userData.email)}`,
    };
    setCurrentUser(user);
    refreshIssues();
    refreshAssets();
    return user;
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (e: unknown) {
      console.warn('Logout error:', e);
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch (e: unknown) {
      console.warn('localStorage error:', e);
    }
  };

  const createIssue = async (input: CreateIssueInput): Promise<Issue> => {
    const newIssueId = `iss-${Date.now().toString().slice(-6)}`;
    const nowISO = new Date().toISOString();

    const category = MOCK_CATEGORIES.find((c) => c.id === input.categoryId);
    const department = MOCK_DEPARTMENTS.find((d) => d.id === input.departmentId);
    
    const aiAnalysis: AIAnalysis = {
      category: category?.name || 'General Equipment',
      suggestedDepartment: department?.name || 'Facilities',
      severity: input.priority,
      priority: input.priority,
      confidence: 0.94,
      spamScore: 0.01,
      moderationFlags: [],
      duplicateCandidates: [],
      reasoning: `AI evaluated symptoms: reported in ${department?.name}. Operational impact scored as ${input.priority}.`,
      modelUsed: 'Gemini 2.5 Flash',
    };

    const reporter = currentUser || MOCK_USERS[0];

    const localIssue: Issue = {
      id: newIssueId,
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      departmentId: input.departmentId,
      locationId: input.locationId,
      locationDetails: input.locationDetails,
      assetId: input.assetId,
      reporterId: reporter.id,
      reporterName: reporter.name,
      reporterEmail: reporter.email,
      reporterRole: reporter.role,
      status: 'REPORTED',
      moderationStatus: 'NORMAL',
      priority: input.priority,
      possibleCause: input.possibleCause,
      suggestedSolution: input.suggestedSolution,
      occurredAt: input.occurredAt || new Date().toLocaleString(),
      attachments: input.attachments || [],
      affectedUserIds: [reporter.id],
      followerUserIds: [reporter.id],
      aiAnalysis,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    // Optimistic local update
    setIssues((prev) => [localIssue, ...prev]);

    const initialHistoryItem: IssueStatusHistory = {
      id: `hist-${Date.now()}`,
      issueId: newIssueId,
      fromStatus: 'REPORTED',
      toStatus: 'REPORTED',
      changedById: reporter.id,
      changedByName: reporter.name,
      changedByRole: reporter.role,
      reason: 'Issue submitted by reporter.',
      createdAt: nowISO,
    };

    setStatusHistory((prev) => ({
      ...prev,
      [newIssueId]: [initialHistoryItem],
    }));

    // Async sync with Backend API
    try {
      const backendRes = await apiClient.createIssue({
        title: input.title,
        description: input.description,
        category: category?.name || input.categoryId,
        department: department?.name || input.departmentId,
        location: input.locationDetails || input.locationId,
        suspectedCause: input.possibleCause,
        proposedSolution: input.suggestedSolution,
        attachments: input.attachments || [],
      });

      if (backendRes.data) {
        const serverIssue = mapBackendIssueToFrontend((backendRes.data as any) ?? {} as Record<string, unknown>);
        setIssues((prev) => [serverIssue, ...prev.filter((i) => i.id !== newIssueId)]);
        setStatusHistory((prev) => {
          const updated = { ...prev };
          if (updated[newIssueId]) {
            updated[serverIssue.id] = updated[newIssueId].map(h => ({ ...h, issueId: serverIssue.id }));
            delete updated[newIssueId];
          }
          return updated;
        });
        return serverIssue;
      } else if (backendRes.error) {
        console.error('Backend issue creation error:', backendRes.error);
      }
    } catch (e: unknown) {
      console.warn('Backend issue creation sync error:', e);
    }

    return localIssue;
  };

  const toggleAffected = async (issueId: string) => {
    if (!currentUser) return;
    
    const targetIssue = issues.find((iss) => iss.id === issueId);
    const wasAffected = targetIssue ? targetIssue.affectedUserIds.includes(currentUser.id) : false;

    // Optimistic update
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id !== issueId) return iss;
        const isAffected = iss.affectedUserIds.includes(currentUser.id);
        const updatedAffected = isAffected
          ? iss.affectedUserIds.filter((id) => id !== currentUser.id)
          : [...iss.affectedUserIds, currentUser.id];

        return {
          ...iss,
          affectedUserIds: updatedAffected,
        };
      })
    );

    // Call Backend API
    try {
      if (wasAffected) {
        const res = await apiClient.markUnaffected(issueId);
        if (res.error) throw new Error(res.error);
      } else {
        const res = await apiClient.markAffected(issueId);
        if (res.error) throw new Error(res.error);
      }
    } catch (e) {
      // Rollback on error
      setIssues((prev) =>
        prev.map((iss) => {
          if (iss.id !== issueId) return iss;
          return {
            ...iss,
            affectedUserIds: wasAffected
              ? [...iss.affectedUserIds, currentUser.id]
              : iss.affectedUserIds.filter((id) => id !== currentUser.id),
          };
        })
      );
    }
  };

  const toggleFollow = async (issueId: string) => {
    if (!currentUser) return;

    const targetIssue = issues.find((iss) => iss.id === issueId);
    const wasFollowing = targetIssue ? targetIssue.followerUserIds.includes(currentUser.id) : false;

    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id !== issueId) return iss;
        const isFollowing = iss.followerUserIds.includes(currentUser.id);
        return {
          ...iss,
          followerUserIds: isFollowing
            ? iss.followerUserIds.filter((id) => id !== currentUser.id)
            : [...iss.followerUserIds, currentUser.id],
        };
      })
    );

    try {
      if (wasFollowing) {
        const res = await apiClient.unfollowIssue(issueId);
        if (res.error) throw new Error(res.error);
      } else {
        const res = await apiClient.followIssue(issueId);
        if (res.error) throw new Error(res.error);
      }
    } catch (e) {}
  };

  const updateStatus = async (
    issueId: string,
    newStatus: IssueStatus,
    reason?: string,
    proof?: { imageUrl: string; notes: string }
  ): Promise<boolean> => {
    const targetIssue = issues.find((i) => i.id === issueId);
    if (!targetIssue || !currentUser) return false;
    if (pendingStatusTransitions.current.has(issueId)) return false;
    if (targetIssue.status === newStatus) return true;

    pendingStatusTransitions.current.add(issueId);

    const previousStatus = targetIssue.status;
    const nowISO = new Date().toISOString();
    let resolutionProofObj: ResolutionProof | undefined = undefined;

    if ((newStatus === 'RESOLUTION_SUBMITTED' || newStatus === 'VERIFIED') && proof) {
      resolutionProofObj = {
        imageUrl: proof.imageUrl,
        resolvedById: currentUser.id,
        resolvedByName: currentUser.name,
        notes: proof.notes,
        resolvedAt: nowISO,
      };
    }

    const historyItem: IssueStatusHistory = {
      id: `hist-${Date.now()}`,
      issueId,
      fromStatus: targetIssue.status,
      toStatus: newStatus,
      changedById: currentUser.id,
      changedByName: currentUser.name,
      changedByRole: currentUser.role,
      reason: reason || (proof?.notes ? proof.notes : `Status changed to ${newStatus}`),
      proofImageUrl: proof?.imageUrl,
      createdAt: nowISO,
    };

    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id !== issueId) return iss;
        return {
          ...iss,
          status: newStatus,
          resolutionProof: resolutionProofObj || iss.resolutionProof,
          resolvedAt: newStatus === 'RESOLUTION_SUBMITTED' ? nowISO : iss.resolvedAt,
          verifiedAt: newStatus === 'VERIFIED' ? nowISO : iss.verifiedAt,
          updatedAt: nowISO,
        };
      })
    );

    setStatusHistory((prev) => ({
      ...prev,
      [issueId]: [historyItem, ...(prev[issueId] || [])],
    }));

    try {
      const res = await apiClient.transitionStatus(issueId, newStatus, reason);
      if (res.error) {
        console.error('Failed to transition status on server:', res.error);
        setIssues((prev) =>
          prev.map((iss) => (iss.id === issueId ? { ...iss, status: previousStatus } : iss))
        );
        setStatusHistory((prev) => ({
          ...prev,
          [issueId]: (prev[issueId] || []).filter((h) => h.id !== historyItem.id),
        }));
        return false;
      }
      return true;
    } catch (e: unknown) {
      console.error('Server error transitioning status:', e);
      setIssues((prev) =>
        prev.map((iss) => (iss.id === issueId ? { ...iss, status: previousStatus } : iss))
      );
      setStatusHistory((prev) => ({
        ...prev,
        [issueId]: (prev[issueId] || []).filter((h) => h.id !== historyItem.id),
      }));
      return false;
    } finally {
      pendingStatusTransitions.current.delete(issueId);
    }
  };

  const submitResolution = async (
    issueId: string,
    notes: string,
    imageUrl: string,
    uploadId?: string
  ): Promise<boolean> => {
    const targetIssue = issues.find((i) => i.id === issueId);
    if (!targetIssue || !currentUser) return false;

    const previousStatus = targetIssue.status;
    const nowISO = new Date().toISOString();
    const resolutionProofObj: ResolutionProof = {
      imageUrl,
      resolvedById: currentUser.id,
      resolvedByName: currentUser.name,
      notes,
      resolvedAt: nowISO,
    };

    const historyItem: IssueStatusHistory = {
      id: `hist-${Date.now()}`,
      issueId,
      fromStatus: targetIssue.status,
      toStatus: 'RESOLUTION_SUBMITTED',
      changedById: currentUser.id,
      changedByName: currentUser.name,
      changedByRole: currentUser.role,
      reason: notes,
      proofImageUrl: imageUrl,
      createdAt: nowISO,
    };

    // Optimistic update
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id !== issueId) return iss;
        return {
          ...iss,
          status: 'RESOLUTION_SUBMITTED',
          resolutionProof: resolutionProofObj,
          resolvedAt: nowISO,
          updatedAt: nowISO,
        };
      })
    );

    setStatusHistory((prev) => ({
      ...prev,
      [issueId]: [historyItem, ...(prev[issueId] || [])],
    }));

    try {
      if (uploadId) {
        const res = await apiClient.submitResolution(issueId, notes, [uploadId]);
        if (res.data) {
          return true;
        }
        console.warn('Backend submitResolution via uploadId error, trying fallback:', res.error);
      }

      const res = await apiClient.transitionStatus(issueId, 'RESOLUTION_SUBMITTED', notes);
      if (res.data) {
        return true;
      }

      console.error('Failed to submit resolution on server:', res.error);
      setIssues((prev) =>
        prev.map((iss) => (iss.id === issueId ? { ...iss, status: previousStatus } : iss))
      );
      setStatusHistory((prev) => ({
        ...prev,
        [issueId]: (prev[issueId] || []).filter((h) => h.id !== historyItem.id),
      }));
      return false;
    } catch (e: unknown) {
      console.error('Submit resolution error:', e);
      setIssues((prev) =>
        prev.map((iss) => (iss.id === issueId ? { ...iss, status: previousStatus } : iss))
      );
      setStatusHistory((prev) => ({
        ...prev,
        [issueId]: (prev[issueId] || []).filter((h) => h.id !== historyItem.id),
      }));
      return false;
    }
  };

  const verifyResolution = async (issueId: string): Promise<boolean> => {
    return updateStatus(
      issueId,
      'VERIFIED',
      `Resolution accepted and verified by ${currentUser?.name || 'reporter'}.`
    );
  };

  const disputeResolution = async (issueId: string, reason: string, evidenceUrls?: string[]): Promise<boolean> => {
    const targetIssue = issues.find((i) => i.id === issueId);
    if (!targetIssue || !currentUser) return false;

    const previousStatus = targetIssue.status;
    const nowISO = new Date().toISOString();
    const reopenEntry = {
      reason,
      reopenedById: currentUser.id,
      reopenedByName: currentUser.name,
      evidenceUrls: evidenceUrls || [],
      reopenedAt: nowISO,
    };

    const historyItem: IssueStatusHistory = {
      id: `hist-${Date.now()}`,
      issueId,
      fromStatus: targetIssue.status,
      toStatus: 'REOPENED',
      changedById: currentUser.id,
      changedByName: currentUser.name,
      changedByRole: currentUser.role,
      reason: `Resolution Disputed by ${currentUser.name}: ${reason}`,
      proofImageUrl: evidenceUrls?.[0],
      createdAt: nowISO,
    };

    setIssues((prev) =>
      prev.map((iss) =>
        iss.id === issueId
          ? {
              ...iss,
              status: 'REOPENED',
              reopenHistory: [reopenEntry, ...(iss.reopenHistory || [])],
              updatedAt: nowISO,
            }
          : iss
      )
    );

    setStatusHistory((prev) => ({
      ...prev,
      [issueId]: [historyItem, ...(prev[issueId] || [])],
    }));

    try {
      const res = await apiClient.disputeResolution(issueId, reason, evidenceUrls);
      if (res.error) {
        console.error('Failed to dispute resolution on server:', res.error);
        setIssues((prev) =>
          prev.map((iss) => (iss.id === issueId ? { ...iss, status: previousStatus } : iss))
        );
        setStatusHistory((prev) => ({
          ...prev,
          [issueId]: (prev[issueId] || []).filter((h) => h.id !== historyItem.id),
        }));
        return false;
      }
      return true;
    } catch (e) {
      console.error('Server error disputing resolution:', e);
      setIssues((prev) =>
        prev.map((iss) => (iss.id === issueId ? { ...iss, status: previousStatus } : iss))
      );
      setStatusHistory((prev) => ({
        ...prev,
        [issueId]: (prev[issueId] || []).filter((h) => h.id !== historyItem.id),
      }));
      return false;
    }
  };

  const reopenIssue = async (issueId: string, reason: string, evidenceUrls?: string[]): Promise<boolean> => {
    const targetIssue = issues.find((i) => i.id === issueId);
    if (!targetIssue || !currentUser) return false;

    if (targetIssue.status === 'RESOLUTION_SUBMITTED' || targetIssue.status === 'VERIFIED') {
      return disputeResolution(issueId, reason, evidenceUrls);
    }

    return updateStatus(issueId, 'REOPENED', reason);
  };

  const assignIssue = (issueId: string, assigneeId: string, assigneeName: string) => {
    const nowISO = new Date().toISOString();
    setIssues((prev) =>
      prev.map((iss) => (iss.id === issueId ? { ...iss, assigneeId, assigneeName, updatedAt: nowISO } : iss))
    );
  };

  const addComment = async (issueId: string, body: string, attachments?: string[]) => {
    if (!currentUser) return;
    const newComment: IssueComment = {
      id: `cmt-${Date.now()}`,
      issueId,
      authorId: currentUser.id,
      userId: currentUser.id,
      authorName: currentUser.name,
      userName: currentUser.name,
      authorRole: currentUser.role,
      userRole: currentUser.role,
      body,
      content: body,
      attachments: attachments || [],
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => ({
      ...prev,
      [issueId]: [...(prev[issueId] || []), newComment],
    }));

    try {
      const res = await apiClient.addComment(issueId, body);
      if (res.error) throw new Error(res.error);
    } catch (e) {
      console.warn('Failed to post comment to server:', e);
      setComments((prev) => ({
        ...prev,
        [issueId]: (prev[issueId] || []).filter((c) => c.id !== newComment.id),
      }));
    }
  };

  const reportIssueContent = async (issueId: string, reason: IssueReport['reason'], details?: string) => {
    if (!currentUser) return;
    const report: IssueReport = {
      id: `rep-${Date.now()}`,
      issueId,
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      reason,
      details,
      createdAt: new Date().toISOString(),
    };

    const targetIssue = issues.find(i => i.id === issueId);
    const previousModerationStatus = targetIssue ? targetIssue.moderationStatus : 'NORMAL';
    
    setReports((prev) => [report, ...prev]);
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, moderationStatus: 'FLAGGED' } : i))
    );

    try {
      await apiClient.reportContent(issueId, reason, details);
    } catch (e) {}
  };

  const moderateIssue = async (issueId: string, moderationStatus: ModerationStatus, reason?: string) => {
    const targetIssue = issues.find(i => i.id === issueId);
    const previousModerationStatus = targetIssue ? targetIssue.moderationStatus : 'NORMAL';

    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, moderationStatus } : i))
    );

    try {
      await apiClient.moderateIssue(issueId, moderationStatus, reason);
    } catch (e) {}
  };

  const markNotificationRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await apiClient.markNotificationRead(id);
    } catch (e) {
      console.warn('Mark notification read failed:', e);
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiClient.markAllNotificationsRead();
    } catch (e) {
      console.warn('Mark all notifications read failed:', e);
    }
  };

  const addAsset = async (asset: Asset) => {
    setAssets((prev) => [asset, ...prev.filter((a) => a.id !== asset.id && a.assetTag !== asset.assetTag)]);
    try {
      const res = await apiClient.createAsset({
        name: asset.name,
        assetTag: asset.assetTag,
        category: asset.category,
        departmentId: asset.departmentId,
        locationId: asset.locationId,
        status: asset.status,
        modelNumber: asset.modelNumber,
        serialNumber: asset.serialNumber,
        imageUrl: asset.imageUrl,
      });
      if (res.data) {
        setAssets((prev) => {
          if (!res.data) return prev;
          const nextAsset = res.data as any as Asset;
          return [nextAsset, ...prev.filter((a) => a.id !== asset.id && a.id !== nextAsset.id)];
        });
      }
    } catch (e: unknown) {
      console.warn('Backend createAsset error:', e);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    }
  };

  const deleteAsset = async (assetId: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
    try {
      await apiClient.deleteAsset(assetId);
    } catch (e: unknown) {
      console.warn('Backend deleteAsset error:', e);
    }
  };

  const getAssetById = (id?: string) => assets.find((a) => a.id === id);
  const getDepartmentById = (id?: string) => {
    if (!id) return undefined;
    const lower = id.toLowerCase().trim();
    return (
      MOCK_DEPARTMENTS.find(
        (d) => d.id.toLowerCase() === lower || d.name.toLowerCase() === lower || d.code.toLowerCase() === lower
      ) || { id, name: id, code: 'CET' }
    );
  };
  const getLocationById = (id?: string) => {
    if (!id) return undefined;
    const lower = id.toLowerCase().trim();
    return MOCK_LOCATIONS.find(
      (l) => l.id.toLowerCase() === lower || l.room.toLowerCase() === lower || l.building.toLowerCase() === lower
    );
  };
  const getCategoryById = (id?: string) => {
    if (!id) return undefined;
    const lower = id.toLowerCase().trim();
    return (
      MOCK_CATEGORIES.find((c) => c.id.toLowerCase() === lower || c.name.toLowerCase() === lower) ||
      { id, name: id, description: '', iconName: 'Tag', active: true }
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users: MOCK_USERS,
        isLoadingAuth,
        login,
        setUserFromAuthResponse,
        logout,
        refreshIssues,
        refreshAssets,
        fetchIssueDetail,
        issues,
        departments: MOCK_DEPARTMENTS,
        locations: MOCK_LOCATIONS,
        categories: MOCK_CATEGORIES,
        assets,
        addAsset,
        deleteAsset,
        comments,
        statusHistory,
        notifications,
        reports,
        createIssue,
        toggleAffected,
        toggleFollow,
        updateStatus,
        submitResolution,
        verifyResolution,
        disputeResolution,
        reopenIssue,
        assignIssue,
        addComment,
        reportIssueContent,
        moderateIssue,
        markNotificationRead,
        markAllNotificationsRead,
        getAssetById,
        getDepartmentById,
        getLocationById,
        getCategoryById,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
