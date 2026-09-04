'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, mapBackendIssueToFrontend } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { UserRole, Issue } from '@/lib/types';
import { Navbar } from '@/components/layout/Navbar';
import { StatusBadge, PriorityBadge, ModerationBadge } from '@/components/ui/Badge';
import { ResolutionProofModal } from '@/components/issues/ResolutionProofModal';
import { AiDiagnosticsHub } from '@/components/admin/AiDiagnosticsHub';
import {
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Layers,
  Flag,
  ShieldAlert,
  Bot,
  Loader2,
  Trash2,
  Users,
  UserPlus,
  UserCheck,
  Search,
  Check,
  RefreshCw,
  X,
  Shield,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
import Link from 'next/link';
import { CampusRadarLoader, CompactPulseSpinner } from '@/components/ui/CustomLoader';
import { AmbientBackground } from '@/components/layout/AmbientBackground';

interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const {
    issues,
    departments,
    categories,
    moderateIssue,
    deleteIssuePermanent,
    refreshIssues,
    currentUser,
    isLoadingAuth,
    isLoadingIssues,
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'workorders' | 'moderation' | 'ai_insights' | 'users'>('workorders');
  const [selectedIssueForProof, setSelectedIssueForProof] = useState<{ id: string; title: string } | null>(null);

  // Moderation Queue State (directly from backend)
  const [moderationList, setModerationList] = useState<Issue[]>([]);
  const [isLoadingModeration, setIsLoadingModeration] = useState(false);

  const fetchModeration = useCallback(async () => {
    setIsLoadingModeration(true);
    try {
      const res = await apiClient.getModerationQueue();
      if (res.data?.flaggedIssues) {
        const mapped = (res.data.flaggedIssues as unknown as Array<Record<string, unknown>>).map(mapBackendIssueToFrontend);
        setModerationList(mapped);
      }
    } catch {
      console.warn('Failed to load moderation queue');
    } finally {
      setIsLoadingModeration(false);
    }
  }, []);

  useEffect(() => {
    fetchModeration();
  }, [fetchModeration, activeTab]);

  // User Management State
  const [usersList, setUsersList] = useState<AdminUserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('MODERATOR');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userActionFeedback, setUserActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await apiClient.getAdminUsers();
      if (res.data?.users) {
        setUsersList(res.data.users);
      }
    } catch {
      console.warn('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users' || currentUser?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [activeTab, currentUser?.role, fetchUsers]);

  useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoadingAuth, router]);

  const activeIssues = issues.filter((i) => i.moderationStatus !== 'REMOVED');
  const criticalIssues = activeIssues.filter((i) => (i.priority === 'CRITICAL' || i.priority === 'HIGH') && i.status !== 'VERIFIED' && i.status !== 'CLOSED');
  const verifiedIssues = activeIssues.filter((i) => i.status === 'VERIFIED');
  
  // Combine server-fetched moderation queue with active in-memory flagged issues
  const flaggedIssues = React.useMemo(() => {
    const combined = [...moderationList];
    for (const iss of issues) {
      if ((iss.moderationStatus === 'FLAGGED' || iss.moderationStatus === 'UNDER_REVIEW') && !combined.some((c) => c.id === iss.id)) {
        combined.push(iss);
      }
    }
    return combined.filter((i) => i.moderationStatus === 'FLAGGED' || i.moderationStatus === 'UNDER_REVIEW');
  }, [moderationList, issues]);

  if (isLoadingAuth || !currentUser) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center text-zinc-400">
        <CampusRadarLoader
          size="lg"
          message="Loading administrative console..."
          subMessage="Fetching work orders & moderation queue"
        />
      </div>
    );
  }

  if (currentUser.role === 'STUDENT') {
    return (
      <div className="min-h-screen bg-[#09090B] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <ShieldAlert className="w-12 h-12 text-zinc-400 mb-3" />
          <h2 className="text-xl font-bold">Restricted Staff Access</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-md">
            The operations and moderation console is reserved for authorized maintenance officials and administrators.
          </p>
          <Link
            href="/"
            className="mt-5 px-5 py-2.5 min-h-[44px] inline-flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-900 shadow-md transition-all cursor-pointer"
          >
            Back to Campus Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-slate-100 flex flex-col relative overflow-hidden">
      {/* Dynamic Ambient Background with Telemetry Grid, Scanner, Dust Particles & Linear Zinc Mist */}
      <AmbientBackground variant="linear" />

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-xs font-semibold mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-zinc-400" />
              Facilities Management & Moderation Console
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Campus Infrastructure Operations
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Dispatch maintenance orders, review flagged reports, and enforce proof-of-work compliance.
            </p>
          </div>
        </div>

        {/* Analytics Top Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-[#141417] border border-zinc-800/80 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Total Work Orders</span>
              <Layers className="w-4 h-4 text-zinc-400" />
            </div>
            {isLoadingIssues ? (
              <div className="h-8 w-16 bg-zinc-800/70 rounded-md animate-pulse mt-2" />
            ) : (
              <p className="text-2xl font-black text-white mt-2">{issues.length}</p>
            )}
            <span className="text-[11px] text-zinc-400 mt-1 block">Active across all campus zones</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#141417] border border-zinc-800/80 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Immediate Triage</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            {isLoadingIssues ? (
              <div className="h-8 w-16 bg-zinc-800/70 rounded-md animate-pulse mt-2" />
            ) : (
              <p className="text-2xl font-black text-rose-400 mt-2">{criticalIssues.length}</p>
            )}
            <span className="text-[11px] text-rose-400/80 mt-1 block">High/Critical priority open</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#141417] border border-zinc-800/80 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Moderation Queue</span>
              <Flag className="w-4 h-4 text-amber-400" />
            </div>
            {isLoadingModeration ? (
              <div className="h-8 w-16 bg-zinc-800/70 rounded-md animate-pulse mt-2" />
            ) : (
              <p className="text-2xl font-black text-amber-300 mt-2">
                {flaggedIssues.length}
              </p>
            )}
            <span className="text-[11px] text-amber-300/80 mt-1 block">User/AI flagged content</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#141417] border border-zinc-800/80 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Verified Resolutions</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-2">{verifiedIssues.length}</p>
            <span className="text-[11px] text-emerald-300/80 mt-1 block">100% Photo verified</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-3 overflow-x-auto scrollbar-none touch-scroll">
          <button
            onClick={() => setActiveTab('workorders')}
            className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-2 ${
              activeTab === 'workorders'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Layers className="w-4 h-4 text-zinc-300" />
            Work Orders & Triage ({issues.length})
          </button>

          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-2 ${
              activeTab === 'moderation'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Flag className="w-4 h-4 text-amber-400" />
            Moderation & Abuse Queue ({flaggedIssues.length})
          </button>

          <button
            onClick={() => setActiveTab('ai_insights')}
            className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-2 ${
              activeTab === 'ai_insights'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Bot className="w-4 h-4 text-zinc-300" />
            AI Intelligence Diagnostics
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Users className="w-4 h-4 text-zinc-300" />
            User & Role Management ({usersList.length})
          </button>
        </div>

        {/* TAB 1: WORK ORDERS */}
        {activeTab === 'workorders' && (
          <div className="space-y-6">
            
            {/* Department Breakdown */}
            <div className="rounded-2xl bg-[#141417] p-6 border border-zinc-800 shadow-md">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-400" />
                Department Infrastructure Load
              </h3>

              {isLoadingIssues ? (
                <div className="py-6 flex flex-col items-center justify-center text-center">
                  <CompactPulseSpinner size={22} className="text-zinc-400 mb-2" />
                  <span className="text-xs text-zinc-400 font-medium">Calculating infrastructure load...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {departments.map((dept) => {
                    const deptIssues = issues.filter((i) => i.departmentId === dept.id);
                    const percentage = issues.length > 0 ? (deptIssues.length / issues.length) * 100 : 0;
                    return (
                      <div key={dept.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">{dept.name} ({dept.code})</span>
                          <span className="text-slate-400">{deptIssues.length} logged issues</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Work Orders Table */}
            <div className="rounded-2xl bg-[#141417] p-6 border border-zinc-800 shadow-md overflow-hidden">
              <h3 className="text-base font-bold text-white mb-4">Active Issue Triage Queue</h3>

              {isLoadingIssues ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <CampusRadarLoader
                    size="md"
                    message="Loading active triage queue..."
                    subMessage="Synchronizing work orders from database"
                  />
                </div>
              ) : issues.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">
                  No issues currently in the triage queue.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Issue / Equipment</th>
                        <th className="pb-3 font-semibold">Priority</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Affected</th>
                        <th className="pb-3 font-semibold">Assigned Official</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {activeIssues.map((issue) => (
                        <tr key={issue.id} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="py-3.5 pr-4">
                            <Link href={`/issues/${issue.id}`} className="font-semibold text-white hover:text-blue-400 block truncate max-w-xs transition-colors">
                              {issue.title}
                            </Link>
                            <span className="text-[11px] text-slate-400">{issue.locationDetails}</span>
                          </td>
                          <td className="py-3.5 pr-4">
                            <PriorityBadge priority={issue.priority} />
                          </td>
                          <td className="py-3.5 pr-4">
                            <StatusBadge status={issue.status} />
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className="font-bold text-zinc-300">{issue.affectedUserIds.length} users</span>
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className="text-slate-300 font-medium">{issue.assigneeName || 'Unassigned'}</span>
                          </td>
                          <td className="py-3.5 text-right space-x-2">
                            {(issue.status === 'REPORTED' || issue.status === 'UNDER_REVIEW' || issue.status === 'IN_PROGRESS' || issue.status === 'REOPENED') ? (
                              <button
                                onClick={() => setSelectedIssueForProof({ id: issue.id, title: issue.title })}
                                className="px-3 py-1.5 min-h-[36px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                              >
                                Submit Proof
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-400 font-medium">Proof On File</span>
                            )}
                            <Link
                              href={`/issues/${issue.id}`}
                              className="px-2.5 py-1.5 min-h-[36px] inline-flex items-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50 text-[11px] transition-colors"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: MODERATION QUEUE */}
        {activeTab === 'moderation' && (
          <div className="rounded-2xl bg-[#141417] p-6 border border-zinc-800 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  Potential Spam & Moderation Review Queue
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Issues flagged as potential spam (spam rating &gt; 50%, confidence &lt; 60%) or reported by users. Review AI diagnostics to approve for public display or permanently delete.
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/30 font-semibold self-start sm:self-auto">
                {flaggedIssues.length} Pending Review
              </span>
            </div>

            {isLoadingModeration ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <CampusRadarLoader
                  size="md"
                  message="Loading moderation review queue..."
                  subMessage="Scanning flagged reports & spam hold filters"
                />
              </div>
            ) : flaggedIssues.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400/60" />
                <p className="text-xs font-medium">Moderation queue is clean. No potential spam or flagged content pending review.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {flaggedIssues.map((issue) => {
                  const spamPct = issue.aiAnalysis ? Math.round(issue.aiAnalysis.spamScore * 100) : null;
                  const confPct = issue.aiAnalysis ? Math.round(issue.aiAnalysis.confidence * 100) : null;
                  const isSpamHold = issue.moderationStatus === 'UNDER_REVIEW';

                  return (
                    <div
                      key={issue.id}
                      className={`p-5 rounded-2xl border flex flex-col gap-4 transition-all ${
                        isSpamHold
                          ? 'bg-[#18181c] border-amber-500/40 shadow-[0_0_20px_-5px_rgba(245,158,11,0.15)]'
                          : 'bg-[#121215] border-zinc-800'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <ModerationBadge status={issue.moderationStatus} />
                            <PriorityBadge priority={issue.priority} />
                            <span className="text-xs text-slate-400">ID: #{issue.id}</span>
                            {isSpamHold && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 font-bold">
                                Held for Spam Review
                              </span>
                            )}
                          </div>

                          <h4 className="text-base font-bold text-white">{issue.title}</h4>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{issue.description}</p>

                          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                            <span>Reporter: <strong className="text-slate-200">{issue.reporterName}</strong> ({issue.reporterRole})</span>
                            <span>&bull;</span>
                            <span>Location: <strong className="text-slate-200">{issue.locationDetails || issue.locationId}</strong></span>
                            <span>&bull;</span>
                            <span>Submitted: {new Date(issue.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* AI Diagnostic Badge Card */}
                        {issue.aiAnalysis && (
                          <div className="lg:max-w-xs w-full p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-700/80 text-xs space-y-2">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-zinc-300 flex items-center gap-1">
                                <Bot className="w-3.5 h-3.5 text-zinc-400" /> AI Diagnostic
                              </span>
                              <span className="text-[10px] text-slate-400">{issue.aiAnalysis.modelUsed || 'Gemini 2.5 Flash'}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-center">
                              <div className={`p-1.5 rounded-lg border ${
                                (spamPct ?? 0) > 50 ? 'bg-rose-950/50 border-rose-500/40 text-rose-300' : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                              }`}>
                                <span className="text-[10px] block text-slate-400">Spam Score</span>
                                <span className="font-bold text-xs">{spamPct !== null ? `${spamPct}%` : 'N/A'}</span>
                              </div>

                              <div className={`p-1.5 rounded-lg border ${
                                (confPct ?? 0) < 60 ? 'bg-amber-950/50 border-amber-500/40 text-amber-300' : 'bg-zinc-800/80 border-zinc-700 text-zinc-200'
                              }`}>
                                <span className="text-[10px] block text-slate-400">Confidence</span>
                                <span className="font-bold text-xs">{confPct !== null ? `${confPct}%` : 'N/A'}</span>
                              </div>
                            </div>

                            {issue.aiAnalysis.reasoning && (
                              <p className="text-[11px] text-slate-300 italic line-clamp-2">
                                &quot;{issue.aiAnalysis.reasoning}&quot;
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Admin Decision Actions */}
                      <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-400">
                          {isSpamHold
                            ? 'Action required: Decide whether to approve this issue for public display or delete it.'
                            : 'Content reported by community members.'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              await moderateIssue(issue.id, 'APPROVED', 'Approved by administrator');
                              setModerationList((prev) => prev.filter((i) => i.id !== issue.id));
                              await fetchModeration();
                              await refreshIssues();
                              alert(`Issue "${issue.title}" has been approved and is now displayed on the public campus feed.`);
                            }}
                            className="px-3.5 py-1.5 min-h-[36px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Allow / Display to Users
                          </button>

                          <button
                            onClick={async () => {
                              if (confirm(`Are you sure you want to permanently delete issue "${issue.title}"?`)) {
                                await deleteIssuePermanent(issue.id);
                                setModerationList((prev) => prev.filter((i) => i.id !== issue.id));
                                await fetchModeration();
                                await refreshIssues();
                                alert('Issue has been permanently deleted from the database.');
                              }
                            }}
                            className="px-3.5 py-1.5 min-h-[36px] rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Issue
                          </button>

                          <Link
                            href={`/issues/${issue.id}`}
                            className="px-3 py-1.5 min-h-[36px] inline-flex items-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 border border-zinc-700/50 transition-colors"
                          >
                            Inspect Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AI INTELLIGENCE */}
        {activeTab === 'ai_insights' && (
          <AiDiagnosticsHub
            issues={issues}
            departments={departments}
            categories={categories}
          />
        )}

        {/* TAB 4: USER & ROLE MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Feedback Alert */}
            {userActionFeedback && (
              <div
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
                  userActionFeedback.type === 'success'
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {userActionFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{userActionFeedback.message}</span>
                </div>
                <button
                  onClick={() => setUserActionFeedback(null)}
                  className="p-1 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* User Breakdown Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#141417] border border-amber-500/30 shadow-md">
                <span className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  System Admins
                </span>
                <p className="text-xl font-bold text-white mt-1.5">
                  {usersList.filter((u) => u.role === 'ADMIN').length}
                </p>
                <span className="text-[10px] text-slate-400">Full system access</span>
              </div>

              <div className="p-4 rounded-xl bg-[#141417] border border-blue-500/30 shadow-md">
                <span className="text-xs text-blue-300 font-semibold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  Staff Officials
                </span>
                <p className="text-xl font-bold text-white mt-1.5">
                  {usersList.filter((u) => u.role === 'OFFICIAL').length}
                </p>
                <span className="text-[10px] text-slate-400">Work order resolution</span>
              </div>

              <div className="p-4 rounded-xl bg-[#141417] border border-zinc-700/60 shadow-md">
                <span className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                  Moderators
                </span>
                <p className="text-xl font-bold text-white mt-1.5">
                  {usersList.filter((u) => u.role === 'MODERATOR').length}
                </p>
                <span className="text-[10px] text-slate-400">Spam & abuse control</span>
              </div>

              <div className="p-4 rounded-xl bg-[#141417] border border-emerald-500/30 shadow-md">
                <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Campus Students
                </span>
                <p className="text-xl font-bold text-white mt-1.5">
                  {usersList.filter((u) => u.role === 'STUDENT').length}
                </p>
                <span className="text-[10px] text-slate-400">Standard reporters</span>
              </div>
            </div>

            {/* Filter and Action Header */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex-1 flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, or role..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 min-h-[44px] rounded-xl bg-[#09090B] border border-zinc-800 text-xs text-white placeholder-slate-500 focus:border-zinc-500 outline-none"
                  />
                </div>

                <button
                  onClick={fetchUsers}
                  disabled={isLoadingUsers}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-slate-300 hover:text-white hover:border-zinc-700 transition-all cursor-pointer shrink-0"
                  title="Refresh Users"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin text-zinc-300' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Role Filter Pills */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800 overflow-x-auto scrollbar-none touch-scroll">
                  {(['ALL', 'ADMIN', 'OFFICIAL', 'MODERATOR', 'STUDENT'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRoleFilter(r)}
                      className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        selectedRoleFilter === r
                          ? 'bg-zinc-100 text-zinc-900 font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {r === 'ALL' ? 'All Roles' : r}
                    </button>
                  ))}
                </div>

                {/* Add / Promote User Button */}
                {currentUser?.role === 'ADMIN' && (
                  <button
                    onClick={() => setIsAddUserOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add / Promote Staff
                  </button>
                )}
              </div>
            </div>

            {/* Users Directory Table */}
            <div className="rounded-2xl bg-[#141417] border border-zinc-800 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 font-semibold uppercase tracking-wider">
                      <th className="py-3.5 pl-6 pr-4">User</th>
                      <th className="py-3.5 pr-4">Email Address</th>
                      <th className="py-3.5 pr-4">Current Role</th>
                      <th className="py-3.5 pr-4">Account Status</th>
                      <th className="py-3.5 pr-4">Registered Date</th>
                      <th className="py-3.5 pr-6 text-right">Role & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {isLoadingUsers && usersList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                            <span>Loading user directory...</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      usersList
                        .filter((u) => {
                          if (selectedRoleFilter !== 'ALL' && u.role !== selectedRoleFilter) return false;
                          if (userSearch.trim()) {
                            const query = userSearch.toLowerCase();
                            return (
                              u.name.toLowerCase().includes(query) ||
                              u.email.toLowerCase().includes(query) ||
                              u.role.toLowerCase().includes(query)
                            );
                          }
                          return true;
                        })
                        .map((u) => {
                          const isSelf = u.id === currentUser?.id;
                          return (
                            <tr key={u.id} className="hover:bg-zinc-900/40 transition-colors">
                              <td className="py-4 pl-6 pr-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-100 text-xs shadow-inner shrink-0">
                                    {u.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white flex items-center gap-1.5">
                                      {u.name}
                                      {isSelf && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-normal">
                                          You
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[11px] text-slate-500">ID: {u.id.slice(0, 12)}...</p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 pr-4">
                                <span className="text-slate-300 font-mono text-[11px]">{u.email}</span>
                              </td>

                              <td className="py-4 pr-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border ${
                                    u.role === 'ADMIN'
                                      ? 'bg-amber-950/70 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                      : u.role === 'OFFICIAL'
                                      ? 'bg-blue-950/70 text-blue-300 border-blue-500/40'
                                      : u.role === 'MODERATOR'
                                      ? 'bg-zinc-800 text-zinc-300 border-zinc-700/60'
                                      : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                                  }`}
                                >
                                  {u.role === 'ADMIN' && <Shield className="w-3 h-3 text-amber-400" />}
                                  {u.role === 'OFFICIAL' && <Building2 className="w-3.5 h-3.5 text-blue-400" />}
                                  {u.role === 'MODERATOR' && <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />}
                                  {u.role === 'STUDENT' && <UserIcon className="w-3 h-3 text-emerald-400" />}
                                  {u.role}
                                </span>
                              </td>

                              <td className="py-4 pr-4">
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  Active
                                </span>
                              </td>

                              <td className="py-4 pr-4 text-slate-400 text-[11px]">
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                              </td>

                              <td className="py-4 pr-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {currentUser?.role === 'ADMIN' ? (
                                    <>
                                      <select
                                        value={u.role}
                                        disabled={isSelf}
                                        onChange={async (e) => {
                                          const nextRole = e.target.value as UserRole;
                                          if (nextRole === u.role) return;
                                          
                                          try {
                                            const res = await apiClient.updateUserRole(u.id, nextRole);
                                            if (res.data?.user) {
                                              setUsersList((prev) =>
                                                prev.map((item) => (item.id === u.id ? { ...item, role: nextRole } : item))
                                              );
                                              setUserActionFeedback({
                                                type: 'success',
                                                message: `Updated ${u.name}'s role to ${nextRole}.`,
                                              });
                                            } else {
                                              setUserActionFeedback({
                                                type: 'error',
                                                message: res.error || 'Failed to update user role.',
                                              });
                                            }
                                          } catch {
                                            setUserActionFeedback({
                                              type: 'error',
                                              message: 'Network error updating user role.',
                                            });
                                          }
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-[#09090B] border border-zinc-800 text-xs font-semibold text-zinc-200 focus:border-zinc-500 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={isSelf ? 'Cannot change your own role' : 'Change user role'}
                                      >
                                        <option value="STUDENT">STUDENT (Reporter)</option>
                                        <option value="MODERATOR">MODERATOR (Spam Control)</option>
                                        <option value="OFFICIAL">OFFICIAL (Staff)</option>
                                        <option value="ADMIN">ADMIN (Full Control)</option>
                                      </select>

                                      {!isSelf ? (
                                        <button
                                          onClick={async () => {
                                            if (confirm(`Are you sure you want to remove privileges / account for ${u.name} (${u.email})?`)) {
                                              try {
                                                const res = await apiClient.deleteAdminUser(u.id);
                                                if (res.data?.id) {
                                                  setUsersList((prev) => prev.filter((item) => item.id !== u.id));
                                                  setUserActionFeedback({
                                                    type: 'success',
                                                    message: `Removed ${u.email} successfully.`,
                                                  });
                                                } else {
                                                  setUserActionFeedback({
                                                    type: 'error',
                                                    message: res.error || 'Failed to remove user.',
                                                  });
                                                }
                                              } catch {
                                                setUserActionFeedback({
                                                  type: 'error',
                                                  message: 'Network error removing user.',
                                                });
                                              }
                                            }
                                          }}
                                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
                                          title={`Remove user ${u.email}`}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      ) : (
                                        <span className="w-7" />
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-[11px] text-slate-500 font-medium">Read-only</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Role Permissions Guide */}
            <div className="rounded-2xl bg-[#141417] p-6 border border-zinc-800 shadow-md">
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-zinc-400" />
                Campus Role Hierarchy & Privilege Matrix
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1">
                  <span className="font-bold text-amber-300 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-amber-400" /> ADMIN
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Full system authority. Manage user roles, allowlist admin emails, triage issues, resolve tickets, and delete records.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-1">
                  <span className="font-bold text-blue-300 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" /> OFFICIAL
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Facilities & departmental staff. Accept tickets into &quot;In Progress&quot;, perform repair work, and submit completion proof photos.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/60 space-y-1">
                  <span className="font-bold text-zinc-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" /> MODERATOR
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Content moderation team. Review AI spam holds, verify duplicate flags, and approve or remove reported content.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                  <span className="font-bold text-emerald-300 flex items-center gap-1">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-400" /> STUDENT
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Standard campus member. Report infrastructure problems, upvote affected tickets, comment, and verify/dispute fixes.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Add / Promote User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add / Promote Staff Member</h3>
                  <p className="text-xs text-slate-400">Assign admin, official, or moderator privileges</p>
                </div>
              </div>

              <button
                onClick={() => setIsAddUserOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newUserEmail.trim()) return;

                setIsSubmittingUser(true);
                try {
                  const res = await apiClient.addAdminUser({
                    email: newUserEmail.trim(),
                    name: newUserName.trim() || undefined,
                    role: newUserRole,
                  });

                  if (res.data?.user) {
                    setUserActionFeedback({
                      type: 'success',
                      message: `User ${res.data.user.email} successfully assigned role ${res.data.user.role}.`,
                    });
                    setNewUserEmail('');
                    setNewUserName('');
                    setIsAddUserOpen(false);
                    fetchUsers();
                  } else {
                    setUserActionFeedback({
                      type: 'error',
                      message: res.error || 'Failed to add user.',
                    });
                  }
                } catch {
                  setUserActionFeedback({
                    type: 'error',
                    message: 'Network error adding user.',
                  });
                } finally {
                  setIsSubmittingUser(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Institutional Email Address <span className="text-zinc-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. faculty@cet.ac.in or moderator@cet.ac.in"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#09090B] border border-zinc-800 text-xs text-white placeholder-slate-500 focus:border-zinc-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Ramesh Kumar"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#09090B] border border-zinc-800 text-xs text-white placeholder-slate-500 focus:border-zinc-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Assigned Privileged Role <span className="text-zinc-400">*</span>
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#09090B] border border-zinc-800 text-xs text-slate-200 focus:border-zinc-500 outline-none cursor-pointer"
                >
                  <option value="MODERATOR">MODERATOR — Review spam & duplicate tickets</option>
                  <option value="OFFICIAL">OFFICIAL — Dispatch & resolve work orders</option>
                  <option value="ADMIN">ADMIN — Full system access & role management</option>
                  <option value="STUDENT">STUDENT — Campus issue reporter</option>
                </select>
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 min-h-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 min-h-[44px] rounded-xl bg-zinc-100 hover:bg-white text-xs font-bold text-zinc-900 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingUser && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save / Assign Role
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Resolution Proof Modal */}
      {selectedIssueForProof && (
        <ResolutionProofModal
          issueId={selectedIssueForProof.id}
          issueTitle={selectedIssueForProof.title}
          isOpen={true}
          onClose={() => {
            setSelectedIssueForProof(null);
            refreshIssues();
          }}
        />
      )}
    </div>
  );
}
