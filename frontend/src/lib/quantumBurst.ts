/**
 * Cyberpunk Telemetry Fireworks & Hyperdrive Starlight Engine
 * 
 * Replaces childish paper confetti with an epic, futuristic celebration:
 * - Multi-stage aerial cyber fireworks with additive laser light streaks
 * - Cascading showers of glowing stardust embers that twinkle and drift
 * - Expanding sonic energy shockwave rings
 * - Core cinematic power flash that delivers a satisfying visual "kick"
 */

export type BurstVariant = 'cobalt' | 'emerald' | 'amber' | 'cyan';
export type BurstIntensity = 'celebration' | 'pulse';

export interface BurstOptions {
  x?: number; // Origin X (defaults to viewport center)
  y?: number; // Origin Y (defaults to viewport 42%)
  variant?: BurstVariant;
  intensity?: BurstIntensity; // 'celebration' for major events (login, reports), 'pulse' for micro-actions (upvotes)
  particleCount?: number;
}

interface LaserStreak {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  lineWidth: number;
  alpha: number;
  decay: number;
  color: [number, number, number];
}

interface StardustEmber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  wobble: number;
  wobbleSpeed: number;
  life: number;
  color: [number, number, number];
}

interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
  delay: number;
  lineWidth: number;
  color: [number, number, number];
}

interface PowerFlash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: [number, number, number];
}

const PALETTES: Record<BurstVariant, [number, number, number][]> = {
  cobalt: [
    [59, 130, 246],   // Electric Blue
    [96, 165, 250],   // Light Blue
    [34, 211, 238],   // Neon Cyan
    [147, 197, 253],  // Arctic Ice
    [255, 255, 255],  // Hot White
    [245, 158, 11],   // Amber Gold Spark
    [251, 191, 36],   // Bright Gold
  ],
  emerald: [
    [16, 185, 129],   // Forest Emerald
    [52, 211, 153],   // Mint Neon
    [110, 231, 183],  // Soft Mint
    [20, 184, 166],   // Neon Teal
    [45, 212, 191],   // Bright Teal
    [255, 255, 255],  // Hot White
    [251, 191, 36],   // Gold Spark
  ],
  amber: [
    [245, 158, 11],   // Amber Gold
    [251, 191, 36],   // Light Gold
    [252, 211, 77],   // Pale Gold
    [249, 115, 22],   // Neon Orange
    [255, 255, 255],  // Hot White
  ],
  cyan: [
    [6, 182, 212],    // Cyan
    [34, 211, 238],   // Electric Cyan
    [103, 232, 249],  // Pale Ice
    [59, 130, 246],   // Cobalt
    [255, 255, 255],  // White
  ],
};

let activeCanvas: HTMLCanvasElement | null = null;
let activeCtx: CanvasRenderingContext2D | null = null;
let animationId: number | null = null;

let streaks: LaserStreak[] = [];
let embers: StardustEmber[] = [];
let rings: ShockwaveRing[] = [];
let flashes: PowerFlash[] = [];

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
    activeCanvas.style.zIndex = '99999';
    document.body.appendChild(activeCanvas);
    activeCtx = activeCanvas.getContext('2d');
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

