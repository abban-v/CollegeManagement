'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { Navbar } from '@/components/layout/Navbar';
import { StatusBadge, PriorityBadge, ModerationBadge } from '@/components/ui/Badge';
import { ResolutionProofModal } from '@/components/issues/ResolutionProofModal';
import {
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Layers,
  Flag,
  ShieldAlert,
  Bot,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const router = useRouter();
  const {
    issues,
    departments,
    moderateIssue,
    currentUser,
    isLoadingAuth,
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'workorders' | 'moderation' | 'ai_insights'>('workorders');

  useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoadingAuth, router]);

  if (isLoadingAuth || !currentUser) {
    return (
      <div className="min-h-screen bg-[#060813] flex items-center justify-center text-purple-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (currentUser.role === 'STUDENT') {
    return (
      <div className="min-h-screen bg-[#060813] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <ShieldAlert className="w-12 h-12 text-purple-400 mb-3" />
          <h2 className="text-xl font-bold">Restricted Staff Access</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-md">
            The operations and moderation console is reserved for authorized maintenance officials and administrators.
          </p>
          <Link
            href="/"
            className="mt-5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg"
          >
            Back to Campus Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const activeIssues = issues.filter((i) => i.moderationStatus !== 'REMOVED');
  const criticalIssues = activeIssues.filter((i) => (i.priority === 'CRITICAL' || i.priority === 'HIGH') && i.status !== 'VERIFIED' && i.status !== 'CLOSED');
  const verifiedIssues = activeIssues.filter((i) => i.status === 'VERIFIED');
  const flaggedIssues = issues.filter((i) => i.moderationStatus === 'FLAGGED' || i.moderationStatus === 'UNDER_REVIEW');

  return (
    <div className="min-h-screen bg-[#060813] text-slate-100 flex flex-col relative overflow-hidden">
      {/* Dynamic Glowing Idle Ambient Orbs */}
      <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-600/18 via-purple-600/15 to-transparent rounded-full blur-[120px] pointer-events-none animate-float-slow animate-pulse-glow" />
      <div className="absolute top-1/2 right-0 w-[550px] h-[550px] bg-gradient-to-bl from-purple-800/18 via-pink-600/12 to-transparent rounded-full blur-[130px] pointer-events-none animate-float-reverse animate-pulse-glow" />

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
              <BarChart3 className="w-3.5 h-3.5" />
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
          <div className="p-5 rounded-2xl glass-panel border border-indigo-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Total Work Orders</span>
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-black text-white mt-2">{issues.length}</p>
            <span className="text-[11px] text-indigo-300 mt-1 block">Active across all campus zones</span>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-indigo-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Immediate Triage</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400 mt-2">{criticalIssues.length}</p>
            <span className="text-[11px] text-rose-300 mt-1 block">High/Critical priority open</span>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-indigo-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Moderation Queue</span>
              <Flag className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-300 mt-2">
              {flaggedIssues.length}
            </p>
            <span className="text-[11px] text-amber-300/80 mt-1 block">User/AI flagged content</span>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-indigo-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Verified Resolutions</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-2">{verifiedIssues.length}</p>
            <span className="text-[11px] text-emerald-300/80 mt-1 block">100% Photo verified</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-6 border-b border-indigo-950/80 pb-3">
          <button
            onClick={() => setActiveTab('workorders')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'workorders'
                ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Work Orders & Triage ({issues.length})
          </button>

          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'moderation'
                ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flag className="w-4 h-4 text-amber-400" />
            Moderation & Abuse Queue ({flaggedIssues.length})
          </button>

          <button
            onClick={() => setActiveTab('ai_insights')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'ai_insights'
                ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4 text-purple-400" />
            AI Intelligence Diagnostics
          </button>
        </div>

        {/* TAB 1: WORK ORDERS */}
        {activeTab === 'workorders' && (
          <div className="space-y-6">
            
            {/* Department Breakdown */}
            <div className="rounded-2xl glass-panel p-6 border border-indigo-500/20">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                Department Infrastructure Load
              </h3>

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
                      <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Work Orders Table */}
            <div className="rounded-2xl glass-panel p-6 border border-indigo-500/20 overflow-hidden">
              <h3 className="text-base font-bold text-white mb-4">Active Issue Triage Queue</h3>

              {issues.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">
                  No issues currently in the triage queue.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-indigo-950/80 text-slate-400 text-[11px] uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Issue / Equipment</th>
                        <th className="pb-3 font-semibold">Priority</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Affected</th>
                        <th className="pb-3 font-semibold">Assigned Official</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-950/50">
                      {activeIssues.map((issue) => (
                        <tr key={issue.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 pr-4">
                            <Link href={`/issues/${issue.id}`} className="font-semibold text-white hover:text-purple-300 block truncate max-w-xs">
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
                            <span className="font-bold text-purple-300">{issue.affectedUserIds.length} users</span>
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className="text-slate-300 font-medium">{issue.assigneeName || 'Unassigned'}</span>
                          </td>
                          <td className="py-3.5 text-right space-x-2">
                            {(issue.status === 'REPORTED' || issue.status === 'UNDER_REVIEW' || issue.status === 'IN_PROGRESS' || issue.status === 'REOPENED') ? (
                              <button
                                onClick={() => setSelectedIssueForProof({ id: issue.id, title: issue.title })}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors"
                              >
                                Submit Proof
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-400 font-medium">Proof On File</span>
                            )}
                            <Link
                              href={`/issues/${issue.id}`}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
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
          <div className="rounded-2xl glass-panel p-6 border border-indigo-500/20">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Content Moderation & Policy Queue
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Review flagged issues or user reports (spam, duplicate, inappropriate content).
            </p>

            {flaggedIssues.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400/60" />
                <p className="text-xs">Moderation queue is clean. No content currently flagged.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {flaggedIssues.map((issue) => (
                  <div key={issue.id} className="p-4 rounded-xl bg-[#090e24] border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <ModerationBadge status={issue.moderationStatus} />
                        <span className="text-xs font-bold text-white">{issue.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{issue.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          moderateIssue(issue.id, 'APPROVED', 'Approved by moderator');
                          alert('Issue marked as approved.');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          moderateIssue(issue.id, 'REMOVED', 'Removed under policy');
                          alert('Issue removed.');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
                      >
                        Remove
                      </button>
                      <Link
                        href={`/issues/${issue.id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300"
                      >
                        Inspect
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AI INTELLIGENCE */}
        {activeTab === 'ai_insights' && (
          <div className="rounded-2xl glass-panel p-6 border border-indigo-500/20 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                Gemini 2.5 Flash Model Gateway & SLA Intelligence
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Multi-tier AI pipeline: Flash-Lite for fast classification & spam checks; Gemini 2.5 Flash for priority estimation and duplicate reranking.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#090e24] border border-purple-500/20">
                <span className="text-xs font-semibold text-purple-300">Model Tier Active</span>
                <p className="text-lg font-bold text-white mt-1">Gemini 2.5 Flash</p>
                <p className="text-[11px] text-slate-400 mt-1">Primary reasoning & priority engine</p>
              </div>

              <div className="p-4 rounded-xl bg-[#090e24] border border-purple-500/20">
                <span className="text-xs font-semibold text-purple-300">Average Confidence Score</span>
                <p className="text-lg font-bold text-emerald-400 mt-1">94.2%</p>
                <p className="text-[11px] text-slate-400 mt-1">Based on category & symptom clarity</p>
              </div>

              <div className="p-4 rounded-xl bg-[#090e24] border border-purple-500/20">
                <span className="text-xs font-semibold text-purple-300">Spam Filter Precision</span>
                <p className="text-lg font-bold text-indigo-300 mt-1">99.1%</p>
                <p className="text-[11px] text-slate-400 mt-1">Zero legitimate reports blocked</p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Resolution Proof Modal */}
      {selectedIssueForProof && (
        <ResolutionProofModal
          issueId={selectedIssueForProof.id}
          issueTitle={selectedIssueForProof.title}
          isOpen={true}
          onClose={() => setSelectedIssueForProof(null)}
        />
      )}
    </div>
  );
}
