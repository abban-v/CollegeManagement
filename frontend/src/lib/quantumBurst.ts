/**
 * Quantum Burst - High-Tech Action Feedback Effect
 * Replaces childish confetti with a sleek, futuristic laser shockwave
 * and high-velocity micro-spark burst.
 */

export type BurstVariant = 'cobalt' | 'emerald' | 'amber' | 'cyan';

export interface BurstOptions {
  x?: number; // clientX or center x coordinate
  y?: number; // clientY or center y coordinate
  variant?: BurstVariant;
  particleCount?: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: [number, number, number];
}

interface WaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
  delay: number;
  color: [number, number, number];
  lineWidth: number;
}

const PALETTES: Record<BurstVariant, [number, number, number][]> = {
  cobalt: [
    [59, 130, 246],  // Blue 500
    [96, 165, 250],  // Blue 400
    [147, 197, 253], // Blue 300
    [56, 189, 248],  // Cyan 400
    [245, 158, 11],  // Amber 500 accent
  ],
  emerald: [
    [16, 185, 129],  // Emerald 500
    [52, 211, 153],  // Emerald 400
    [110, 231, 183], // Emerald 300
    [20, 184, 166],  // Teal 500
    [45, 212, 191],  // Teal 400
  ],
  amber: [
    [245, 158, 11],  // Amber 500
    [251, 191, 36],  // Amber 400
    [252, 211, 77],  // Amber 300
    [249, 115, 22],  // Orange 500
  ],
  cyan: [
    [6, 182, 212],   // Cyan 500
    [34, 211, 238],  // Cyan 400
    [103, 232, 249], // Cyan 300
    [59, 130, 246],  // Blue 500
  ],
};

let activeCanvas: HTMLCanvasElement | null = null;
let activeCtx: CanvasRenderingContext2D | null = null;
let animationId: number | null = null;
let sparks: Spark[] = [];
let rings: WaveRing[] = [];

function ensureCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof window === 'undefined') return null;

  if (!activeCanvas || !document.body.contains(activeCanvas)) {
    activeCanvas = document.createElement('canvas');
    activeCanvas.style.position = 'fixed';
    activeCanvas.style.top = '0';
    activeCanvas.style.left = '0';
    activeCanvas.style.width = '100vw';
    activeCanvas.style.height = '100vh';
    activeCanvas.style.pointerEvents = 'none';
    activeCanvas.style.zIndex = '9999';
    document.body.appendChild(activeCanvas);
    activeCtx = activeCanvas.getContext('2d');
  }

  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (activeCanvas.width !== w * dpr || activeCanvas.height !== h * dpr) {
    activeCanvas.width = w * dpr;
    activeCanvas.height = h * dpr;
  }

  if (activeCtx) {
    activeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  return activeCtx ? { canvas: activeCanvas, ctx: activeCtx } : null;
}

function renderLoop() {
  if (!activeCtx || !activeCanvas) return;

  activeCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // Render & update concentric wave rings
  for (let i = rings.length - 1; i >= 0; i--) {
    const ring = rings[i];
    if (ring.delay > 0) {
      ring.delay -= 1;
      continue;
    }

    ring.radius += ring.speed;
    ring.alpha -= 0.028;

    if (ring.alpha <= 0 || ring.radius >= ring.maxRadius) {
      rings.splice(i, 1);
      continue;
    }

    activeCtx.save();
    activeCtx.beginPath();
    activeCtx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    activeCtx.strokeStyle = `rgba(${ring.color[0]}, ${ring.color[1]}, ${ring.color[2]}, ${ring.alpha})`;
    activeCtx.lineWidth = ring.lineWidth;
    activeCtx.shadowColor = `rgba(${ring.color[0]}, ${ring.color[1]}, ${ring.color[2]}, 0.8)`;
    activeCtx.shadowBlur = 10;
    activeCtx.stroke();
    activeCtx.restore();
  }

  // Render & update laser sparks
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];

    s.x += s.vx;
    s.y += s.vy;
    s.vx *= 0.90; // High-tech snappy deceleration
    s.vy *= 0.90;
    s.alpha -= s.decay;

    if (s.alpha <= 0) {
      sparks.splice(i, 1);
      continue;
    }

    activeCtx.save();
    activeCtx.beginPath();
    activeCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    activeCtx.fillStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, ${s.alpha})`;
    activeCtx.shadowColor = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, 0.9)`;
    activeCtx.shadowBlur = s.size * 3;
    activeCtx.fill();
    activeCtx.restore();
  }

  if (rings.length > 0 || sparks.length > 0) {
    animationId = requestAnimationFrame(renderLoop);
  } else {
    // Clear and remove canvas when all effects complete
    if (activeCanvas && document.body.contains(activeCanvas)) {
      activeCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      document.body.removeChild(activeCanvas);
      activeCanvas = null;
      activeCtx = null;
    }
    animationId = null;
  }
}

/**
 * Triggers an instant, high-tech energy pulse & spark shockwave
 * at the specified coordinates or viewport center.
 */
export function triggerQuantumBurst(options: BurstOptions = {}) {
  if (typeof window === 'undefined') return;

  // Check if reduced motion is preferred
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const target = ensureCanvas();
  if (!target) return;

  const originX = options.x !== undefined ? options.x : window.innerWidth / 2;
  const originY = options.y !== undefined ? options.y : window.innerHeight * 0.45;
  const variant = options.variant || 'cobalt';
  const palette = PALETTES[variant];
  const primaryColor = palette[0];
  const count = options.particleCount || 34;

  // 1. Primary Shockwave Ring
  rings.push({
    x: originX,
    y: originY,
    radius: 4,
    maxRadius: 150,
    speed: 7.5,
    alpha: 0.85,
    delay: 0,
    color: primaryColor,
    lineWidth: 2,
  });

  // 2. Secondary Echo Ring
  rings.push({
    x: originX,
    y: originY,
    radius: 2,
    maxRadius: 100,
    speed: 5.5,
    alpha: 0.55,
    delay: 3,
    color: palette[1] || primaryColor,
    lineWidth: 1.5,
  });

  // 3. Laser Micro-Sparks Burst (snappy 360-degree radial ejection)
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8.5 + 3.5;
    const color = palette[Math.floor(Math.random() * palette.length)];

    sparks.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 2 + 1.5, // 1.5px to 3.5px
      alpha: 1,
      decay: Math.random() * 0.025 + 0.028, // Dissipates in ~350-450ms
      color,
    });
  }

  // Start loop if not already running
  if (animationId === null) {
    animationId = requestAnimationFrame(renderLoop);
  }
}
