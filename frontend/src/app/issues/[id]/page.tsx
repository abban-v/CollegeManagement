'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { Navbar } from '@/components/layout/Navbar';
import { StatusBadge, PriorityBadge, ModerationBadge } from '@/components/ui/Badge';
import { ResolutionProofModal } from '@/components/issues/ResolutionProofModal';
import { ReopenModal } from '@/components/issues/ReopenModal';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  MapPin,
  Building2,
  Calendar,
  User,
  ThumbsUp,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Send,
  ShieldCheck,
  RefreshCcw,
  Sparkles,
  HelpCircle,
  Lightbulb,
  Clock,
  History,
  Box,
  Image as ImageIcon,
  UserCheck,
  ChevronRight,
  ShieldAlert,
  Bot,
  Flag
} from 'lucide-react';
import Link from 'next/link';

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const issueId = params?.id as string;

  const {
    issues,
    currentUser,
    isLoadingAuth,
    toggleAffected,
    toggleFollow,
    updateStatus,
    verifyResolution,
    comments,
    addComment,
    statusHistory,
    getDepartmentById,
    getLocationById,
    getCategoryById,
    getAssetById,
    reportIssueContent,
  } = useApp();

  const [commentText, setCommentText] = useState('');
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState<'spam' | 'duplicate' | 'inappropriate' | 'misleading' | 'other'>('spam');
  const [flagDetails, setFlagDetails] = useState('');

  React.useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoadingAuth, router]);

  if (isLoadingAuth || !currentUser) {
    return (
      <div className="min-h-screen bg-[#060813] flex items-center justify-center text-purple-400">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const issue = issues.find((i) => i.id === issueId);
  const issueComments = comments[issueId] || [];
  const historyList = statusHistory[issueId] || [];

  if (!issue) {
    return (
      <div className="min-h-screen bg-[#060813] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
          <h2 className="text-xl font-bold">Issue Not Found</h2>
          <p className="text-sm text-slate-400 mt-1">The requested issue #{issueId} could not be located.</p>
          <Link
            href="/"
            className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white"
          >
            Back to All Issues
          </Link>
        </div>
      </div>
    );
  }

  const dept = getDepartmentById(issue.departmentId);
  const loc = getLocationById(issue.locationId);
  const cat = getCategoryById(issue.categoryId);
  const asset = getAssetById(issue.assetId);

  const isAffected = issue.affectedUserIds.includes(currentUser.id);
  const isReporter = currentUser.id === issue.reporterId;
  const isOfficialOrAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'OFFICIAL' || currentUser.role === 'SUPER_ADMIN';

  const handleUpvote = () => {
    if (!isAffected) {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
    }
    toggleAffected(issue.id);
  };

  const handleVerify = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#6ee7b7'],
    });
    verifyResolution(issue.id);
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(issue.id, commentText.trim());
    setCommentText('');
  };

  const handleFlagContent = (e: React.FormEvent) => {
    e.preventDefault();
    reportIssueContent(issue.id, flagReason, flagDetails);
    setIsFlagModalOpen(false);
    alert('Thank you. Content has been flagged for moderator review.');
  };

  return (
    <div className="min-h-screen bg-[#060813] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Top bar with back link & Flag button */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Live Issues
          </Link>

          <button
            onClick={() => setIsFlagModalOpen(true)}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Report Content</span>
          </button>
        </div>

        {/* Issue Main Header Card */}
        <div className="rounded-3xl glass-panel p-6 sm:p-8 mb-6 border border-indigo-500/20 shadow-2xl relative overflow-hidden">
          
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex-1">
              
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2.5 mb-3">
                <span className="text-xs font-bold text-purple-300 bg-purple-950/60 px-3 py-1 rounded-lg border border-purple-800/40">
                  {cat?.name || 'Asset Issue'}
                </span>
                <StatusBadge status={issue.status} size="lg" />
                <PriorityBadge priority={issue.priority} size="md" />
                <ModerationBadge status={issue.moderationStatus} />
                <span className="text-xs text-slate-400">ID: #{issue.id}</span>
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white leading-tight tracking-tight">
                {issue.title}
              </h1>

              {/* Reporter Info */}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Reported by <strong className="text-slate-200">{issue.reporterName}</strong> ({issue.reporterRole})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{new Date(issue.createdAt).toLocaleDateString()} at {new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

            </div>

            {/* Upvote & Quick Actions */}
            <div className="flex items-center gap-3 self-start">
              <button
                onClick={handleUpvote}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-lg ${
                  isAffected
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-105'
                    : 'bg-slate-900/90 text-slate-300 hover:text-purple-300 hover:bg-purple-950/50 border border-indigo-950 hover:border-purple-500/40'
                }`}
              >
                <ThumbsUp className={`w-4 h-4 ${isAffected ? 'fill-current' : ''}`} />
                <span>{isAffected ? "I'm Affected" : "I'm Affected Too"}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                  isAffected ? 'bg-black/30 text-white' : 'bg-slate-800 text-purple-300'
                }`}>
                  {issue.affectedUserIds.length}
                </span>
              </button>
            </div>
          </div>

          {/* Location & Department Summary Box */}
          <div className="mt-6 p-4 rounded-2xl bg-[#080c1e]/80 border border-indigo-950 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-purple-400" /> Department
              </span>
              <p className="font-semibold text-slate-200 mt-0.5">{dept?.name} ({dept?.code})</p>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Location / Room
              </span>
              <p className="font-semibold text-slate-200 mt-0.5">
                {loc?.building} &bull; {loc?.room}
              </p>
              {issue.locationDetails && (
                <p className="text-[11px] text-indigo-300/80 mt-0.5 font-medium">{issue.locationDetails}</p>
              )}
            </div>

            <div>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Box className="w-3.5 h-3.5 text-cyan-400" /> Registered Asset
              </span>
              {asset ? (
                <p className="font-semibold text-cyan-300 mt-0.5 truncate">
                  [{asset.assetTag}] {asset.name}
                </p>
              ) : (
                <p className="text-slate-400 mt-0.5 italic">General Room Fixture</p>
              )}
            </div>
          </div>

        </div>

        {/* AI INTELLIGENCE ANALYSIS CARD (Gemini 2.5 Flash) */}
        {issue.aiAnalysis && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/20 border border-purple-500/30 p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                <Bot className="w-4 h-4 text-purple-400" />
                <span>AI Triage & Reasoning (Gemini 2.5 Flash)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30 font-semibold">
                Confidence: {Math.round(issue.aiAnalysis.confidence * 100)}%
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {issue.aiAnalysis.reasoning}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-slate-400">
              <span>Suggested Dept: <strong className="text-slate-200">{issue.aiAnalysis.suggestedDepartment}</strong></span>
              <span>&bull;</span>
              <span>Spam Risk: <strong className="text-emerald-400">Low ({(issue.aiAnalysis.spamScore * 100).toFixed(0)}%)</strong></span>
            </div>
          </div>
        )}

        {/* OFFICIAL / ADMIN ACTION BAR */}
        {isOfficialOrAdmin && (
          <div className="mb-6 p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                <span>Official / Admin Action Controls</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Dispatch technicians or submit completion proof for verification.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {issue.status !== 'IN_PROGRESS' && issue.status !== 'RESOLUTION_SUBMITTED' && issue.status !== 'VERIFIED' && (
                <button
                  onClick={() => updateStatus(issue.id, 'IN_PROGRESS', 'Official initiated work')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md transition-colors"
                >
                  Start Work (In Progress)
                </button>
              )}

              {issue.status !== 'RESOLUTION_SUBMITTED' && issue.status !== 'VERIFIED' && (
                <button
                  onClick={() => setIsResolutionModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Submit Resolution Proof
                </button>
              )}
            </div>
          </div>
        )}

        {/* RESOLUTION SUBMITTED / VERIFY / DISPUTE WORKFLOW */}
        {(issue.status === 'RESOLUTION_SUBMITTED' || issue.status === 'VERIFIED') && issue.resolutionProof && (
          <div className="mb-6 rounded-3xl bg-emerald-950/30 border border-emerald-500/40 p-6 shadow-xl">
            <div className="flex flex-col md:flex-row items-start justify-between gap-6">
              
              <div className="flex-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {issue.status === 'VERIFIED' ? 'Fix Confirmed & Verified' : 'Resolution Submitted with Proof'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {issue.resolutionProof.notes}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-emerald-300/80">
                  <span>Submitted by: <strong>{issue.resolutionProof.resolvedByName}</strong></span>
                  <span>&bull;</span>
                  <span>Date: {new Date(issue.resolutionProof.resolvedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Uploaded Proof Photo */}
              <div className="shrink-0">
                <p className="text-[11px] font-semibold text-emerald-300 mb-1.5">Official Completion Evidence:</p>
                <div className="relative w-48 h-32 rounded-xl overflow-hidden border border-emerald-500/40 shadow-md">
                  <img
                    src={issue.resolutionProof.imageUrl}
                    alt="Resolution Proof"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                    <span className="text-[10px] text-white font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Visual Proof
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* If status is RESOLUTION_SUBMITTED, show Accept / Dispute actions */}
            {issue.status === 'RESOLUTION_SUBMITTED' && (
              <div className="mt-6 pt-4 border-t border-emerald-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-black/30 -mx-6 -mb-6 p-4 rounded-b-3xl">
                <div>
                  <p className="text-xs font-bold text-white">Student / Reporter Accountability Check</p>
                  <p className="text-[11px] text-slate-300">
                    Has this infrastructure problem been completely resolved?
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleVerify}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verify & Accept Fix
                  </button>
                  <button
                    onClick={() => setIsReopenModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-xs font-bold text-rose-200 border border-rose-500/40 flex items-center gap-1.5"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    Dispute / Reopen
                  </button>
                </div>
              </div>
            )}

            {/* If VERIFIED */}
            {issue.status === 'VERIFIED' && (
              <div className="mt-4 pt-3 border-t border-emerald-900/40 flex items-center justify-between text-xs text-emerald-300 font-medium">
                <span>Verified by Campus Community on {new Date(issue.verifiedAt || issue.updatedAt).toLocaleDateString()}</span>
                <button
                  onClick={() => setIsReopenModalOpen(true)}
                  className="text-[11px] text-slate-400 hover:text-rose-400 underline"
                >
                  Problem recurring? Reopen
                </button>
              </div>
            )}

          </div>
        )}

        {/* REOPENED BANNER */}
        {issue.status === 'REOPENED' && (
          <div className="mb-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 p-5 shadow-lg flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-rose-300">Resolution Disputed / Reopened</h4>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                {issue.reopenHistory?.[0]?.reason || 'The issue was marked resolved previously, but symptoms recurred.'}
              </p>
              <p className="text-[11px] text-rose-300/70 mt-2">
                Disputed by {issue.reopenHistory?.[0]?.reopenedByName || 'Reporter'} &bull; Re-escalated to maintenance queue.
              </p>
            </div>
          </div>
        )}

        {/* Main Grid: Details + Timeline & Discussion */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Problem Details & Diagnostics */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Description Card */}
            <div className="rounded-2xl glass-panel p-6 border border-indigo-500/20">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Problem Symptoms & Observations
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {issue.description}
              </p>

              {/* Photo attachments */}
              {issue.attachments && issue.attachments.length > 0 && (
                <div className="mt-5 pt-4 border-t border-indigo-950/80">
                  <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    Reported Photo Evidence:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {issue.attachments.map((imgUrl, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden border border-indigo-950/80 aspect-video">
                        <img src={imgUrl} alt="Evidence" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Diagnostic Insights (Cause & Proposed Solution) */}
            {(issue.possibleCause || issue.suggestedSolution || issue.occurredAt) && (
              <div className="rounded-2xl glass-panel p-6 border border-indigo-500/20 space-y-4">
                <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-purple-400" />
                  Diagnostic Hypotheses & Reporter Notes
                </h3>

                {issue.possibleCause && (
                  <div className="p-3.5 rounded-xl bg-[#090e24] border border-indigo-950/80">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" /> Hypothesized Possible Cause:
                    </span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{issue.possibleCause}</p>
                  </div>
                )}

                {issue.suggestedSolution && (
                  <div className="p-3.5 rounded-xl bg-[#090e24] border border-indigo-950/80">
                    <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Proposed Action / Suggestion:
                    </span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{issue.suggestedSolution}</p>
                  </div>
                )}

                {issue.occurredAt && (
                  <p className="text-[11px] text-slate-400">
                    First observed / occurred: <strong className="text-slate-300">{issue.occurredAt}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Discussion & Comments */}
            <div className="rounded-2xl glass-panel p-6 border border-indigo-500/20">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Community Discussion & Updates ({issueComments.length})
              </h3>

              {/* Comment Input */}
              <form onSubmit={handlePostComment} className="mb-6">
                <div className="relative">
                  <textarea
                    rows={2}
                    placeholder="Add an update, additional symptom, or comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full p-3 pr-24 rounded-xl bg-[#070a1a] border border-indigo-950 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none resize-none leading-relaxed"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 bottom-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 flex items-center gap-1 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    Post
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Posting as {currentUser.name} ({currentUser.role})
                </span>
              </form>

              {/* Comments Feed */}
              <div className="space-y-3">
                {issueComments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No comments yet. Be the first to share an update!</p>
                ) : (
                  issueComments.map((cmt) => (
                    <div key={cmt.id} className="p-3.5 rounded-xl bg-[#070a1a]/80 border border-indigo-950/60">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">{cmt.authorName}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            cmt.authorRole === 'ADMIN'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/40'
                              : cmt.authorRole === 'OFFICIAL'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/40'
                              : 'bg-purple-950 text-purple-300'
                          }`}>
                            {cmt.authorRole}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">{new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{cmt.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Status History & State Machine Stepper */}
          <div className="space-y-6">
            
            {/* Status History Stepper */}
            <div className="rounded-2xl glass-panel p-6 border border-indigo-500/20">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                Status History & Audit Log
              </h3>

              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-950">
                {historyList.map((item, idx) => (
                  <div key={item.id} className="relative pl-7 text-xs">
                    {/* Stepper Dot */}
                    <div className="absolute left-1.5 top-1 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-purple-600 border-2 border-[#0b0f22]" />

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-300">{item.toStatus}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">{item.reason}</p>
                    
                    <p className="text-[10px] text-slate-500 mt-1">
                      by {item.changedByName} ({item.changedByRole})
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Affected Campus Members List */}
            <div className="rounded-2xl glass-panel p-6 border border-indigo-500/20">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-indigo-400" />
                Affected Students & Staff ({issue.affectedUserIds.length})
              </h3>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                When multiple students mark themselves affected, this ticket receives higher urgency in the facilities queue.
              </p>
              <div className="flex items-center -space-x-2 overflow-hidden py-1">
                {issue.affectedUserIds.map((userId, idx) => (
                  <div
                    key={idx}
                    className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 border-2 border-[#090e24] flex items-center justify-center text-xs font-bold text-white shadow-sm"
                    title={`User ID: ${userId}`}
                  >
                    {idx === 0 ? 'A' : idx === 1 ? 'P' : 'U'}
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Resolution Proof Modal */}
      <ResolutionProofModal
        issueId={issue.id}
        issueTitle={issue.title}
        isOpen={isResolutionModalOpen}
        onClose={() => setIsResolutionModalOpen(false)}
      />

      {/* Reopen Modal */}
      <ReopenModal
        issueId={issue.id}
        issueTitle={issue.title}
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
      />

      {/* Content Moderation Flag Modal */}
      {isFlagModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0b0f22] border border-rose-500/30 rounded-2xl shadow-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Flag className="w-4 h-4 text-rose-400" />
              Report Inappropriate or Duplicate Content
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Help maintain community integrity. Reported content will be sent to the moderator queue.
            </p>

            <form onSubmit={handleFlagContent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason</label>
                <select
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value as any)}
                  className="w-full p-2 rounded-xl bg-[#060a17] border border-slate-800 text-xs text-slate-200 outline-none"
                >
                  <option value="spam">Spam / Advertising</option>
                  <option value="duplicate">Duplicate of an existing issue</option>
                  <option value="inappropriate">Inappropriate / Offensive Language</option>
                  <option value="misleading">Misleading or inaccurate report</option>
                  <option value="other">Other policy violation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Additional Context (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Explain why this content violates policy..."
                  value={flagDetails}
                  onChange={(e) => setFlagDetails(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#060a17] border border-slate-800 text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFlagModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md"
                >
                  Submit Flag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