function spawnDetonation(
  x: number,
  y: number,
  palette: [number, number, number][],
  streakCount: number,
  emberCount: number,
  hasFlash: boolean,
  ringCount: number
) {
  const primaryColor = palette[0];

  // 1. Cinematic Power Flash (The initial "Kick")
  if (hasFlash) {
    flashes.push({
      x,
      y,
      radius: 15,
      maxRadius: 280,
      alpha: 0.8,
      color: primaryColor,
    });
  }

  // 2. Sonic Shockwave Rings
  for (let r = 0; r < ringCount; r++) {
    rings.push({
      x,
      y,
      radius: 6 + r * 4,
      maxRadius: 180 + r * 70,
      speed: 10 + r * 3,
      alpha: 0.9 - r * 0.2,
      delay: r * 3,
      lineWidth: 2.5 - r * 0.5,
      color: palette[r % palette.length],
    });
  }

  // 3. High-Velocity Laser Streaks with Motion Trails
  for (let i = 0; i < streakCount; i++) {
    const angle = (Math.PI * 2 * i) / streakCount + (Math.random() * 0.3 - 0.15);
    const speed = Math.random() * 11 + 7; // Fast initial rocket speed
    const color = palette[Math.floor(Math.random() * palette.length)];

    streaks.push({
      x,
      y,
      prevX: x,
      prevY: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      lineWidth: Math.random() * 2 + 1.5,
      alpha: 1,
      decay: Math.random() * 0.02 + 0.015, // ~60-80 frames
      color,
    });
  }

  // 4. Cascading Stardust Embers that Twinkle and Float Downward
  for (let j = 0; j < emberCount; j++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 7 + 1.5;
    const color = palette[Math.floor(Math.random() * palette.length)];

    embers.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5, // Slight upward arc
      size: Math.random() * 2.5 + 1.5,
      alpha: 1,
      decay: Math.random() * 0.007 + 0.005, // Floats for ~2.2-2.8 seconds
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.08 + 0.03,
      life: 0,
      color,
    });
  }
}

function renderLoop() {
  if (!activeCtx || !activeCanvas) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  activeCtx.clearRect(0, 0, w, h);

  // Set additive photonic blending for high-tech laser glow
  activeCtx.globalCompositeOperation = 'lighter';

  // ─── 1. Power Flashes (The Kick) ──────────────────────────────────────────
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i];
    f.radius += 24;
    f.alpha -= 0.085;

    if (f.alpha <= 0 || f.radius >= f.maxRadius) {
      flashes.splice(i, 1);
      continue;
    }

    const grad = activeCtx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
    grad.addColorStop(0, `rgba(255, 255, 255, ${f.alpha * 0.9})`);
    grad.addColorStop(0.3, `rgba(${f.color[0]}, ${f.color[1]}, ${f.color[2]}, ${f.alpha * 0.7})`);
    grad.addColorStop(1, `rgba(${f.color[0]}, ${f.color[1]}, ${f.color[2]}, 0)`);

    activeCtx.fillStyle = grad;
    activeCtx.beginPath();
    activeCtx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
    activeCtx.fill();
  }

  // ─── 2. Sonic Shockwave Rings ─────────────────────────────────────────────
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    if (r.delay > 0) {
      r.delay -= 1;
      continue;
    }

    r.radius += r.speed;
    r.alpha -= 0.024;

    if (r.alpha <= 0 || r.radius >= r.maxRadius) {
      rings.splice(i, 1);
      continue;
    }

    activeCtx.save();
    activeCtx.beginPath();
    activeCtx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    activeCtx.strokeStyle = `rgba(${r.color[0]}, ${r.color[1]}, ${r.color[2]}, ${r.alpha})`;
    activeCtx.lineWidth = r.lineWidth;
    activeCtx.shadowColor = `rgba(${r.color[0]}, ${r.color[1]}, ${r.color[2]}, 0.9)`;
    activeCtx.shadowBlur = 12;
    activeCtx.stroke();
    activeCtx.restore();
  }

  // ─── 3. Laser Streaks with Motion Trails ───────────────────────────────────
  for (let i = streaks.length - 1; i >= 0; i--) {
    const s = streaks[i];

    s.prevX = s.x;
    s.prevY = s.y;
    s.x += s.vx;
    s.y += s.vy;
    s.vx *= 0.91; // Snappy deceleration
    s.vy *= 0.91;
    s.alpha -= s.decay;

    if (s.alpha <= 0) {
      streaks.splice(i, 1);
      continue;
    }

    activeCtx.save();
    activeCtx.beginPath();
    activeCtx.moveTo(s.prevX, s.prevY);
    activeCtx.lineTo(s.x, s.y);
    activeCtx.strokeStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, ${s.alpha})`;
    activeCtx.lineWidth = s.lineWidth;
    activeCtx.lineCap = 'round';
    activeCtx.shadowColor = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, 0.95)`;
    activeCtx.shadowBlur = 8;
    activeCtx.stroke();
    activeCtx.restore();
  }

  // ─── 4. Cascading Stardust Embers (Graceful Floating Physics) ──────────────
  for (let i = embers.length - 1; i >= 0; i--) {
    const e = embers[i];

    e.life += 1;
    e.wobble += e.wobbleSpeed;
    e.x += e.vx + Math.sin(e.wobble) * 0.6;
    e.y += e.vy;
    e.vx *= 0.97;
    e.vy += 0.055; // Gentle cosmic gravity
    e.alpha -= e.decay;

    if (e.alpha <= 0 || e.y > h) {
      embers.splice(i, 1);
      continue;
    }

    // Shimmering twinkle modulation
    const twinkle = 0.7 + 0.3 * Math.sin(e.life * 0.25);
    const renderAlpha = Math.min(1, e.alpha * twinkle);

    activeCtx.save();
    activeCtx.beginPath();
    activeCtx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    activeCtx.fillStyle = `rgba(${e.color[0]}, ${e.color[1]}, ${e.color[2]}, ${renderAlpha})`;
    activeCtx.shadowColor = `rgba(${e.color[0]}, ${e.color[1]}, ${e.color[2]}, 0.9)`;
    activeCtx.shadowBlur = e.size * 4;
    activeCtx.fill();
    activeCtx.restore();
  }

  // Reset composite operation
  activeCtx.globalCompositeOperation = 'source-over';

  if (flashes.length > 0 || rings.length > 0 || streaks.length > 0 || embers.length > 0) {
    animationId = requestAnimationFrame(renderLoop);
  } else {
    // Cleanup canvas from DOM when all effects are complete
    if (activeCanvas && document.body.contains(activeCanvas)) {
      activeCtx.clearRect(0, 0, w, h);
      document.body.removeChild(activeCanvas);
      activeCanvas = null;
      activeCtx = null;
    }
    animationId = null;
  }
}

