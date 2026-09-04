'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export type BackgroundVariant = 'fusion' | 'emerald' | 'linear';

interface AmbientBackgroundProps {
  variant?: BackgroundVariant;
  className?: string;
}

interface Particle {
  id: number;
  top: string;
  left: string;
  size: number;
  duration: string;
  delay: string;
  driftX: string;
  fusionColor: string;
  emeraldColor: string;
  linearColor: string;
}

// 14 deterministic, SSR-safe particles to prevent hydration mismatches
const TELEMETRY_PARTICLES: Particle[] = [
  { id: 1, top: '14%', left: '16%', size: 2, duration: '19s', delay: '0s', driftX: '14px', fusionColor: 'bg-blue-400', emeraldColor: 'bg-emerald-400', linearColor: 'bg-zinc-300' },
  { id: 2, top: '24%', left: '78%', size: 1.5, duration: '23s', delay: '2s', driftX: '-16px', fusionColor: 'bg-amber-400', emeraldColor: 'bg-teal-300', linearColor: 'bg-zinc-400' },
  { id: 3, top: '38%', left: '32%', size: 2.5, duration: '17s', delay: '5s', driftX: '20px', fusionColor: 'bg-blue-500', emeraldColor: 'bg-emerald-300', linearColor: 'bg-zinc-200' },
  { id: 4, top: '56%', left: '85%', size: 1.5, duration: '25s', delay: '1s', driftX: '-12px', fusionColor: 'bg-cyan-400', emeraldColor: 'bg-emerald-400', linearColor: 'bg-zinc-300' },
  { id: 5, top: '68%', left: '18%', size: 2, duration: '21s', delay: '4s', driftX: '18px', fusionColor: 'bg-amber-400', emeraldColor: 'bg-teal-400', linearColor: 'bg-zinc-400' },
  { id: 6, top: '18%', left: '50%', size: 1.5, duration: '20s', delay: '3s', driftX: '-10px', fusionColor: 'bg-blue-400', emeraldColor: 'bg-emerald-300', linearColor: 'bg-zinc-300' },
  { id: 7, top: '48%', left: '62%', size: 2, duration: '24s', delay: '6s', driftX: '15px', fusionColor: 'bg-cyan-300', emeraldColor: 'bg-teal-300', linearColor: 'bg-zinc-200' },
  { id: 8, top: '82%', left: '44%', size: 1.5, duration: '18s', delay: '7s', driftX: '-14px', fusionColor: 'bg-blue-400', emeraldColor: 'bg-emerald-400', linearColor: 'bg-zinc-400' },
  { id: 9, top: '32%', left: '92%', size: 2, duration: '22s', delay: '2.5s', driftX: '16px', fusionColor: 'bg-amber-300', emeraldColor: 'bg-teal-400', linearColor: 'bg-zinc-300' },
  { id: 10, top: '12%', left: '65%', size: 1.5, duration: '26s', delay: '4.5s', driftX: '-18px', fusionColor: 'bg-blue-500', emeraldColor: 'bg-emerald-300', linearColor: 'bg-zinc-200' },
  { id: 11, top: '75%', left: '12%', size: 2, duration: '20s', delay: '1.5s', driftX: '12px', fusionColor: 'bg-cyan-400', emeraldColor: 'bg-emerald-400', linearColor: 'bg-zinc-400' },
  { id: 12, top: '88%', left: '72%', size: 1.5, duration: '22s', delay: '3.5s', driftX: '-15px', fusionColor: 'bg-amber-400', emeraldColor: 'bg-teal-300', linearColor: 'bg-zinc-300' },
  { id: 13, top: '62%', left: '40%', size: 2, duration: '19s', delay: '5.5s', driftX: '14px', fusionColor: 'bg-blue-400', emeraldColor: 'bg-emerald-300', linearColor: 'bg-zinc-200' },
  { id: 14, top: '26%', left: '26%', size: 1.5, duration: '24s', delay: '0.8s', driftX: '-12px', fusionColor: 'bg-cyan-300', emeraldColor: 'bg-teal-400', linearColor: 'bg-zinc-400' },
];

