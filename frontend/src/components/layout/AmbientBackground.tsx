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

// 26 deterministic, SSR-safe dust particles with luminous aura
const DUST_PARTICLES: Particle[] = [
  { id: 1, top: '12%', left: '15%', size: 2.5, duration: '18s', delay: '0s', driftX: '14px', fusionColor: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]', emeraldColor: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]', linearColor: 'bg-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.7)]' },
  { id: 2, top: '22%', left: '76%', size: 2, duration: '22s', delay: '2s', driftX: '-16px', fusionColor: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]', emeraldColor: 'bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.8)]', linearColor: 'bg-zinc-300 shadow-[0_0_8px_rgba(228,228,231,0.7)]' },
  { id: 3, top: '34%', left: '28%', size: 3, duration: '16s', delay: '5s', driftX: '18px', fusionColor: 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.9)]', emeraldColor: 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]', linearColor: 'bg-zinc-100 shadow-[0_0_10px_rgba(255,255,255,0.8)]' },
  { id: 4, top: '54%', left: '84%', size: 2, duration: '24s', delay: '1s', driftX: '-12px', fusionColor: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]', emeraldColor: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]', linearColor: 'bg-zinc-300 shadow-[0_0_8px_rgba(228,228,231,0.7)]' },
  { id: 5, top: '65%', left: '16%', size: 2.5, duration: '20s', delay: '4s', driftX: '16px', fusionColor: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]', emeraldColor: 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]', linearColor: 'bg-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.7)]' },
  { id: 6, top: '16%', left: '48%', size: 2, duration: '19s', delay: '3s', driftX: '-10px', fusionColor: 'bg-blue-300 shadow-[0_0_8px_rgba(147,197,253,0.8)]', emeraldColor: 'bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]', linearColor: 'bg-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.7)]' },
  { id: 7, top: '45%', left: '60%', size: 3, duration: '23s', delay: '6s', driftX: '15px', fusionColor: 'bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]', emeraldColor: 'bg-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.9)]', linearColor: 'bg-zinc-100 shadow-[0_0_10px_rgba(255,255,255,0.8)]' },
  { id: 8, top: '80%', left: '42%', size: 2, duration: '17s', delay: '7s', driftX: '-14px', fusionColor: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]', emeraldColor: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]', linearColor: 'bg-zinc-300 shadow-[0_0_8px_rgba(228,228,231,0.7)]' },
  { id: 9, top: '30%', left: '90%', size: 2.5, duration: '21s', delay: '2.5s', driftX: '15px', fusionColor: 'bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.8)]', emeraldColor: 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]', linearColor: 'bg-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.7)]' },
  { id: 10, top: '10%', left: '62%', size: 2, duration: '25s', delay: '4.5s', driftX: '-16px', fusionColor: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]', emeraldColor: 'bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]', linearColor: 'bg-zinc-100 shadow-[0_0_8px_rgba(255,255,255,0.8)]' },
  { id: 11, top: '72%', left: '10%', size: 2.5, duration: '19s', delay: '1.5s', driftX: '12px', fusionColor: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]', emeraldColor: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]', linearColor: 'bg-zinc-300 shadow-[0_0_8px_rgba(228,228,231,0.7)]' },
  { id: 12, top: '86%', left: '70%', size: 2, duration: '22s', delay: '3.5s', driftX: '-14px', fusionColor: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]', emeraldColor: 'bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.8)]', linearColor: 'bg-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.7)]' },
  { id: 13, top: '58%', left: '38%', size: 3, duration: '18s', delay: '5.5s', driftX: '14px', fusionColor: 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.9)]', emeraldColor: 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]', linearColor: 'bg-zinc-100 shadow-[0_0_10px_rgba(255,255,255,0.8)]' },
  { id: 14, top: '24%', left: '24%', size: 2, duration: '23s', delay: '0.8s', driftX: '-12px', fusionColor: 'bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.8)]', emeraldColor: 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]', linearColor: 'bg-zinc-300 shadow-[0_0_8px_rgba(228,228,231,0.7)]' },
  { id: 15, top: '8%', left: '38%', size: 2, duration: '21s', delay: '3.2s', driftX: '11px', fusionColor: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]', emeraldColor: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]', linearColor: 'bg-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.7)]' },
  { id: 16, top: '40%', left: '8%', size: 2.5, duration: '20s', delay: '1.8s', driftX: '-13px', fusionColor: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]', emeraldColor: 'bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.8)]', linearColor: 'bg-zinc-300 shadow-[0_0_8px_rgba(228,228,231,0.7)]' },
  { id: 17, top: '50%', left: '50%', size: 3.5, duration: '17s', delay: '4.2s', driftX: '16px', fusionColor: 'bg-blue-300 shadow-[0_0_12px_rgba(147,197,253,0.95)]', emeraldColor: 'bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.95)]', linearColor: 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]' },
  { id: 18, top: '64%', left: '68%', size: 2, duration: '24s', delay: '6.5s', driftX: '-15px', fusionColor: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]', emeraldColor: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]', linearColor: 'bg-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.7)]' },
  { id: 19, top: '76%', left: '56%', size: 2.5, duration: '19s', delay: '2.8s', driftX: '13px', fusionColor: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]', emeraldColor: 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]', linearColor: 'bg-zinc-300 shadow-[0_0_8px_rgba(228,228,231,0.7)]' },
  { id: 20, top: '92%', left: '22%', size: 2, duration: '22s', delay: '5.1s', driftX: '-11px', fusionColor: 'bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.8)]', emeraldColor: 'bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]', linearColor: 'bg-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.7)]' },
  { id: 21, top: '18%', left: '88%', size: 2.5, duration: '20s', delay: '0.5s', driftX: '14px', fusionColor: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]', emeraldColor: 'bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.8)]', linearColor: 'bg-zinc-100 shadow-[0_0_8px_rgba(255,255,255,0.8)]' },
  { id: 22, top: '36%', left: '72%', size: 2, duration: '25s', delay: '3.8s', driftX: '-14px', fusionColor: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]', emeraldColor: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]', linearColor: 'bg-zinc-300 shadow-[0_0_8px_rgba(228,228,231,0.7)]' },
  { id: 23, top: '84%', left: '88%', size: 2.5, duration: '18s', delay: '6.1s', driftX: '12px', fusionColor: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]', emeraldColor: 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]', linearColor: 'bg-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.7)]' },
  { id: 24, top: '94%', left: '52%', size: 2, duration: '21s', delay: '1.2s', driftX: '-15px', fusionColor: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]', emeraldColor: 'bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]', linearColor: 'bg-zinc-100 shadow-[0_0_8px_rgba(255,255,255,0.8)]' },
  { id: 25, top: '4%', left: '80%', size: 2, duration: '23s', delay: '4.9s', driftX: '10px', fusionColor: 'bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.8)]', emeraldColor: 'bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.8)]', linearColor: 'bg-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.7)]' },
  { id: 26, top: '60%', left: '96%', size: 2, duration: '20s', delay: '2.2s', driftX: '-12px', fusionColor: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]', emeraldColor: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]', linearColor: 'bg-zinc-300 shadow-[0_0_8px_rgba(228,228,231,0.7)]' },
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

      {/* ─── Layer 1: Ambient Interactive / Floating Spotlight ──────────────── */}
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

      {/* ─── Layer 2: Floating Ambient Dust Particles ────────────────────────── */}
      <div className="absolute inset-0">
        {DUST_PARTICLES.map((p) => {
          const color =
            activeVariant === 'fusion'
              ? p.fusionColor
              : activeVariant === 'emerald'
              ? p.emeraldColor
              : p.linearColor;

          return (
            <span
              key={p.id}
              className={`absolute rounded-full animate-dust ${color}`}
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
