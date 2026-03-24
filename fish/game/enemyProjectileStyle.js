/**
 * Shared hostile bullet look: radial gradient violet orbs (turrets, bosses, etc.).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} r hit radius (px)
 * @param {number} u unit scale
 * @param {number} ring min ring thickness (px)
 * @param {boolean} intense larger glow + brighter core (e.g. god “main” shot)
 */
export function drawHostilePurpleOrb(ctx, x, y, r, u, ring, intense) {
  const glow = r + Math.max(5 * u, ring * (intense ? 2.2 : 1.75));
  const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, glow);
  g.addColorStop(0, intense ? 'rgba(248, 245, 255, 0.98)' : 'rgba(236, 230, 255, 0.9)');
  g.addColorStop(0.35, 'rgba(180, 160, 255, 0.74)');
  g.addColorStop(0.7, 'rgba(109, 40, 217, 0.48)');
  g.addColorStop(1, 'rgba(59, 7, 100, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, glow, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = intense ? 'rgba(237, 233, 254, 0.95)' : 'rgba(226, 220, 254, 0.88)';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(91, 33, 182, 0.55)';
  ctx.lineWidth = Math.max(1, u * 0.85);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
  ctx.stroke();
}
