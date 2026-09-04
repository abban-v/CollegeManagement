'use client';

import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  subMessage?: string;
  className?: string;
}

const sizeMap = {
  sm: { width: 40, height: 40 },
  md: { width: 64, height: 64 },
  lg: { width: 96, height: 96 },
  xl: { width: 128, height: 128 },
};

/**
 * Bespoke animated Campus Radar & Node Network SVG Loader.
 * Designed specifically for Slashforge campus infrastructure telemetry.
 */
export const CampusRadarLoader: React.FC<LoaderProps> = ({
  size = 'md',
  message,
  subMessage,
  className = '',
}) => {
  const { width, height } = sizeMap[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-3 select-none ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width, height }}>
        {/* Ambient background glow */}
        <div className="absolute inset-0 rounded-full bg-purple-600/20 blur-xl animate-pulse pointer-events-none" />

        <svg
          viewBox="0 0 100 100"
          className="w-full h-full text-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Radar sweep conic-like gradient */}
            <linearGradient id="radarSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>

            {/* Glowing ring stroke */}
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>

          {/* Concentric Grid Rings */}
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <circle
            cx="50"
            cy="50"
            r="32"
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="1.2"
          />
          <circle
            cx="50"
            cy="50"
            r="18"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />

          {/* Coordinate Crosshairs */}
          <line x1="50" y1="6" x2="50" y2="94" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
          <line x1="6" y1="50" x2="94" y2="50" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />

          {/* Rotating Outer Radar Sweep Arc */}
          <g className="origin-center animate-[spin_3s_linear_infinite]">
            <path
              d="M 50 50 L 50 6 A 44 44 0 0 1 94 50 Z"
              fill="url(#radarSweepGrad)"
            />
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="6"
              stroke="#e879f9"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>

          {/* Reverse Orbiting Telemetry Nodes */}
          <g className="origin-center animate-[spin_6s_linear_infinite_reverse]">
            {/* Campus Node 1 */}
            <circle cx="50" cy="18" r="3.5" fill="#a855f7" className="animate-ping origin-center" style={{ animationDuration: '2s' }} />
            <circle cx="50" cy="18" r="3" fill="#f0abfc" />

            {/* Campus Node 2 */}
            <circle cx="78" cy="65" r="2.5" fill="#818cf8" />
            
            {/* Campus Node 3 */}
            <circle cx="24" cy="60" r="2" fill="#38bdf8" />
          </g>

          {/* Core Institutional Center Node */}
          <circle cx="50" cy="50" r="5" fill="#6366f1" className="animate-pulse" />
          <circle cx="50" cy="50" r="2.5" fill="#ffffff" />
        </svg>
      </div>

      {(message || subMessage) && (
        <div className="text-center px-4 max-w-xs">
          {message && <p className="text-xs font-semibold text-slate-200 tracking-wide">{message}</p>}
          {subMessage && <p className="text-[11px] text-slate-400 mt-0.5">{subMessage}</p>}
        </div>
      )}
    </div>
  );
};

/**
 * Compact Dual-Ring SVG Spinner for buttons, headers, and inline badges.
 */
export const CompactPulseSpinner: React.FC<{ size?: number; className?: string }> = ({
  size = 16,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 animate-spin ${className}`}
    >
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="2.5"
      />
      <path
        d="M12 2.5C17.2467 2.5 21.5 6.75329 21.5 12C21.5 13.9169 20.9317 15.6989 19.9575 17.1843"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * AI Sentinel Pulse Loader for submission triage & image safety analysis.
 */
export const AiSentinelPulse: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center w-7 h-7 shrink-0 ${className}`}>
      <span className="absolute inline-flex h-full w-full rounded-full bg-purple-500/40 opacity-75 animate-ping" />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 text-purple-300 relative z-10 animate-pulse"
      >
        <path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill="currentColor"
          fillOpacity="0.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.5" fill="#ffffff" />
      </svg>
    </div>
  );
};
