import { unitScale } from '../config/units.js';

/**
 * Quiet game-over plate: dark plum/navy, soft crimson title, JP line — hub-adjacent typography.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} score
 * @param {number} wave
 */
export function drawGameOver(ctx, score, wave) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const u = unitScale(ctx.canvas);

  const g = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(28, 18, 32, 0.97)');
  g.addColorStop(0.5, 'rgba(12, 8, 20, 0.99)');
  g.addColorStop(1, '#030206');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.12, W / 2, H / 2, Math.max(W, H) * 0.58);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  const titleY = H * 0.38;
  const titlePx = Math.round(34 * u);
  const fontTitle = `800 ${titlePx}px Georgia, "Hiragino Mincho ProN", "Yu Mincho", serif`;

  ctx.font = fontTitle;
  ctx.lineWidth = Math.max(2.2, 2.4 * u);
  ctx.strokeStyle = 'rgba(8, 4, 14, 0.92)';
  ctx.fillStyle = 'rgba(200, 112, 118, 0.92)';
  ctx.shadowColor = 'rgba(90, 30, 40, 0.35)';
  ctx.shadowBlur = 28 * u;
  ctx.strokeText('GAME OVER', W / 2, titleY);
  ctx.shadowBlur = 0;
  ctx.fillText('GAME OVER', W / 2, titleY);

  const subY = titleY + Math.round(28 * u);
  ctx.font = `600 ${Math.round(15 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.lineWidth = Math.max(1.2, 1.4 * u);
  ctx.strokeStyle = 'rgba(18, 10, 24, 0.88)';
  ctx.fillStyle = 'rgba(210, 175, 180, 0.55)';
  ctx.strokeText('敗北 · 静かな海', W / 2, subY);
  ctx.fillText('敗北 · 静かな海', W / 2, subY);

  const statY = H * 0.56;
  ctx.font = `${Math.round(16 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.fillStyle = 'rgba(235, 228, 240, 0.42)';
  ctx.fillText(`Score  ${score.toLocaleString()}`, W / 2, statY);
  ctx.fillStyle = 'rgba(220, 212, 228, 0.38)';
  ctx.font = `${Math.round(14 * u)}px Georgia, serif`;
  ctx.fillText(`Wave  ${wave}`, W / 2, statY + Math.round(26 * u));

  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.font = `${Math.round(12 * u)}px Georgia, serif`;
  ctx.fillText('Enter · Space · Esc — hub', W / 2, H - Math.round(40 * u));
}
