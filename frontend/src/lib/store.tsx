'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { apiClient } from './api';

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
  loginWithGoogle: (email?: string) => Promise<User>;
  setUserFromAuthResponse: (userData: { id: string; email: string; name: string | null; role: string }) => User;
  logout: () => Promise<void>;
  refreshIssues: () => Promise<void>;
  
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
  updateStatus: (issueId: string, newStatus: IssueStatus, reason?: string, proof?: { imageUrl: string; notes: string }) => boolean;
  submitResolution: (issueId: string, notes: string, imageUrl: string, uploadId?: string) => Promise<boolean>;
  verifyResolution: (issueId: string) => boolean;
  disputeResolution: (issueId: string, reason: string, evidenceUrls?: string[]) => Promise<boolean>;
  reopenIssue: (issueId: string, reason: string, evidenceUrls?: string[]) => Promise<boolean>;
  assignIssue: (issueId: string, assigneeId: string, assigneeName: string) => void;
  addComment: (issueId: string, body: string, attachments?: string[]) => Promise<void>;
  reportIssueContent: (issueId: string, reason: IssueReport['reason'], details?: string) => Promise<void>;
  moderateIssue: (issueId: string, moderationStatus: ModerationStatus, reason?: string) => Promise<void>;
  addAsset: (asset: Asset) => void;
  deleteAsset: (assetId: string) => void;
  
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  
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

