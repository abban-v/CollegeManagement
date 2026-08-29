'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  login: (email: string, password?: string) => User;
  loginWithGoogle: (email?: string) => User;
  logout: () => void;
  
  issues: Issue[];
  departments: Department[];
  locations: CampusLocation[];
  categories: IssueCategory[];
  assets: Asset[];
  comments: Record<string, IssueComment[]>;
  statusHistory: Record<string, IssueStatusHistory[]>;
  notifications: AppNotification[];
  reports: IssueReport[];
  
  createIssue: (input: CreateIssueInput) => Issue;
  toggleAffected: (issueId: string) => void;
  toggleFollow: (issueId: string) => void;
  updateStatus: (issueId: string, newStatus: IssueStatus, reason?: string, proof?: { imageUrl: string; notes: string }) => boolean;
  submitResolution: (issueId: string, notes: string, imageUrl: string) => boolean;
  verifyResolution: (issueId: string) => boolean;
  disputeResolution: (issueId: string, reason: string, evidenceUrls?: string[]) => boolean;
  reopenIssue: (issueId: string, reason: string, evidenceUrls?: string[]) => boolean;
  assignIssue: (issueId: string, assigneeId: string, assigneeName: string) => void;
  addComment: (issueId: string, body: string, attachments?: string[]) => void;
  reportIssueContent: (issueId: string, reason: IssueReport['reason'], details?: string) => void;
  moderateIssue: (issueId: string, moderationStatus: ModerationStatus, reason?: string) => void;
  
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  
  getAssetById: (id?: string) => Asset | undefined;
  getDepartmentById: (id?: string) => Department | undefined;
  getLocationById: (id?: string) => CampusLocation | undefined;
  getCategoryById: (id?: string) => IssueCategory | undefined;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  CURRENT_USER: 'slashforge_current_user_v5',
  ISSUES: 'slashforge_issues_v5',
  COMMENTS: 'slashforge_comments_v5',
  HISTORY: 'slashforge_history_v5',
  NOTIFICATIONS: 'slashforge_notifications_v5',
  ASSETS: 'slashforge_assets_v5',
  REPORTS: 'slashforge_reports_v5',
};

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

  // Load from LocalStorage on initial client mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      const savedIssues = localStorage.getItem(STORAGE_KEYS.ISSUES);
      const savedComments = localStorage.getItem(STORAGE_KEYS.COMMENTS);
      const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      const savedNotifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      const savedAssets = localStorage.getItem(STORAGE_KEYS.ASSETS);
      const savedReports = localStorage.getItem(STORAGE_KEYS.REPORTS);

      if (savedUser) setCurrentUser(JSON.parse(savedUser));
      if (savedIssues) setIssues(JSON.parse(savedIssues));
      if (savedComments) setComments(JSON.parse(savedComments));
      if (savedHistory) setStatusHistory(JSON.parse(savedHistory));
      if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
      if (savedAssets) setAssets(JSON.parse(savedAssets));
      if (savedReports) setReports(JSON.parse(savedReports));
    } catch (e) {
      console.warn('Failed to parse state from localStorage', e);
    } finally {
      setIsInitialized(true);
      setIsLoadingAuth(false);
    }
  }, []);

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

  const login = (email: string): User => {
    const matched = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const user = matched || {
      id: `user-${Date.now()}`,
      name: email.split('@')[0].replace('.', ' '),
      email,
      role: email.includes('admin') ? 'ADMIN' : email.includes('facilities') || email.includes('staff') ? 'OFFICIAL' : 'STUDENT',
      departmentId: 'dept-cse',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };
    setCurrentUser(user);
    return user;
  };

  const loginWithGoogle = (email?: string): User => {
    const userEmail = email || 'student@campus.edu';
    const matched = MOCK_USERS.find((u) => u.email.toLowerCase() === userEmail.toLowerCase()) || MOCK_USERS[0];
    setCurrentUser(matched);
    return matched;
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch (e) {}
  };

  const createIssue = (input: CreateIssueInput): Issue => {
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

    const newIssue: Issue = {
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

    setIssues((prev) => [newIssue, ...prev]);

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

    if (input.assetId) {
      setAssets((prev) =>
        prev.map((ast) =>
          ast.id === input.assetId
            ? { ...ast, reportedIssuesCount: ast.reportedIssuesCount + 1, status: 'DEGRADED' }
            : ast
        )
      );
    }

    return newIssue;
  };

  const toggleAffected = (issueId: string) => {
    if (!currentUser) return;
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id !== issueId) return iss;
        const isAffected = iss.affectedUserIds.includes(currentUser.id);
        const updatedAffected = isAffected
          ? iss.affectedUserIds.filter((id) => id !== currentUser.id)
          : [...iss.affectedUserIds, currentUser.id];

        if (!isAffected && iss.reporterId !== currentUser.id) {
          const upvoteNotif: AppNotification = {
            id: `notif-${Date.now()}`,
            userId: iss.reporterId,
            type: 'AFFECTED_UPVOTE',
            title: `${currentUser.name} is also affected by your issue`,
            body: `Your issue "${iss.title.slice(0, 35)}..." has ${updatedAffected.length} affected users now.`,
            issueId: iss.id,
            read: false,
            createdAt: new Date().toISOString(),
          };
          setNotifications((n) => [upvoteNotif, ...n]);
        }

        return {
          ...iss,
          affectedUserIds: updatedAffected,
        };
      })
    );
  };

  const toggleFollow = (issueId: string) => {
    if (!currentUser) return;
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

    return true;
  };

  const submitResolution = (issueId: string, notes: string, imageUrl: string): boolean => {
    return updateStatus(issueId, 'RESOLUTION_SUBMITTED', notes, {
      imageUrl,
      notes,
    });
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

    return true;
  };

  const disputeResolution = (issueId: string, reason: string, evidenceUrls?: string[]): boolean => {
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

    return true;
  };

  const reopenIssue = (issueId: string, reason: string, evidenceUrls?: string[]) => {
    return disputeResolution(issueId, reason, evidenceUrls);
  };

  const assignIssue = (issueId: string, assigneeId: string, assigneeName: string) => {
    const nowISO = new Date().toISOString();
    setIssues((prev) =>
      prev.map((iss) => (iss.id === issueId ? { ...iss, assigneeId, assigneeName, updatedAt: nowISO } : iss))
    );
  };

  const addComment = (issueId: string, body: string, attachments?: string[]) => {
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
  };

  const reportIssueContent = (issueId: string, reason: IssueReport['reason'], details?: string) => {
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
  };

  const moderateIssue = (issueId: string, moderationStatus: ModerationStatus) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, moderationStatus } : i))
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
        logout,
        issues,
        departments: MOCK_DEPARTMENTS,
        locations: MOCK_LOCATIONS,
        categories: MOCK_CATEGORIES,
        assets,
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
