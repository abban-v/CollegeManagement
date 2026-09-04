import React from 'react';
import { IssueStatus, IssuePriority, ModerationStatus } from '@/lib/types';
import {
  AlertCircle,
  Clock,
  PlayCircle,
  XCircle,
  RefreshCcw,
  Flame,
  AlertTriangle,
  Info,
  Send,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

interface StatusBadgeProps {
  status: IssueStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  }[size];

  switch (status) {
    case 'REPORTED':
      return (
        <span className={`inline-flex items-center rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 ${sizeClasses}`}>
          <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
          Reported
        </span>
      );
    case 'UNDER_REVIEW':
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-950/70 text-amber-300 border border-amber-500/30 ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Under Review
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className={`inline-flex items-center rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/40 ${sizeClasses}`}>
          <PlayCircle className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          In Progress
        </span>
      );
    case 'RESOLUTION_SUBMITTED':
      return (
        <span className={`inline-flex items-center rounded-full bg-teal-950/90 text-teal-300 border border-teal-500/50 ${sizeClasses}`}>
          <Send className="w-3.5 h-3.5 text-teal-400" />
          Resolution Submitted
        </span>
      );
    case 'VERIFIED':
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 ${sizeClasses}`}>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Verified & Fixed
        </span>
      );
    case 'CLOSED':
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-900 text-slate-400 border border-slate-700 ${sizeClasses}`}>
          <XCircle className="w-3.5 h-3.5 text-slate-400" />
          Closed
        </span>
      );
    case 'REOPENED':
      return (
        <span className={`inline-flex items-center rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/40 ${sizeClasses}`}>
          <RefreshCcw className="w-3.5 h-3.5 text-rose-400" />
          Reopened / Disputed
        </span>
      );
    case 'DISPUTED':
      return (
        <span className={`inline-flex items-center rounded-full bg-orange-950/80 text-orange-300 border border-orange-500/40 ${sizeClasses}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          Disputed
        </span>
      );
    default:
      return null;
  }
};

interface PriorityBadgeProps {
  priority: IssuePriority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1 font-medium';

  switch (priority) {
    case 'CRITICAL':
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-red-950/60 text-red-400 border border-red-500/30 ${sizeClasses}`}>
          <Flame className="w-3 h-3 text-red-400" />
          Critical
        </span>
      );
    case 'HIGH':
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-orange-950/60 text-orange-400 border border-orange-500/30 ${sizeClasses}`}>
          <AlertTriangle className="w-3 h-3 text-orange-400" />
          High Priority
        </span>
      );
    case 'MEDIUM':
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-yellow-950/50 text-yellow-400 border border-yellow-500/20 ${sizeClasses}`}>
          <Clock className="w-3 h-3 text-yellow-400" />
          Medium
        </span>
      );
    case 'LOW':
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50 ${sizeClasses}`}>
          <Info className="w-3 h-3 text-slate-400" />
          Low
        </span>
      );
    default:
      return null;
  }
};

interface ModerationBadgeProps {
  status: ModerationStatus;
}

export const ModerationBadge: React.FC<ModerationBadgeProps> = ({ status }) => {
  if (status === 'NORMAL' || status === 'APPROVED') return null;

  if (status === 'FLAGGED' || status === 'UNDER_REVIEW') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-500/40 font-semibold">
        <ShieldAlert className="w-3 h-3 text-amber-400" />
        Flagged for Review
      </span>
    );
  }

  if (status === 'DUPLICATE') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700 font-semibold">
        Linked Duplicate
      </span>
    );
  }

  if (status === 'REMOVED') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-500/40 font-semibold">
        Removed by Policy
      </span>
    );
  }

  return null;
};
