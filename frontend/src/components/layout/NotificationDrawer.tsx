'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import { X, Bell, Check, CheckCheck, AlertCircle, RefreshCw, MessageSquare, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'ISSUE_CREATED':
        return <AlertCircle className="w-4 h-4 text-cyan-400" />;
      case 'STATUS_CHANGED':
        return <RefreshCw className="w-4 h-4 text-indigo-400" />;
      case 'REOPENED':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'COMMENT':
        return <MessageSquare className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0b0f22] border-l border-indigo-500/20 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-indigo-950/80 flex items-center justify-between bg-[#0e1329]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800/40">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">Campus Alerts & Updates</h3>
                <p className="text-xs text-indigo-300/70">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/30 transition-colors"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Bell className="w-10 h-10 mx-auto mb-3 text-slate-600 opacity-50" />
                <p className="text-sm">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    notif.read
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-75'
                      : 'bg-indigo-950/30 border-indigo-500/30 shadow-[0_0_15px_-3px_rgba(99,102,241,0.15)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="text-sm font-semibold text-slate-200 truncate">{notif.title}</h4>
                        {!notif.read && (
                          <button
                            onClick={() => markNotificationRead(notif.id)}
                            title="Mark as read"
                            className="text-slate-500 hover:text-indigo-400 p-0.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{notif.body}</p>
                      
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {notif.issueId && (
                          <Link
                            href={`/issues/${notif.issueId}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                          >
                            View Ticket <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
