/**
 * Slashforge Campus Asset & Issue Management API Client Adapter
 * 
 * Matches Section 17 (API Design) of the Full Backend Architecture & Implementation Blueprint v4.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const API_ENDPOINTS = {
  // Issues Core
  ISSUES: `${API_BASE_URL}/issues`,
  ISSUE_DETAILS: (id: string) => `${API_BASE_URL}/issues/${id}`,
  MARK_AFFECTED: (id: string) => `${API_BASE_URL}/issues/${id}/affected`,
  COMMENTS: (id: string) => `${API_BASE_URL}/issues/${id}/comments`,
  DISPUTE: (id: string) => `${API_BASE_URL}/issues/${id}/dispute`,
  REPORT_ABUSE: (id: string) => `${API_BASE_URL}/issues/${id}/report`,
  
  // Admin & Official Triage
  RESOLVE: (id: string) => `${API_BASE_URL}/admin/issues/${id}/resolve`,
  ADMIN_STATUS: (id: string) => `${API_BASE_URL}/admin/issues/${id}/status`,
  ADMIN_MODERATION: `${API_BASE_URL}/admin/moderation`,
  ADMIN_MODERATION_ACTION: (id: string) => `${API_BASE_URL}/admin/moderation/${id}`,
  
  // Notifications
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
};
