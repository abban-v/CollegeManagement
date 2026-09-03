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
  ReopenDetails,
} from './types';
import {
  MOCK_USERS,
  MOCK_DEPARTMENTS,
  MOCK_LOCATIONS,
  MOCK_CATEGORIES,
} from './mock-data';
import { apiClient, formatImageUrl, Issue as ApiIssue, Asset as ApiAsset } from './api';

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
  deleteIssuePermanent: (issueId: string) => Promise<void>;
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
  CURRENT_USER: 'slashforge_current_user_v7',
};

// Legacy keys to purge on startup so corrupt phantom offline state is removed
const LEGACY_STORAGE_KEYS = [
  'slashforge_current_user_v6',
  'slashforge_issues_v6',
  'slashforge_comments_v6',
  'slashforge_history_v6',
  'slashforge_notifications_v6',
  'slashforge_assets_v6',
  'slashforge_reports_v6',
  'slashforge_issues_v5',
  'slashforge_issues_v4',
];

function findCategoryIdentifier(nameOrId?: string): string {
  if (!nameOrId) return 'cat-general';
  const lower = nameOrId.toLowerCase().trim();
  const exact = MOCK_CATEGORIES.find((c) => c.id.toLowerCase() === lower || c.name.toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = MOCK_CATEGORIES.find((c) => lower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(lower));
  return partial ? partial.id : nameOrId;
}

function findDepartmentIdentifier(nameOrId?: string): string {
  if (!nameOrId) return 'dept-facilities';
  const lower = nameOrId.toLowerCase().trim();
  const exact = MOCK_DEPARTMENTS.find(
    (d) => d.id.toLowerCase() === lower || d.name.toLowerCase() === lower || d.code.toLowerCase() === lower
  );
  if (exact) return exact.id;
  const partial = MOCK_DEPARTMENTS.find(
    (d) => lower.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(lower)
  );
  return partial ? partial.id : nameOrId;
}

// Helper to adapt backend issue object to frontend Issue type
export function mapBackendIssueToFrontend(item: ApiIssue | Record<string, unknown>): Issue {
  const categoryId = findCategoryIdentifier((item.category as string) || (item.categoryId as string));
  const departmentId = findDepartmentIdentifier((item.department as string) || (item.departmentId as string));

  const rawSeverity = (item.analysis as { severity?: string } | undefined)?.severity || (item.priority as string) || 'MEDIUM';
  const severity: IssuePriority = (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(rawSeverity.toUpperCase())
    ? rawSeverity.toUpperCase()
    : 'MEDIUM') as IssuePriority;

  const rawPriority = (item.analysis as { aiPriority?: string } | undefined)?.aiPriority || (item.priority as string) || 'MEDIUM';
  const priority: IssuePriority = (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(rawPriority.toUpperCase())
    ? rawPriority.toUpperCase()
    : 'MEDIUM') as IssuePriority;

  const resolutionArr = (item.resolutions as Array<Record<string, unknown>>) || [];
  const firstResolution = resolutionArr[0];

  let resolutionProof: ResolutionProof | undefined = undefined;
  if (firstResolution) {
    const evidenceArr = (firstResolution.evidenceImages as Array<Record<string, unknown>>) || [];
    const firstImg = (evidenceArr[0]?.storageKey as string) || '';
    const resolvedByObj = firstResolution.resolvedBy as Record<string, unknown> | undefined;

    resolutionProof = {
      imageUrl: formatImageUrl(firstImg),
      resolvedById: (firstResolution.resolvedById as string) || 'system',
      resolvedByName: (resolvedByObj?.name as string) || 'Facilities Official',
      notes: (firstResolution.description as string) || 'Resolution completed',
      resolvedAt: (firstResolution.createdAt as string) || new Date().toISOString(),
    };
  } else if (item.resolutionProof) {
    const rawProof = item.resolutionProof as Record<string, unknown>;
    resolutionProof = {
      imageUrl: formatImageUrl((rawProof.imageUrl as string) || ''),
      resolvedById: (rawProof.resolvedById as string) || undefined,
      resolvedByName: (rawProof.resolvedByName as string) || 'Facilities Official',
      notes: (rawProof.notes as string) || (rawProof.description as string) || 'Resolution completed',
      resolvedAt: (rawProof.resolvedAt as string) || new Date().toISOString(),
    };
  }

  const rawRecord = item as Record<string, unknown>;
  const disputesArr = (rawRecord.disputes as Array<Record<string, unknown>>) || [];
  const reopenHistory: ReopenDetails[] | undefined = disputesArr.length > 0
    ? disputesArr.map((d) => {
        const userObj = d.user as Record<string, unknown> | undefined;
        return {
          reason: (d.reason as string) || '',
          reopenedById: (d.userId as string) || (userObj?.id as string) || '',
          reopenedByName: (userObj?.name as string) || 'Campus Member',
          evidenceUrls: Array.isArray(d.evidenceUrls) ? (d.evidenceUrls as string[]) : [],
          reopenedAt: (d.createdAt as string) || new Date().toISOString(),
        };
      })
    : (rawRecord.reopenHistory as ReopenDetails[] | undefined);

  const reporterObj = item.reporter as { id?: string; name?: string; email?: string; role?: string } | undefined;
  const reporterRole = ((reporterObj?.role as string) || (item.reporterRole as string) || 'STUDENT').toUpperCase() as UserRole;

  const participants = (item.participants as Array<{ userId: string }>) || [];
  const followers = (item.followers as Array<{ userId: string }>) || [];
  const affectedUserIds = participants.length > 0
    ? participants.map((p) => p.userId)
    : (item.affectedUserIds as string[]) || ((item.reporterId as string) ? [item.reporterId as string] : []);
  const followerUserIds = followers.length > 0
    ? followers.map((f) => f.userId)
    : (item.followerUserIds as string[]) || ((item.reporterId as string) ? [item.reporterId as string] : []);

  let aiAnalysis: AIAnalysis | undefined = undefined;
  if (item.analysis) {
    const analysisObj = item.analysis as Record<string, unknown>;
    aiAnalysis = {
      category: (analysisObj.category as string) || 'General',
      suggestedDepartment: (analysisObj.suggestedDepartment as string) || 'Facilities',
      severity,
      priority,
      confidence: typeof analysisObj.confidence === 'number' ? analysisObj.confidence : 0.94,
      spamScore: typeof analysisObj.spamScore === 'number' ? analysisObj.spamScore : 0.01,
      moderationFlags: Array.isArray(analysisObj.moderationFlags) ? (analysisObj.moderationFlags as string[]) : [],
      duplicateCandidates: Array.isArray(analysisObj.duplicateCandidates) ? (analysisObj.duplicateCandidates as string[]) : [],
      reasoning: (analysisObj.reasoning as string) || 'Automated AI analysis complete.',
      modelUsed: (analysisObj.modelUsed as string) || 'Gemini 2.5 Flash',
    };
  }

  return {
    id: String(item.id ?? 'unknown'),
    title: String(item.title ?? 'Untitled issue'),
    description: String(item.description ?? ''),
    categoryId,
    departmentId,
    locationId: (item.location as string) || (item.locationId as string) || 'loc-main',
    locationDetails: (item.location as string) || (item.locationDetails as string) || '',
    assetId: (item.assetId as string) || undefined,
    reporterId: (item.reporterId as string) || (reporterObj?.id) || 'unknown',
    reporterName: reporterObj?.name || (item.reporterName as string) || 'Campus Member',
    reporterEmail: reporterObj?.email || (item.reporterEmail as string) || '',
    reporterRole,
    status: (item.status as IssueStatus) || 'REPORTED',
    moderationStatus: (item.moderationStatus as ModerationStatus) || 'NORMAL',
    priority: (item.priority as IssuePriority) || 'MEDIUM',
    possibleCause: (item.suspectedCause as string) || (item.possibleCause as string) || undefined,
    suggestedSolution: (item.proposedSolution as string) || (item.suggestedSolution as string) || undefined,
    occurredAt: (item.occurredAt as string) || new Date((item.createdAt as string) || Date.now()).toLocaleString(),
    attachments: Array.isArray(item.attachments) ? item.attachments.map((a: string) => formatImageUrl(a)) : [],
    affectedUserIds,
    followerUserIds,
    aiAnalysis,
    resolutionProof,
    reopenHistory,
    createdAt: (item.createdAt as string) || new Date().toISOString(),
    updatedAt: (item.updatedAt as string) || new Date().toISOString(),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('slashforge_auth_token');
        const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (token && saved) return false;
      } catch {}
    }
    return true;
  });

  const [issues, setIssues] = useState<Issue[]>([]);
  const [comments, setComments] = useState<Record<string, IssueComment[]>>({});
  const [statusHistory, setStatusHistory] = useState<Record<string, IssueStatusHistory[]>>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const pendingStatusTransitions = useRef<Set<string>>(new Set());

  // Fetch real issues from PostgreSQL database via API
  const refreshIssues = useCallback(async () => {
    try {
      const res = await apiClient.listIssues({ take: 100 });
      if (res.data?.issues) {
        const mapped = res.data.issues.map(mapBackendIssueToFrontend);
        setIssues(mapped);
      }
    } catch (e) {
      console.warn('Could not fetch issues from backend:', e);
    }
  }, []);

  // Fetch real assets from PostgreSQL database via API
  const refreshAssets = useCallback(async () => {
    try {
      const res = await apiClient.listAssets({ take: 100 });
      if (res.data?.assets) {
        setAssets(res.data.assets.map((a: ApiAsset) => ({
          id: a.id,
          name: a.name,
          assetTag: a.assetTag,
          category: a.category,
          departmentId: a.departmentId,
          locationId: a.locationId,
          status: (a.status as Asset['status']) || 'OPERATIONAL',
          modelNumber: a.modelNumber || undefined,
          serialNumber: a.serialNumber || undefined,
          installedAt: a.installedAt || new Date().toISOString().split('T')[0],
          lastServicedAt: a.lastServicedAt || new Date().toISOString().split('T')[0],
          reportedIssuesCount: a.reportedIssuesCount || 0,
          imageUrl: a.imageUrl || undefined,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
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
            [issueId]: res.data!.comments!.map((c) => ({
              id: c.id,
              issueId,
              userId: c.authorId,
              authorId: c.authorId,
              userName: c.author?.name || 'Campus Member',
              authorName: c.author?.name || 'Campus Member',
              userRole: ((c.author?.role as string) || 'STUDENT').toUpperCase() as UserRole,
              authorRole: ((c.author?.role as string) || 'STUDENT').toUpperCase() as UserRole,
              content: c.content,
              body: c.content,
              createdAt: c.createdAt,
            })),
          }));
        }

        if (detailData?.statusHistory && Array.isArray(detailData.statusHistory)) {
          setStatusHistory((prev) => ({
            ...prev,
            [issueId]: res.data!.statusHistory!.map((h: Record<string, unknown>) => ({
              id: h.id as string,
              issueId,
              fromStatus: h.fromStatus as IssueStatus,
              toStatus: h.toStatus as IssueStatus,
              changedById: (h.changedById as string) || (h.changedBy as string) || 'system',
              changedByName: (h.changedByName as string) || 'Audit Log',
              changedByRole: (((h.changedByRole as string) || 'OFFICIAL').toUpperCase()) as UserRole,
              reason: (h.reason as string) || 'Status updated',
              createdAt: (h.createdAt as string) || new Date().toISOString(),
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

  // Initialize auth session and live database data in parallel
  useEffect(() => {
    async function init() {
      try {
        // Purge corrupt legacy localStorage keys from prior versions
        if (typeof window !== 'undefined') {
          LEGACY_STORAGE_KEYS.forEach((k) => {
            try { localStorage.removeItem(k); } catch {}
          });
        }

        // Fire all initial requests concurrently in parallel
        const [sessionRes] = await Promise.allSettled([
          apiClient.getSession(),
          refreshIssues(),
          refreshAssets(),
          apiClient.getNotifications().then((notifRes) => {
            if (notifRes.data?.notifications && Array.isArray(notifRes.data.notifications)) {
              setNotifications(notifRes.data.notifications.map((n: Record<string, unknown>) => ({
                id: n.id as string,
                userId: (n.userId as string) || '',
                title: (n.title as string) || 'Notification',
                body: (n.body as string) || (n.message as string) || '',
                type: (n.type as AppNotification['type']) || 'STATUS_CHANGED',
                read: Boolean(n.read || n.readAt),
                issueId: (n.issueId as string) || undefined,
                createdAt: (n.createdAt as string) || new Date().toISOString(),
              })));
            }
          }).catch(() => {}),
        ]);

        if (sessionRes.status === 'fulfilled' && sessionRes.value.data?.user) {
          const u = sessionRes.value.data.user;
          const userObj: User = {
            id: u.id,
            email: u.email,
            name: u.name || u.email.split('@')[0],
            role: (u.role as UserRole) || 'STUDENT',
            departmentId: 'dept-cse',
            avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name || u.email)}`,
          };
          setCurrentUser(userObj);
          try {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userObj));
          } catch {}
        } else if (sessionRes.status === 'fulfilled' && sessionRes.value.status === 401) {
          // Explicitly expired or revoked session
          setCurrentUser(null);
          try {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            localStorage.removeItem('slashforge_auth_token');
          } catch {}
        }
      } catch (e) {
        console.warn('Initial session loading fallback:', e);
      } finally {
        setIsInitialized(true);
        setIsLoadingAuth(false);
      }
    }

    init();
  }, [refreshIssues, refreshAssets]);

  // Live polling: automatically refresh issues & notifications every 10 seconds for real-time community updates
  useEffect(() => {
    if (!isInitialized || !currentUser) return;
    const interval = setInterval(() => {
      refreshIssues();
      apiClient.getNotifications().then((notifRes) => {
        if (notifRes.data?.notifications && Array.isArray(notifRes.data.notifications)) {
          setNotifications(notifRes.data.notifications.map((n: Record<string, unknown>) => ({
            id: n.id as string,
            userId: (n.userId as string) || '',
            title: (n.title as string) || 'Notification',
            body: (n.body as string) || (n.message as string) || '',
            type: (n.type as AppNotification['type']) || 'STATUS_CHANGED',
            read: Boolean(n.read || n.readAt),
            issueId: (n.issueId as string) || undefined,
            createdAt: (n.createdAt as string) || new Date().toISOString(),
          })));
        }
      }).catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, [isInitialized, currentUser, refreshIssues]);

  const login = async (email: string, password: string = 'Password123!'): Promise<User> => {
    const res = await apiClient.login(email, password);

    if (res.data) {
      const loggedInUser: User = {
        id: res.data.id,
        name: res.data.name || email.split('@')[0],
        email: res.data.email,
        role: (res.data.role as UserRole) || 'STUDENT',
        departmentId: 'dept-cse',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(res.data.name || email)}`,
      };
      setCurrentUser(loggedInUser);
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(loggedInUser));
      } catch {}
      refreshIssues();
      refreshAssets();
      return loggedInUser;
    } else {
      throw new Error(res.error || 'Invalid email or password.');
    }
  };

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
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } catch {}
    refreshIssues();
    refreshAssets();
    return user;
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch {}
  };

  const createIssue = async (input: CreateIssueInput): Promise<Issue> => {
    if (!currentUser) {
      throw new Error('You must be signed in to report a problem.');
    }

    const category = MOCK_CATEGORIES.find((c) => c.id === input.categoryId);
    const department = MOCK_DEPARTMENTS.find((d) => d.id === input.departmentId);

    const backendRes = await apiClient.createIssue({
      title: input.title,
      description: input.description,
      category: category?.name || input.categoryId,
      department: department?.name || input.departmentId,
      location: input.locationDetails || input.locationId,
      suspectedCause: input.possibleCause,
      proposedSolution: input.suggestedSolution,
      attachments: input.attachments || [],
      assetId: input.assetId,
    });

    if (backendRes.data) {
      const serverIssue = mapBackendIssueToFrontend(backendRes.data);
      setIssues((prev) => [serverIssue, ...prev.filter((i) => i.id !== serverIssue.id)]);
      return serverIssue;
    }

    const errorMessage = backendRes.error || 'Failed to submit issue to server.';
    throw new Error(errorMessage);
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
    } catch (e) {
      // Rollback
      setIssues((prev) =>
        prev.map((iss) => {
          if (iss.id !== issueId) return iss;
          return {
            ...iss,
            followerUserIds: wasFollowing
              ? [...iss.followerUserIds, currentUser.id]
              : iss.followerUserIds.filter((id) => id !== currentUser.id),
          };
        })
      );
    }
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
        alert(res.error);
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
      alert(res.error || 'Failed to submit resolution on server.');
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
        alert(res.error);
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

    setReports((prev) => [report, ...prev]);
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, moderationStatus: 'FLAGGED' } : i))
    );

    try {
      await apiClient.reportContent(issueId, reason, details);
    } catch (e) {}
  };

  const moderateIssue = async (issueId: string, moderationStatus: ModerationStatus, reason?: string) => {
    try {
      const res = await apiClient.moderateIssue(issueId, moderationStatus, reason);
      if (res.data?.issue) {
        const mapped = mapBackendIssueToFrontend(res.data.issue as Record<string, unknown>);
        setIssues((prev) => [mapped, ...prev.filter((i) => i.id !== issueId)]);
      } else {
        setIssues((prev) =>
          prev.map((i) => (i.id === issueId ? { ...i, moderationStatus } : i))
        );
      }
      await refreshIssues();
    } catch (e) {
      console.warn('Failed to moderate issue:', e);
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, moderationStatus } : i))
      );
    }
  };

  const deleteIssuePermanent = async (issueId: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== issueId));
    try {
      await apiClient.deleteModeratedIssue(issueId);
      await refreshIssues();
    } catch (e) {
      console.warn('Permanent delete error:', e);
    }
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
        const created: Asset = {
          id: res.data.id,
          name: res.data.name,
          assetTag: res.data.assetTag,
          category: res.data.category,
          departmentId: res.data.departmentId,
          locationId: res.data.locationId,
          status: (res.data.status as Asset['status']) || 'OPERATIONAL',
          modelNumber: res.data.modelNumber || undefined,
          serialNumber: res.data.serialNumber || undefined,
          installedAt: res.data.installedAt || new Date().toISOString().split('T')[0],
          lastServicedAt: res.data.lastServicedAt || new Date().toISOString().split('T')[0],
          reportedIssuesCount: res.data.reportedIssuesCount || 0,
          imageUrl: res.data.imageUrl || undefined,
          createdAt: res.data.createdAt,
          updatedAt: res.data.updatedAt,
        };
        setAssets((prev) => [created, ...prev.filter((a) => a.id !== asset.id && a.id !== created.id)]);
      } else {
        alert(res.error || 'Failed to register asset.');
      }
    } catch (e: unknown) {
      console.warn('Backend createAsset error:', e);
      alert('Error connecting to server to register asset.');
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
        (d) =>
          d.id.toLowerCase() === lower ||
          d.name.toLowerCase() === lower ||
          d.code.toLowerCase() === lower ||
          lower.includes(d.name.toLowerCase()) ||
          d.name.toLowerCase().includes(lower)
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
      MOCK_CATEGORIES.find(
        (c) =>
          c.id.toLowerCase() === lower ||
          c.name.toLowerCase() === lower ||
          lower.includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(lower)
      ) || { id, name: id, description: '', iconName: 'Tag', active: true }
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
        deleteIssuePermanent,
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