// Helper to adapt backend issue object to frontend Issue type
function mapBackendIssueToFrontend(item: any): Issue {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    categoryId: item.category || 'cat-general',
    departmentId: item.department || 'dept-facilities',
    locationId: item.location || 'loc-main',
    locationDetails: item.location || '',
    reporterId: item.reporterId || 'unknown',
    reporterName: item.reporter?.name || item.reporterName || 'Campus Member',
    reporterEmail: item.reporter?.email || item.reporterEmail || '',
    reporterRole: item.reporter?.role || item.reporterRole || 'STUDENT',
    status: (item.status as IssueStatus) || 'REPORTED',
    moderationStatus: (item.moderationStatus as ModerationStatus) || 'NORMAL',
    priority: (item.priority as IssuePriority) || 'MEDIUM',
    possibleCause: item.suspectedCause || item.possibleCause,
    suggestedSolution: item.proposedSolution || item.suggestedSolution,
    occurredAt: item.occurredAt || new Date(item.createdAt).toLocaleString(),
    attachments: item.attachments || [],
    affectedUserIds: item.participants?.map((p: any) => p.userId) || [item.reporterId || 'user-1'],
    followerUserIds: item.followers?.map((f: any) => f.userId) || [item.reporterId || 'user-1'],
    aiAnalysis: item.analysis ? {
      category: item.analysis.category,
      suggestedDepartment: item.analysis.suggestedDepartment || 'Facilities',
      severity: item.analysis.severity,
      priority: item.analysis.aiPriority,
      confidence: item.analysis.confidence || 0.94,
      spamScore: item.analysis.spamScore || 0.01,
      moderationFlags: item.analysis.moderationFlags || [],
      duplicateCandidates: item.analysis.duplicateCandidates || [],
      reasoning: item.analysis.reasoning || 'Automated AI categorization complete.',
      modelUsed: item.analysis.modelUsed || 'Gemini 2.5 Flash',
    } : undefined,
    resolutionProof: item.resolutions?.[0] ? {
      imageUrl: item.resolutions[0].evidenceImages?.[0]?.storageKey || '',
      resolvedById: item.resolutions[0].resolvedById,
      resolvedByName: item.resolutions[0].resolvedBy?.name || 'Facilities Official',
      notes: item.resolutions[0].description,
      resolvedAt: item.resolutions[0].createdAt,
    } : undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
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

  // Fetch real issues from backend
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
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
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

        // 3. Refresh live issues & notifications from backend API
        await refreshIssues();
        try {
          const notifRes = await apiClient.getNotifications();
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
        } catch {}
      } catch (e) {
        console.warn('Initial session loading fallback:', e);
      } finally {
        setIsInitialized(true);
        setIsLoadingAuth(false);
      }
    }

    init();
  }, [refreshIssues]);

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
    } catch (e) {
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
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
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
    } catch (err: any) {
      // Re-throw auth errors; only swallow genuine network exceptions with a mock fallback
      if (err.message && !err.message.toLowerCase().includes('failed to fetch') && !err.message.toLowerCase().includes('networkerror')) {
        throw err;
      }
      // Network exception (backend down) — fall back to mock for dev convenience
      const matched = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!matched) throw new Error('Cannot reach the backend and no matching dev account found.');
      loggedInUser = matched;
    }

    setCurrentUser(loggedInUser);
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
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };
    setCurrentUser(user);
    return user;
  };

  const loginWithGoogle = async (email?: string): Promise<User> => {
    const userEmail = email || 'alex.rivera@campus.edu';
    return login(userEmail, 'Password123!');
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (e) {}
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch (e) {}
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
        category: category?.name,
        department: department?.name,
        location: input.locationDetails || input.locationId,
        suspectedCause: input.possibleCause,
        proposedSolution: input.suggestedSolution,
      });

      if (backendRes.data) {
        const serverIssue = mapBackendIssueToFrontend(backendRes.data);
        setIssues((prev) => prev.map((i) => (i.id === newIssueId ? serverIssue : i)));
        return serverIssue;
      }
    } catch (e) {
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

    // Call Backend API (DELETE if previously affected, POST if previously not affected)
    try {
      if (wasAffected) {
        await apiClient.markUnaffected(issueId);
      } else {
        await apiClient.markAffected(issueId);
      }
    } catch (e) {}
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
        await apiClient.unfollowIssue(issueId);
      } else {
        await apiClient.followIssue(issueId);
      }
    } catch (e) {}
  };

  const updateStatus = (
    issueId: string,
    newStatus: IssueStatus,
    reason?: string,
    proof?: { imageUrl: string; notes: string }
  ): boolean => {
    const targetIssue = issues.find((i) => i.id === issueId);
    if (!targetIssue || !currentUser) return false;

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

    setStatusHistory((prev) => ({
      ...prev,
      [issueId]: [historyItem, ...(prev[issueId] || [])],
    }));

    try {
      apiClient.transitionStatus(issueId, newStatus, reason);
    } catch (e) {}

    return true;
  };

  const submitResolution = async (
    issueId: string,
    notes: string,
    imageUrl: string,
    uploadId?: string
  ): Promise<boolean> => {
    updateStatus(issueId, 'RESOLUTION_SUBMITTED', notes, {
      imageUrl,
      notes,
    });

    try {
      if (uploadId) {
        await apiClient.submitResolution(issueId, notes, [uploadId]);
      }
    } catch (e) {}

    return true;
  };

  const verifyResolution = (issueId: string): boolean => {
    const targetIssue = issues.find((i) => i.id === issueId);
    if (!targetIssue || !currentUser) return false;

    const nowISO = new Date().toISOString();

    setIssues((prev) =>
      prev.map((iss) =>
        iss.id === issueId
          ? { ...iss, status: 'VERIFIED', verifiedAt: nowISO, updatedAt: nowISO }
          : iss
      )
    );

    const historyItem: IssueStatusHistory = {
      id: `hist-${Date.now()}`,
      issueId,
      fromStatus: targetIssue.status,
      toStatus: 'VERIFIED',
      changedById: currentUser.id,
      changedByName: currentUser.name,
      changedByRole: currentUser.role,
      reason: `Resolution accepted and verified by ${currentUser.name}.`,
      createdAt: nowISO,
    };

    setStatusHistory((prev) => ({
      ...prev,
      [issueId]: [historyItem, ...(prev[issueId] || [])],
    }));

    try {
      apiClient.transitionStatus(issueId, 'VERIFIED', `Resolution accepted and verified by ${currentUser.name}.`);
    } catch (e) {}

    return true;
  };

  const disputeResolution = async (issueId: string, reason: string, evidenceUrls?: string[]): Promise<boolean> => {
    const targetIssue = issues.find((i) => i.id === issueId);
    if (!targetIssue || !currentUser) return false;

    const nowISO = new Date().toISOString();
    const reopenEntry = {
      reason,
      reopenedById: currentUser.id,
      reopenedByName: currentUser.name,
      evidenceUrls: evidenceUrls || [],
      reopenedAt: nowISO,
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

    setStatusHistory((prev) => ({
      ...prev,
      [issueId]: [historyItem, ...(prev[issueId] || [])],
    }));

    try {
      await apiClient.disputeResolution(issueId, reason, evidenceUrls);
    } catch (e) {}

    return true;
  };

  const reopenIssue = async (issueId: string, reason: string, evidenceUrls?: string[]) => {
    return disputeResolution(issueId, reason, evidenceUrls);
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
      authorName: currentUser.name,
      authorRole: currentUser.role,
      body,
      attachments: attachments || [],
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => ({
      ...prev,
      [issueId]: [...(prev[issueId] || []), newComment],
    }));

    try {
      await apiClient.addComment(issueId, body);
    } catch (e) {}
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
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, moderationStatus } : i))
    );

    try {
      await apiClient.moderateIssue(issueId, moderationStatus, reason);
    } catch (e) {}
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      apiClient.markNotificationRead(id);
    } catch (e) {}
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      apiClient.markAllNotificationsRead();
    } catch (e) {}
  };

  const addAsset = (asset: Asset) => {
    setAssets((prev) => [asset, ...prev]);
  };

  const deleteAsset = (assetId: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  };

  const getAssetById = (id?: string) => assets.find((a) => a.id === id);
  const getDepartmentById = (id?: string) => MOCK_DEPARTMENTS.find((d) => d.id === id);
  const getLocationById = (id?: string) => MOCK_LOCATIONS.find((l) => l.id === id);
  const getCategoryById = (id?: string) => MOCK_CATEGORIES.find((c) => c.id === id);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users: MOCK_USERS,
        isLoadingAuth,
        login,
        loginWithGoogle,
        setUserFromAuthResponse,
        logout,
        refreshIssues,
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
