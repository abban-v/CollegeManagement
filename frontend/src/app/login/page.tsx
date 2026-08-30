'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { ShieldAlert, LogIn, Mail, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleSignIn = () => {
    setIsSubmitting(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      loginWithGoogle('alex.rivera@campus.edu');
      router.push('/');
    }, 400);
  };

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);

    setTimeout(() => {
      login(email.trim(), password);
      router.push('/');
    }, 400);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-[#060813]">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-pink-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md">
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-[0_0_25px_rgba(124,58,237,0.5)] mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            SLASH<span className="text-purple-400">FORGE</span>
          </h1>
          <p className="text-xs text-indigo-300 font-medium tracking-wide uppercase mt-1">
            Campus Asset & Issue Management Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl glass-panel p-6 sm:p-8 shadow-2xl border border-indigo-500/20">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-white">Sign in to your account</h2>
            <p className="text-xs text-slate-400 mt-1">
              Authenticate via your college Google account or university ID
            </p>
          </div>

          {/* Google SSO Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs transition-all flex items-center justify-center gap-3 shadow-md hover:scale-[1.01] active:scale-[0.99] mb-5 cursor-pointer"
          >
            {/* Google G icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google (@campus.edu)</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-5">
            <div className="border-t border-indigo-950 w-full" />
            <span className="bg-[#0b0f24] px-3 text-[11px] text-slate-500 font-medium absolute">
              or university credentials
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                University Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="alex.rivera@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070a1a] border border-indigo-950 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <a href="#" className="text-[11px] text-indigo-400 hover:text-indigo-300">Forgot?</a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070a1a] border border-indigo-950 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-[0_0_20px_rgba(124,58,237,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Signing in...' : 'Sign In with University ID'}</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