export function AmbientBackground({ variant, className = '' }: AmbientBackgroundProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPointerActive, setIsPointerActive] = useState(false);
  const pointerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-deduce theme variant if not explicitly provided
  const activeVariant: BackgroundVariant = variant || (
    pathname?.startsWith('/assets') ? 'emerald' :
    pathname?.startsWith('/admin') ? 'linear' :
    'fusion'
  );

  useEffect(() => {
    let animationFrameId: number | null = null;

    const handlePointerMove = (e: PointerEvent) => {
      // Throttle DOM updates with requestAnimationFrame
      if (animationFrameId !== null) return;

      animationFrameId = requestAnimationFrame(() => {
        if (containerRef.current) {
          const x = `${(e.clientX / window.innerWidth) * 100}%`;
          const y = `${(e.clientY / window.innerHeight) * 100}%`;
          containerRef.current.style.setProperty('--mouse-x', x);
          containerRef.current.style.setProperty('--mouse-y', y);
        }
        animationFrameId = null;
      });

      setIsPointerActive(true);
      if (pointerTimerRef.current) clearTimeout(pointerTimerRef.current);
      pointerTimerRef.current = setTimeout(() => {
        setIsPointerActive(false);
      }, 2500);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      if (pointerTimerRef.current) clearTimeout(pointerTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none z-0 ${className}`}
      style={{
        '--mouse-x': '50%',
        '--mouse-y': '35%',
      } as React.CSSProperties}
    >
      {/* ─── Layer 0: Deep Atmospheric Ambient Glowing Orbs ─────────────────── */}
      {activeVariant === 'fusion' && (
        <>
          <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-gradient-to-tr from-blue-600/18 via-blue-900/15 to-transparent rounded-full blur-[120px] animate-float-slow animate-pulse-glow" />
          <div className="absolute top-1/2 right-0 w-[550px] h-[550px] bg-gradient-to-bl from-amber-600/12 via-slate-800/15 to-transparent rounded-full blur-[130px] animate-float-reverse animate-pulse-glow" />
          <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] animate-pulse-glow" />
        </>
      )}

      {activeVariant === 'emerald' && (
        <>
          <div className="absolute top-10 left-10 w-[520px] h-[520px] bg-gradient-to-tr from-emerald-600/18 via-teal-900/15 to-transparent rounded-full blur-[120px] animate-float-slow animate-pulse-glow" />
          <div className="absolute top-1/2 right-0 w-[550px] h-[550px] bg-gradient-to-bl from-teal-600/14 via-slate-800/15 to-transparent rounded-full blur-[130px] animate-float-reverse animate-pulse-glow" />
          <div className="absolute bottom-10 left-1/4 w-[420px] h-[420px] bg-emerald-700/12 rounded-full blur-[100px] animate-pulse-glow" />
        </>
      )}

      {activeVariant === 'linear' && (
        <>
          <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-zinc-700/10 rounded-full blur-[140px] animate-float-slow" />
          <div className="absolute top-1/2 right-0 w-[550px] h-[550px] bg-zinc-800/12 rounded-full blur-[150px] animate-float-reverse" />
          <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-zinc-900/20 rounded-full blur-[120px]" />
        </>
      )}

      {/* ─── Layer 1: Precision Telemetry Dot Matrix Grid ───────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.45] transition-opacity duration-1000"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          maskImage: 'radial-gradient(ellipse 90% 75% at 50% 35%, black 35%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 75% at 50% 35%, black 35%, transparent 95%)',
        }}
      />

      {/* ─── Layer 2: Ambient Interactive / Floating Spotlight ──────────────── */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          isPointerActive ? 'opacity-100' : 'opacity-85 animate-ambient-drift'
        }`}
        style={{
          background:
            activeVariant === 'fusion'
              ? 'radial-gradient(650px circle at var(--mouse-x) var(--mouse-y), rgba(37, 99, 235, 0.09) 0%, rgba(245, 158, 11, 0.035) 45%, transparent 75%)'
              : activeVariant === 'emerald'
              ? 'radial-gradient(650px circle at var(--mouse-x) var(--mouse-y), rgba(16, 185, 129, 0.09) 0%, rgba(20, 184, 166, 0.035) 45%, transparent 75%)'
              : 'radial-gradient(650px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.05) 0%, rgba(161, 161, 170, 0.025) 45%, transparent 75%)',
        }}
      />

      {/* ─── Layer 3: Slow Telemetry Scan Line ──────────────────────────────── */}
      <div
        className="absolute left-0 right-0 h-28 animate-telemetry-scan pointer-events-none"
        style={{
          background:
            activeVariant === 'fusion'
              ? 'linear-gradient(to bottom, transparent, rgba(37, 99, 235, 0.03) 60%, rgba(96, 165, 250, 0.08) 98%, rgba(147, 197, 253, 0.16) 100%)'
              : activeVariant === 'emerald'
              ? 'linear-gradient(to bottom, transparent, rgba(5, 150, 105, 0.03) 60%, rgba(16, 185, 129, 0.08) 98%, rgba(110, 231, 183, 0.16) 100%)'
              : 'linear-gradient(to bottom, transparent, rgba(161, 161, 170, 0.02) 60%, rgba(228, 228, 231, 0.06) 98%, rgba(255, 255, 255, 0.12) 100%)',
          boxShadow:
            activeVariant === 'fusion'
              ? '0 1px 0 0 rgba(147, 197, 253, 0.2)'
              : activeVariant === 'emerald'
              ? '0 1px 0 0 rgba(110, 231, 183, 0.2)'
              : '0 1px 0 0 rgba(255, 255, 255, 0.15)',
        }}
      />

      {/* ─── Layer 4: Floating Micro-Telemetry Particles (Dust Motes) ────────── */}
      <div className="absolute inset-0">
        {TELEMETRY_PARTICLES.map((p) => {
          const color =
            activeVariant === 'fusion'
              ? p.fusionColor
              : activeVariant === 'emerald'
              ? p.emeraldColor
              : p.linearColor;

          return (
            <span
              key={p.id}
              className={`absolute rounded-full animate-dust ${color} shadow-sm`}
              style={{
                top: p.top,
                left: p.left,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDelay: p.delay,
                '--dust-duration': p.duration,
                '--drift-x': p.driftX,
              } as React.CSSProperties}
            />
          );
        })}
      </div>
    </div>
  );
}
