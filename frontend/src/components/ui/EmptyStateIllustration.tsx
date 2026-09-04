'use client';

import React from 'react';

interface EmptyStateProps {
  type?: 'issues' | 'search' | 'clean' | 'moderation';
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Handcrafted cyber-campus architectural blueprint SVG illustrations for empty states.
 */
export const EmptyStateIllustration: React.FC<EmptyStateProps> = ({
  type = 'issues',
  title = 'No Campus Issues Found',
  description = 'Everything in this section is operating normally.',
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 ${className}`}>
      {/* SVG Canvas Container */}
      <div className="relative w-44 h-44 sm:w-52 sm:h-52 mb-4 select-none">
        {/* Ambient Radial Glow */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-blue-600/20 via-emerald-600/15 to-amber-600/10 blur-2xl pointer-events-none" />

        {type === 'issues' && (
          <svg
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-xl"
          >
            {/* Campus Architectural Floor Grid */}
            <g stroke="#3b82f6" strokeOpacity="0.25" strokeWidth="1">
              <path d="M 30 140 L 100 180 L 170 140 L 100 100 Z" fill="#0f172a" fillOpacity="0.6" />
              <path d="M 50 128 L 120 168" strokeDasharray="3 3" />
              <path d="M 80 112 L 150 152" strokeDasharray="3 3" />
              <path d="M 65 160 L 135 120" strokeDasharray="3 3" />
            </g>

            {/* Central Tower / Node Station */}
            <path
              d="M 100 60 L 130 78 L 130 130 L 100 148 L 70 130 L 70 78 Z"
              fill="url(#towerGrad)"
              stroke="#3b82f6"
              strokeWidth="1.5"
            />
            {/* Tower Facet shading */}
            <path d="M 100 60 L 130 78 L 130 130 L 100 148 Z" fill="#2563eb" fillOpacity="0.15" />

            {/* Floating Signal Rings */}
            <circle cx="100" cy="55" r="16" stroke="#60a5fa" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="4 4" className="animate-spin origin-center" style={{ transformOrigin: '100px 55px', animationDuration: '12s' }} />
            <circle cx="100" cy="55" r="28" stroke="#3b82f6" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 4" className="animate-spin origin-center" style={{ transformOrigin: '100px 55px', animationDuration: '18s' }} />

            {/* Green Verified Beacon */}
            <circle cx="100" cy="55" r="6" fill="#10b981" className="animate-pulse" />
            <circle cx="100" cy="55" r="3" fill="#ecfdf5" />

            {/* Floating Satellite Nodes */}
            <g className="animate-bounce" style={{ animationDuration: '4s' }}>
              <rect x="42" y="70" width="14" height="14" rx="4" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.2" />
              <path d="M 45 77 L 53 77" stroke="#38bdf8" strokeWidth="1.5" />
            </g>

            <g className="animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }}>
              <rect x="144" y="85" width="14" height="14" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.2" />
              <path d="M 148 92 L 154 92" stroke="#fbbf24" strokeWidth="1.5" />
            </g>

            {/* Sparkle Nodes */}
            <circle cx="125" cy="38" r="1.5" fill="#93c5fd" className="animate-ping" style={{ animationDuration: '2.5s' }} />
            <circle cx="68" cy="48" r="2" fill="#a7f3d0" className="animate-ping" style={{ animationDuration: '3.2s' }} />

            <defs>
              <linearGradient id="towerGrad" x1="70" y1="60" x2="130" y2="148" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1e293b" />
                <stop offset="1" stopColor="#090d16" />
              </linearGradient>
            </defs>
          </svg>
        )}

        {type === 'search' && (
          <svg
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-xl"
          >
            {/* Search Radar Beam */}
            <circle cx="95" cy="95" r="50" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.4" strokeDasharray="6 6" />
            <circle cx="95" cy="95" r="30" stroke="#60a5fa" strokeWidth="1.5" strokeOpacity="0.5" />
            <circle cx="95" cy="95" r="10" fill="#2563eb" fillOpacity="0.2" />

            {/* Magnifying Glass Lens Frame */}
            <circle cx="95" cy="95" r="42" stroke="url(#searchGrad)" strokeWidth="4" />
            <line x1="126" y1="126" x2="165" y2="165" stroke="url(#searchGrad)" strokeWidth="6" strokeLinecap="round" />

            {/* Empty target ping */}
            <circle cx="95" cy="95" r="3" fill="#f59e0b" className="animate-ping" />
            <circle cx="95" cy="95" r="2" fill="#fff" />

            <defs>
              <linearGradient id="searchGrad" x1="60" y1="60" x2="165" y2="165" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60a5fa" />
                <stop offset="1" stopColor="#2563eb" />
              </linearGradient>
            </defs>
          </svg>
        )}

        {type === 'moderation' && (
          <svg
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-xl"
          >
            {/* Shield Outline */}
            <path
              d="M 100 35 L 145 55 C 145 110 100 155 100 155 C 100 155 55 110 55 55 Z"
              fill="#0f172a"
              stroke="url(#shieldGrad)"
              strokeWidth="2.5"
            />
            {/* Checkmark in Shield */}
            <path
              d="M 82 95 L 95 108 L 122 78"
              stroke="#10b981"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="shieldGrad" x1="55" y1="35" x2="145" y2="155" gradientUnits="userSpaceOnUse">
                <stop stopColor="#34d399" />
                <stop offset="1" stopColor="#2563eb" />
              </linearGradient>
            </defs>
          </svg>
        )}
      </div>

      {/* Title & Description */}
      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md leading-relaxed">{description}</p>

      {/* Optional CTA */}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
