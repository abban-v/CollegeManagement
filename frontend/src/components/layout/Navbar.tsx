'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { NotificationDrawer } from './NotificationDrawer';
import {
  ShieldAlert,
  Layers,
  Box,
  BarChart3,
  Bell,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Plus
} from 'lucide-react';

interface NavbarProps {
  onOpenReportModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenReportModal }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, notifications } = useApp();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navLinks = [
    { href: '/', label: 'Live Issues', icon: Layers },
    { href: '/assets', label: 'Campus Assets', icon: Box },
    ...(currentUser?.role === 'ADMIN' || currentUser?.role === 'OFFICIAL' || currentUser?.role === 'MODERATOR'
      ? [{ href: '/admin', label: 'Triage & Moderation', icon: BarChart3 }]
      : []),
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-indigo-950/80 bg-[#070915]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Logo */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] group-hover:scale-105 transition-transform">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-lg tracking-tight text-white">SLASH<span className="text-purple-400">FORGE</span></span>
                    <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                      CET
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 hidden sm:block">Campus Infrastructure & Resolution Portal</p>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-950/80 text-purple-300 border border-indigo-500/30 shadow-[0_0_12px_-2px_rgba(168,85,247,0.25)]'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              {/* Quick Report Button */}
              {onOpenReportModal && (
                <button
                  onClick={onOpenReportModal}
                  className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-[0_0_20px_rgba(124,58,237,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Report Issue
                </button>
              )}

              {/* Notification Bell */}
              <button
                onClick={() => setIsNotifOpen(true)}
                className="relative p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-950/40 transition-all"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[10px] font-bold text-white shadow-[0_0_10px_#a855f7]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* User Profile Menu */}
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 hover:border-purple-500/50 transition-all text-left shadow-sm"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-xs font-medium text-slate-200 truncate max-w-[120px]">{currentUser.name}</p>
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          currentUser.role === 'ADMIN' ? 'bg-amber-400' : currentUser.role === 'OFFICIAL' ? 'bg-indigo-400' : 'bg-emerald-400'
                        }`} />
                        <span className="text-[10px] uppercase tracking-wider text-purple-300 font-semibold">{currentUser.role}</span>
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isProfileMenuOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-56 rounded-xl bg-[#0d1228] border border-indigo-500/30 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                      onMouseLeave={() => setIsProfileMenuOpen(false)}
                    >
                      <div className="px-3 py-2 border-b border-indigo-950/80 mb-1.5">
                        <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                      </div>

                      <div className="space-y-1">
                        <Link
                          href="/"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800/60 transition-colors"
                        >
                          <Layers className="w-4 h-4 text-purple-400" />
                          <span>Campus Issues</span>
                        </Link>

                        <Link
                          href="/assets"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800/60 transition-colors"
                        >
                          <Box className="w-4 h-4 text-indigo-400" />
                          <span>Asset Registry</span>
                        </Link>

                        {(currentUser.role === 'ADMIN' || currentUser.role === 'OFFICIAL' || currentUser.role === 'MODERATOR') && (
                          <Link
                            href="/admin"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800/60 transition-colors"
                          >
                            <BarChart3 className="w-4 h-4 text-amber-400" />
                            <span>Triage & Moderation</span>
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-indigo-950/80 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-colors"
                >
                  Sign In
                </Link>
              )}

            </div>

          </div>
        </div>
      </header>

      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
};
