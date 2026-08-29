export type UserRole = 'STUDENT' | 'OFFICIAL' | 'ADMIN' | 'SUPER_ADMIN';

export type IssueStatus =
  | 'REPORTED'
  | 'UNDER_REVIEW'
  | 'IN_PROGRESS'
  | 'RESOLUTION_SUBMITTED'
  | 'VERIFIED'
  | 'CLOSED'
  | 'REOPENED';

export type ModerationStatus =
  | 'NORMAL'
  | 'FLAGGED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'DUPLICATE'
  | 'REMOVED';

export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  classYear?: string;
  avatarUrl?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface CampusLocation {
  id: string;
  building: string;
  floor: string;
  room: string;
  description?: string;
}

export interface IssueCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
  active: boolean;
}

export interface Asset {
  id: string;
  name: string;
  assetTag: string; // e.g. "PRJ-TUR-304", "AC-TUR-202-A"
  category: string;
  departmentId: string;
  locationId: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'OUT_OF_SERVICE' | 'UNDER_MAINTENANCE';
  modelNumber?: string;
  serialNumber?: string;
  installedAt: string;
  lastServicedAt: string;
  reportedIssuesCount: number;
  imageUrl?: string;
}

export interface ResolutionProof {
  imageUrl: string;
  resolvedById: string;
  resolvedByName: string;
  notes: string;
  resolvedAt: string;
}

export interface ReopenDetails {
  reason: string;
  reopenedById: string;
  reopenedByName: string;
  evidenceUrls?: string[];
  reopenedAt: string;
}

export interface AIAnalysis {
  category: string;
  suggestedDepartment: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  spamScore: number;
  moderationFlags: string[];
  duplicateCandidates: {
    issueId: string;
    title?: string;
    confidence: number;
  }[];
  reasoning?: string;
  modelUsed?: string;
}

export interface IssueReport {
  id: string;
  issueId: string;
  reporterId: string;
  reporterName: string;
  reason: 'spam' | 'duplicate' | 'inappropriate' | 'misleading' | 'sensitive_info' | 'other';
  details?: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  departmentId: string;
  locationId: string;
  locationDetails?: string;
  assetId?: string;
  
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reporterRole: UserRole;
  
  status: IssueStatus;
  moderationStatus: ModerationStatus;
  priority: IssuePriority;
  
  possibleCause?: string;
  suggestedSolution?: string;
  occurredAt?: string;
  
  attachments: string[]; // URLs/base64
  affectedUserIds: string[]; // upvoted / marked "I'm affected"
  followerUserIds: string[];
  
  assigneeId?: string;
  assigneeName?: string;
  
  aiAnalysis?: AIAnalysis;
  
  resolutionProof?: ResolutionProof;
  reopenHistory?: ReopenDetails[];
  
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  verifiedAt?: string;
}

export interface IssueComment {
  id: string;
  issueId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  body: string;
  attachments?: string[];
  createdAt: string;
}

export interface IssueStatusHistory {
  id: string;
  issueId: string;
  fromStatus: IssueStatus;
  toStatus: IssueStatus;
  changedById: string;
  changedByName: string;
  changedByRole: UserRole;
  reason?: string;
  proofImageUrl?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'ISSUE_CREATED' | 'STATUS_CHANGED' | 'ASSIGNMENT' | 'COMMENT' | 'REOPENED' | 'VERIFIED' | 'AFFECTED_UPVOTE' | 'MODERATION';
  title: string;
  body: string;
  issueId?: string;
  read: boolean;
  createdAt: string;
}
