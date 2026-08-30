'use client';

import React from 'react';
import Link from 'next/link';
import { Issue } from '@/lib/types';
import { useApp } from '@/lib/store';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import confetti from 'canvas-confetti';
import {
  MapPin,
  Building2,
  ThumbsUp,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  User,
  Box,
  Image as ImageIcon,
} from 'lucide-react';

interface IssueCardProps {
  issue: Issue;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue }) => {
  const { currentUser, toggleAffected, getDepartmentById, getLocationById, getCategoryById, comments } = useApp();

  const dept = getDepartmentById(issue.departmentId);
  const loc = getLocationById(issue.locationId);
  const cat = getCategoryById(issue.categoryId);
  const issueComments = comments[issue.id] || [];

  const isAffected = currentUser ? issue.affectedUserIds.includes(currentUser.id) : false;
  const affectedCount = issue.affectedUserIds.length;

  const handleUpvote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Trigger festive mini confetti if upvoting
    if (!isAffected) {
      const rect = e.currentTarget.getBoundingClientRect();
      confetti({
        particleCount: 25,
        spread: 45,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
        colors: ['#a855f7', '#6366f1', '#ec4899'],
      });
    }
    
    toggleAffected(issue.id);
  };

  return (
    <div className="group relative rounded-2xl glass-panel glass-panel-hover p-5 flex flex-col justify-between overflow-hidden">
      {/* Top ambient color edge based on status */}
      <div 
        className={`absolute top-0 left-0 right-0 h-[2px] ${
          issue.status === 'VERIFIED' 
            ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
            : issue.status === 'RESOLUTION_SUBMITTED'
            ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
            : issue.status === 'REOPENED'
            ? 'bg-gradient-to-r from-rose-500 to-orange-500'
            : issue.status === 'IN_PROGRESS'
            ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
            : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
        }`} 
      />

      <div>
        {/* Header: Category, Status & Priority */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300/90 bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-800/30">
            <span className="truncate">{cat?.name || 'General Campus'}</span>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={issue.priority} />
            <StatusBadge status={issue.status} />
          </div>
        </div>

        {/* Title */}
        <Link href={`/issues/${issue.id}`} className="block group-hover:text-purple-300 transition-colors">
          <h3 className="text-base font-bold text-white leading-snug line-clamp-2 mb-2 group-hover:translate-x-0.5 transition-transform">
            {issue.title}
          </h3>
        </Link>

        {/* Description snippet */}
        <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
          {issue.description}
        </p>

        {/* Location & Dept Badges */}
        <div className="space-y-1.5 mb-4 text-xs text-slate-400 bg-[#070a1a]/60 p-2.5 rounded-xl border border-indigo-950/60">
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate font-medium">{loc?.building || 'Campus'} &bull; {loc?.room || issue.locationDetails}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">{dept?.name} ({dept?.code})</span>
          </div>
        </div>

        {/* Quick Highlights: Asset tag or Resolution proof marker */}
        {(issue.status === 'VERIFIED' || issue.status === 'RESOLUTION_SUBMITTED') && issue.resolutionProof && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-medium">{issue.status === 'VERIFIED' ? 'Verified Fix' : 'Proof Submitted'}</span>
            </div>
            <span className="text-[10px] text-emerald-400/80">by {issue.resolutionProof.resolvedByName.split(' ')[0]}</span>
          </div>
        )}

        {issue.status === 'REOPENED' && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate font-medium">Reopened: Problem still persists</span>
          </div>
        )}
      </div>

      {/* Footer / Interaction Bar */}
      <div className="pt-3 border-t border-indigo-950/80 flex items-center justify-between gap-3 text-xs">
        
        {/* Upvote / I'm Affected Button */}
        <button
          onClick={handleUpvote}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-medium transition-all ${
            isAffected
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-[1.03]'
              : 'bg-slate-900/80 text-slate-300 hover:text-purple-300 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/30'
          }`}
          title={isAffected ? "You've marked that you're also affected" : "Click if you are also facing this problem"}
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${isAffected ? 'fill-current' : ''}`} />
          <span>I&apos;m Affected</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            isAffected ? 'bg-black/30 text-white' : 'bg-slate-800 text-purple-300'
          }`}>
            {affectedCount}
          </span>
        </button>

        {/* Comments & View details */}
        <div className="flex items-center gap-3">
          {issueComments.length > 0 && (
            <div className="flex items-center gap-1 text-slate-400" title={`${issueComments.length} comments`}>
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-medium">{issueComments.length}</span>
            </div>
          )}

          <Link
            href={`/issues/${issue.id}`}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-purple-950/60 text-slate-300 hover:text-white border border-slate-800 hover:border-purple-500/40 transition-colors flex items-center gap-1 font-medium text-xs px-2.5"
          >
            <span>Details</span>
            <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
          </Link>
        </div>

      </div>
    </div>
  );
};
