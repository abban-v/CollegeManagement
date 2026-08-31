'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { apiClient } from '@/lib/api';
import {
  ShieldAlert,
  AlertCircle,
  X,
  Lock,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { setUserFromAuthResponse } = useApp();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const isGoogleConfigured = Boolean(
    googleClientId &&
    !googleClientId.includes('YOUR_GOOGLE_CLIENT_ID') &&
    googleClientId.endsWith('.apps.googleusercontent.com')
  );

  // Load Google Identity Services client script
  useEffect(() => {
    if (!isGoogleConfigured) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [isGoogleConfigured]);

  // Trigger Google Sign-In with custom sleek button
  const handleGoogleSignInClick = () => {
    setErrorMessage(null);

    if (isGoogleConfigured && window.google) {
      try {
        setIsSubmitting(true);
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          hosted_domain: 'cet.ac.in',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              setErrorMessage(`Google Sign-In: ${tokenResponse.error_description || tokenResponse.error}`);
              setIsSubmitting(false);
              return;
            }
            if (tokenResponse.access_token) {
              try {
                // Fetch verified profile directly from Google
                const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const userData = await userRes.json();

                // Exchange with backend session API
                const authRes = await apiClient.googleAuth({
                  email: userData.email,
                  name: userData.name,
                  avatarUrl: userData.picture,
                });

                if (authRes.data) {
                  confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
                  setUserFromAuthResponse(authRes.data);
                  router.push('/');
                } else {
                  setErrorMessage(
                    authRes.error || 'Access restricted. Only official @cet.ac.in college accounts are permitted.'
                  );
                }
              } catch (err: any) {
                setErrorMessage(err.message || 'Authentication failed. Please check your network connection.');
              } finally {
                setIsSubmitting(false);
              }
            }
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch (e: any) {
        setIsSubmitting(false);
        setErrorMessage(e.message || 'Unable to open Google Sign-In window.');
      }
    } else {
      setShowSetupModal(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-[#060813] text-slate-100 selection:bg-purple-500/30">
      {/* Dynamic Glowing Idle Ambient Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-transparent rounded-full blur-[110px] pointer-events-none animate-float-slow animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/3 translate-y-1/3 w-[600px] h-[600px] bg-gradient-to-tl from-purple-700/30 via-pink-600/20 to-transparent rounded-full blur-[120px] pointer-events-none animate-float-reverse animate-pulse-glow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none animate-pulse-glow" />

      {/* Main Center Card */}
      <div className="relative z-10 w-full max-w-sm">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-[0_0_35px_rgba(124,58,237,0.5)] mb-3 border border-indigo-400/40 animate-float-slow">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            SLASH<span className="text-purple-400">FORGE</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            College of Engineering Trivandrum
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl glass-panel p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border border-indigo-500/30 backdrop-blur-2xl transition-all duration-300 hover:border-purple-500/50 hover:shadow-[0_0_40px_-5px_rgba(124,58,237,0.35)]">
          
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 text-[11px] font-semibold mb-2 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <Sparkles className="w-3 h-3" />
              Institutional Authentication
            </div>
            <h2 className="text-base font-bold text-white">Campus Sign In</h2>
            <p className="text-xs text-slate-400 mt-1">
              Use your official <span className="text-purple-300 font-semibold">@cet.ac.in</span> account
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/85 border border-rose-500/50 text-xs text-rose-200 flex items-start gap-2.5 shadow-[0_0_20px_rgba(244,63,94,0.25)] animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Custom Sleek Glowing Google Button */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={isSubmitting}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#0d132b] via-[#121a3b] to-[#0d132b] hover:from-[#151c42] hover:via-[#1c2454] hover:to-[#151c42] border border-indigo-500/40 hover:border-purple-500/80 text-slate-100 hover:text-white font-bold text-xs transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(99,102,241,0.25)] hover:shadow-[0_0_35px_rgba(168,85,247,0.5)] active:scale-[0.98] cursor-pointer group"
            >
              <svg className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
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
              <span className="tracking-wide">
                {isSubmitting ? 'Authenticating with Google...' : 'Continue with Google (@cet.ac.in)'}
              </span>
            </button>
          </div>

        </div>

        {/* Minimal Footer */}
        <p className="text-[11px] text-center text-slate-500 mt-6 tracking-wide">
          CET Campus Issue Management
        </p>

      </div>

      {/* Google SSO Setup Guidance Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0a0f24] border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-950">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Lock className="w-4 h-4 text-purple-400" />
                Google Client ID Required
              </div>
              <button
                onClick={() => setShowSetupModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <p>
                Add your Google OAuth Client ID to <code className="bg-black/50 px-1 py-0.5 rounded text-purple-300 font-mono">frontend/.env.local</code>:
              </p>
              <pre className="p-3 rounded-xl bg-black/70 border border-indigo-950 text-[11px] text-emerald-400 font-mono overflow-x-auto">
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
              </pre>
            </div>

            <button
              type="button"
              onClick={() => setShowSetupModal(false)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
