'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Plus,
  Menu,
  X
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navLinks = [
    { href: '/', label: 'Live Issues', icon: Layers },
    { href: '/assets', label: 'Campus Assets', icon: Box },
    ...(currentUser?.role === 'ADMIN'
      ? [{ href: '/admin', label: 'Admin Dashboard', icon: BarChart3 }]
      : currentUser?.role === 'OFFICIAL' || currentUser?.role === 'MODERATOR'
      ? [{ href: '/admin', label: 'Staff & Moderation', icon: BarChart3 }]
      : []),
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#09090b]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Logo */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-blue-500/30 bg-[#0e1017] shadow-[0_0_15px_rgba(37,99,235,0.3)] group-hover:scale-105 transition-transform flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="CET | CampusFix Logo"
                    width={40}
                    height={40}
                    className="w-full h-full object-contain p-0.5"
                    priority
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-lg tracking-tight text-white">
                      CET <span className="text-blue-400 font-light mx-0.5">|</span> <span className="text-blue-400">CampusFix</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 hidden sm:block uppercase tracking-wider font-semibold">Report • Track • Resolve</p>
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
                          ? 'bg-zinc-800 text-white border border-zinc-700 shadow-[0_0_12px_-2px_rgba(37,99,235,0.25)]'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-zinc-800/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
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
                  className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Report Issue
                </button>
              )}

              {/* Notification Bell */}
              <button
                onClick={() => setIsNotifOpen(true)}
                className="relative p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-slate-300 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-[0_0_10px_#2563eb]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* User Profile Menu */}
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all text-left shadow-sm"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-xs font-medium text-slate-200 truncate max-w-[120px]">{currentUser.name}</p>
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          currentUser.role === 'ADMIN' ? 'bg-amber-400' : currentUser.role === 'OFFICIAL' ? 'bg-blue-400' : 'bg-emerald-400'
                        }`} />
                        <span className="text-[10px] uppercase tracking-wider text-blue-300 font-semibold">{currentUser.role}</span>
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isProfileMenuOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-56 rounded-xl bg-[#121217] border border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                      onMouseLeave={() => setIsProfileMenuOpen(false)}
                    >
                      <div className="px-3 py-2 border-b border-zinc-800 mb-1.5">
                        <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                      </div>

                      <div className="space-y-1">
                        <Link
                          href="/"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-zinc-800/60 transition-colors"
                        >
                          <Layers className="w-4 h-4 text-blue-400" />
                          <span>Campus Issues</span>
                        </Link>

                        <Link
                          href="/assets"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-zinc-800/60 transition-colors"
                        >
                          <Box className="w-4 h-4 text-emerald-400" />
                          <span>Asset Registry</span>
                        </Link>

                        {(currentUser.role === 'ADMIN' || currentUser.role === 'OFFICIAL' || currentUser.role === 'MODERATOR') && (
                          <Link
                            href="/admin"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-zinc-800/60 transition-colors"
                          >
                            <BarChart3 className="w-4 h-4 text-amber-400" />
                            <span>{currentUser.role === 'ADMIN' ? 'Admin Dashboard' : 'Staff & Moderation'}</span>
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-zinc-800 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors cursor-pointer"
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
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile Quick Report Button */}
              {onOpenReportModal && (
                <button
                  onClick={onOpenReportModal}
                  className="sm:hidden inline-flex p-2.5 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.35)] active:scale-95 transition-transform"
                  title="Report Issue"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}

              {/* Mobile Hamburger Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-slate-300 hover:text-white hover:border-zinc-700 transition-all"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>

            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-[#09090b]/95 backdrop-blur-2xl px-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 shadow-2xl">
            <nav className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-zinc-800 text-white border border-zinc-700'
                        : 'text-slate-300 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            {onOpenReportModal && (
              <div className="pt-2 border-t border-zinc-800">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenReportModal();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md active:scale-98"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  Report Issue
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
};
