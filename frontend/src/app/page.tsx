'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { Navbar } from '@/components/layout/Navbar';
import { IssueCard } from '@/components/issues/IssueCard';
import { IssueFilterBar } from '@/components/issues/IssueFilterBar';
import { ReportIssueModal } from '@/components/forms/ReportIssueModal';
import {
  Plus,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ThumbsUp,
  UserCheck,
  Flame,
  Loader2
} from 'lucide-react';
import { CampusRadarLoader } from '@/components/ui/CustomLoader';
import { EmptyStateIllustration } from '@/components/ui/EmptyStateIllustration';

export default function HomePage() {
  const router = useRouter();
  const { issues, currentUser, isLoadingAuth } = useApp();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [tabView, setTabView] = useState<'all' | 'my_reported' | 'my_affected'>('all');

  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    departmentId: 'ALL',
    categoryId: 'ALL',
    sortBy: 'most_affected' as 'most_affected' | 'newest' | 'priority',
  });

  useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoadingAuth, router]);

  // Publicly visible issues on the campus main page (excludes removed and under-review spam holds)
  const publicIssues = useMemo(
    () => issues.filter((i) => i.moderationStatus !== 'REMOVED' && i.moderationStatus !== 'UNDER_REVIEW'),
    [issues]
  );

  const totalOpen = publicIssues.filter((i) => i.status !== 'VERIFIED' && i.status !== 'CLOSED').length;
  const criticalCount = publicIssues.filter(
    (i) => (i.priority === 'CRITICAL' || i.priority === 'HIGH') && i.status !== 'VERIFIED' && i.status !== 'CLOSED'
  ).length;
  const inProgressCount = publicIssues.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'RESOLUTION_SUBMITTED').length;
  const resolvedCount = publicIssues.filter((i) => i.status === 'VERIFIED').length;

  // Filter and sort issues
  const filteredIssues = useMemo(() => {
    // Base issues pool: for "my_reported", author can see their own issues including those UNDER_REVIEW
    const sourceIssues = (tabView === 'my_reported' && currentUser)
      ? issues.filter((i) => i.reporterId === currentUser.id && i.moderationStatus !== 'REMOVED')
      : (tabView === 'my_affected' && currentUser)
      ? publicIssues.filter((i) => i.affectedUserIds.includes(currentUser.id))
      : publicIssues;

    return sourceIssues.filter((issue) => {
      // Tab view filter
      if (tabView === 'my_reported' && (!currentUser || issue.reporterId !== currentUser.id)) return false;
      if (tabView === 'my_affected' && (!currentUser || !issue.affectedUserIds.includes(currentUser.id))) return false;

      // Search filter
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesTitle = issue.title.toLowerCase().includes(query);
        const matchesDesc = issue.description.toLowerCase().includes(query);
        const matchesLoc = (issue.locationDetails || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesLoc) return false;
      }

      // Status filter
      if (filters.status !== 'ALL') {
        if (issue.status !== filters.status) return false;
      }

      // Department filter
      if (filters.departmentId !== 'ALL') {
        const matchDept =
          issue.departmentId?.toLowerCase() === filters.departmentId.toLowerCase();
        if (!matchDept) return false;
      }

      // Category filter
      if (filters.categoryId !== 'ALL') {
        const matchCat =
          issue.categoryId?.toLowerCase() === filters.categoryId.toLowerCase();
        if (!matchCat) return false;
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'most_affected') {
        return b.affectedUserIds.length - a.affectedUserIds.length;
      }
      if (filters.sortBy === 'priority') {
        const priorityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      // newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [publicIssues, issues, filters, tabView, currentUser]);

  if (isLoadingAuth || !currentUser) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-blue-400">
        <CampusRadarLoader
          size="lg"
          message="Authenticating campus session..."
          subMessage="Connecting to CET infrastructure network"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-slate-100 relative overflow-hidden">
      {/* Dynamic Glowing Idle Ambient Orbs (Fusion: Cobalt, Amber, Emerald) */}
      <div className="absolute top-10 left-10 w-[550px] h-[550px] bg-gradient-to-tr from-blue-600/18 via-blue-900/15 to-transparent rounded-full blur-[120px] pointer-events-none animate-float-slow animate-pulse-glow" />
      <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-amber-600/12 via-slate-800/15 to-transparent rounded-full blur-[130px] pointer-events-none animate-float-reverse animate-pulse-glow" />
      <div className="absolute bottom-10 left-1/3 w-[450px] h-[450px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse-glow" />

      {/* Top Navigation */}
      <Navbar onOpenReportModal={() => setIsReportModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Hero & Live Stats Banner */}
        <div className="relative rounded-3xl p-6 sm:p-8 mb-8 overflow-hidden border border-zinc-800 bg-gradient-to-br from-[#121217]/95 via-[#0e1017]/95 to-[#161824]/95 shadow-[0_15px_50px_-10px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-600/12 rounded-full blur-3xl pointer-events-none animate-float-slow" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Campus Infrastructure Health Network
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Report, Track & Resolve <br />
                <span className="gradient-text">Campus Infrastructure Problems</span>
              </h1>
              <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
                Empowering students, faculty, and maintenance staff to keep classrooms, labs, electrical, and HVAC assets in peak condition.
              </p>
            </div>

            {/* Quick Action Card */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="px-6 py-3.5 rounded-2xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                Report New Problem
              </button>
            </div>
          </div>

          {/* Mini Live Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-zinc-800">
            <div className="p-3 rounded-2xl bg-black/40 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <AlertOctagon className="w-4 h-4 text-blue-400" />
                <span>Active Issues</span>
              </div>
              <p className="text-xl font-extrabold text-white mt-1">{totalOpen}</p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>High / Critical</span>
              </div>
              <p className="text-xl font-extrabold text-rose-400 mt-1">{criticalCount}</p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Under Repair</span>
              </div>
              <p className="text-xl font-extrabold text-amber-300 mt-1">{inProgressCount}</p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Fixed & Verified</span>
              </div>
              <p className="text-xl font-extrabold text-emerald-400 mt-1">{resolvedCount}</p>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center justify-between gap-4 mb-4 border-b border-zinc-800 pb-3 overflow-x-auto scrollbar-none touch-scroll">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setTabView('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                tabView === 'all'
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-zinc-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              All Campus Issues ({publicIssues.length})
            </button>

            <button
              onClick={() => setTabView('my_reported')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                tabView === 'my_reported'
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-zinc-800/60'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Reported by Me ({currentUser ? issues.filter((i) => i.reporterId === currentUser.id && i.moderationStatus !== 'REMOVED').length : 0})
            </button>

            <button
              onClick={() => setTabView('my_affected')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                tabView === 'my_affected'
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-zinc-800/60'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              I&apos;m Affected ({currentUser ? publicIssues.filter((i) => i.affectedUserIds.includes(currentUser.id)).length : 0})
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <IssueFilterBar filters={filters} onFilterChange={setFilters} />

        {/* Problem Tiles Grid */}
        {filteredIssues.length === 0 ? (
          <div className="rounded-3xl glass-panel p-6 sm:p-10 border border-zinc-800">
            <EmptyStateIllustration
              type={issues.length === 0 ? 'issues' : 'search'}
              title={issues.length === 0 ? 'No Campus Issues Logged Yet' : 'No issues found matching your filters'}
              description={
                issues.length === 0
                  ? 'All campus systems and infrastructure are operating normally. Spotted a problem? Report it below.'
                  : 'Try adjusting your search criteria or report a new problem if you noticed an unlisted issue.'
              }
              action={
                issues.length === 0 ? (
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Report First Issue
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setFilters({ search: '', status: 'ALL', departmentId: 'ALL', categoryId: 'ALL', sortBy: 'most_affected' });
                      setTabView('all');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-blue-300 bg-blue-950/50 hover:bg-blue-900/60 border border-blue-800/40"
                  >
                    Clear All Filters
                  </button>
                )
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}

      </main>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsReportModalOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3.5 rounded-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all hover:scale-105 active:scale-95"
          title="Report an issue"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap">
            Report Issue
          </span>
        </button>
      </div>

      {/* Report Modal */}
      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