/**
 * Triggers an epic Cyberpunk Telemetry Fireworks & Light Streak display.
 * 
 * - Use `intensity: 'celebration'` for major milestones (Login, Ticket Submitted, Fix Verified, Asset Created).
 *   This launches a coordinated 3-stage cyber fireworks show that fills the viewport with laser trails and floating stardust!
 * - Use `intensity: 'pulse'` for micro-interactions (e.g. clicking upvote on an issue card).
 */
export function triggerQuantumBurst(options: BurstOptions = {}) {
  if (typeof window === 'undefined') return;

  // Accessibility check
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const target = ensureCanvas();
  if (!target) return;

  const originX = options.x !== undefined ? options.x : window.innerWidth / 2;
  const originY = options.y !== undefined ? options.y : window.innerHeight * 0.42;
  const variant = options.variant || 'cobalt';
  const intensity = options.intensity || 'celebration';
  const palette = PALETTES[variant];

  if (intensity === 'celebration') {
    // ─── STAGE 1: Epic Core Detonation (Immediate) ──────────────────────────
    spawnDetonation(originX, originY, palette, 65, 80, true, 2);

    // ─── STAGE 2: Left Aerial Flank Burst (+180ms) ──────────────────────────
    setTimeout(() => {
      const leftX = Math.max(80, originX - (window.innerWidth < 640 ? 100 : 200) + (Math.random() * 40 - 20));
      const leftY = originY - 70 + (Math.random() * 40 - 20);
      spawnDetonation(leftX, leftY, palette, 42, 45, true, 1);
    }, 180);

    // ─── STAGE 3: Right Aerial Flank Burst (+340ms) ─────────────────────────
    setTimeout(() => {
      const rightX = Math.min(window.innerWidth - 80, originX + (window.innerWidth < 640 ? 100 : 220) + (Math.random() * 40 - 20));
      const rightY = originY - 90 + (Math.random() * 40 - 20);
      spawnDetonation(rightX, rightY, palette, 45, 50, true, 1);
    }, 340);
  } else {
    // ─── MICRO PULSE: Snappy localized button feedback ──────────────────────
    spawnDetonation(originX, originY, palette, 30, 25, false, 1);
  }

  // Ensure render loop is active
  if (animationId === null) {
    animationId = requestAnimationFrame(renderLoop);
  }
}
