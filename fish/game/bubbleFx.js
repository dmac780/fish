import { bubbleFxPresets, bossDeathBubbleEmitter } from '../config/bubbleFx.js';
import { SIM_HZ } from '../config/timing.js';

/**
 * @typedef {{
 *   x: number,
 *   y: number,
 *   r: number,
 *   vx: number,
 *   vy: number,
 *   life: number,
 *   maxLife: number,
 * }} WorldBubble
 */

/**
 * @param {string | import('../config/bubbleFx.js').BubbleBurstPreset} preset
 * @returns {import('../config/bubbleFx.js').BubbleBurstPreset}
 */
function resolveBubblePreset(preset) {
  if (typeof preset === 'string') {
    return bubbleFxPresets[preset] ?? bubbleFxPresets.idle;
  }
  return { ...bubbleFxPresets.idle, ...preset };
}

/**
 * Append bubbles in world space. `anchorX/Y` = spawn center (e.g. player or muzzle).
 * @param {WorldBubble[]} bubbles
 * @param {number} anchorX
 * @param {number} anchorY
 * @param {number} u unitScale
 * @param {string | import('../config/bubbleFx.js').BubbleBurstPreset} [preset='idle']
 */
export function spawnBubbleBurst(bubbles, anchorX, anchorY, u, preset = 'idle') {
  const p = resolveBubblePreset(preset);
  const count = p.count;
  const radii = p.radiiU;
  const jitter = (p.spawnJitterU ?? 4) * u;
  for (let i = 0; i < count; i++) {
    const rU = radii[i % radii.length];
    bubbles.push({
      x: anchorX + (Math.random() - 0.5) * 2 * p.spreadU * u,
      y: anchorY - p.aboveU * u + (Math.random() - 0.5) * jitter,
      r: rU * u,
      vx: (Math.random() - 0.5) * 2 * p.driftU * u,
      vy: p.vyU * u,
      life: p.maxLifeTicks,
      maxLife: p.maxLifeTicks,
    });
  }
}

/**
 * @param {WorldBubble[]} bubbles in-place
 * @param {number} k tick blend (dt * SIM_HZ)
 */
/**
 * @typedef {{
 *   cx: number,
 *   cy: number,
 *   radiusPx: number,
 *   remaining: number,
 *   cooldown: number,
 *   aliveTicks: number,
 * }} BossDeathBubbleEmitter
 */

/**
 * Start staggered bubbles around a boss explosion (reuses `playerBubbles` for drawing).
 * @param {BossDeathBubbleEmitter[]} emitters
 * @param {number} cx
 * @param {number} cy
 * @param {number} radiusPx uniform disk spawn radius in px
 */
export function pushBossDeathBubbleEmitter(emitters, cx, cy, radiusPx) {
  if (!emitters) return;
  const d = bossDeathBubbleEmitter;
  emitters.push({
    cx,
    cy,
    radiusPx,
    remaining: d.bubbleCount,
    cooldown: 0,
    aliveTicks: d.maxAliveTicks,
  });
}

/**
 * Emit at most `spawnsPerFrameCap` bubbles per emitter per call; uniform disk in `radiusPx`.
 * @param {BossDeathBubbleEmitter[]} emitters
 * @param {WorldBubble[]} bubbles
 * @param {number} k
 * @param {number} u
 */
export function stepBossDeathBubbleEmitters(emitters, bubbles, k, u) {
  if (!emitters?.length || !bubbles) return;
  const d = bossDeathBubbleEmitter;
  const cdSpan = Math.max(0.05, d.cooldownMaxTicks - d.cooldownMinTicks);
  for (let i = emitters.length - 1; i >= 0; i--) {
    const e = emitters[i];
    e.aliveTicks -= k;
    e.cooldown -= k;
    let cap = d.spawnsPerFrameCap;
    while (cap-- > 0 && e.remaining > 0 && e.aliveTicks > 0 && e.cooldown <= 0) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * e.radiusPx;
      spawnBubbleBurst(bubbles, e.cx + Math.cos(ang) * dist, e.cy + Math.sin(ang) * dist, u, {
        count: 1,
        radiiU: [0.68 + Math.random() * 1.2],
        vyU: -1.95 - Math.random() * 1.65,
        driftU: 0.1 + Math.random() * 0.32,
        spreadU: 0.45,
        aboveU: 0,
        maxLifeTicks: Math.round(SIM_HZ * (0.8 + Math.random() * 0.6)),
        spawnJitterU: 1.4,
      });
      e.remaining--;
      e.cooldown = d.cooldownMinTicks + Math.random() * cdSpan;
    }
    if (e.aliveTicks <= 0 || e.remaining <= 0) emitters.splice(i, 1);
  }
}

export function stepWorldBubbles(bubbles, k) {
  let w = 0;
  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i];
    b.x += b.vx * k;
    b.y += b.vy * k;
    b.life -= k;
    if (b.life > 0) bubbles[w++] = b;
  }
  bubbles.length = w;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {WorldBubble[]} bubbles
 * @param {number} u unitScale
 */
export function drawWorldBubbles(ctx, bubbles, u) {
  if (!bubbles?.length) return;
  for (const b of bubbles) {
    const fade = Math.max(0, Math.min(1, b.life / b.maxLife));
    const fillA = 0.12 * fade;
    const strokeA = 0.22 + 0.38 * fade;
    ctx.save();
    ctx.fillStyle = `rgba(198, 232, 255, ${fillA})`;
    ctx.strokeStyle = `rgba(230, 248, 255, ${strokeA})`;
    ctx.lineWidth = Math.max(0.65, 0.42 * u);
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
