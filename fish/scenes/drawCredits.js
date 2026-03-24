import { unitScale } from '../config/units.js';
import { getCharacter } from '../config/characters.js';
import { formatRunTime } from '../game/formatRunTime.js';

/**
 * @param {string} hex #rrggbb
 * @returns {{ r: number, g: number, b: number }}
 */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   score: number,
 *   wave: number,
 *   characterId: string,
 *   playerHp: number,
 *   playerHpMax: number,
 *   weaponLabel: string,
 *   runTimeSec: number,
 * }} run
 */
export function drawCredits(ctx, run) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const u = unitScale(ctx.canvas);
  const ch = getCharacter(run.characterId);
  const { r, g, b } = hexToRgb(ch.accent);

  const g0 = ctx.createRadialGradient(W * 0.2, H * 0.15, 0, W * 0.5, H * 0.4, Math.max(W, H) * 0.95);
  g0.addColorStop(0, `rgba(${r},${g},${b},0.42)`);
  g0.addColorStop(0.45, `rgba(${Math.floor(r * 0.35)},${Math.floor(g * 0.32)},${Math.floor(b * 0.38)},0.92)`);
  g0.addColorStop(1, '#07040d');
  ctx.fillStyle = g0;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff7f0';
  ctx.font = `bold ${Math.round(36 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.fillText('CLEAR', W / 2, H * 0.14);

  ctx.font = `${Math.round(15 * u)}px Georgia, serif`;
  ctx.fillStyle = 'rgba(255,248,240,0.72)';
  ctx.fillText('Final wave survived', W / 2, H * 0.14 + 26 * u);

  ctx.fillStyle = ch.accent;
  ctx.font = `bold ${Math.round(28 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.fillText(ch.label, W / 2, H * 0.32);
  ctx.font = `${Math.round(16 * u)}px Georgia, serif`;
  ctx.fillStyle = 'rgba(255,248,255,0.85)';
  ctx.fillText(`${ch.jp} · ${ch.romaji}`, W / 2, H * 0.32 + 24 * u);
  ctx.font = `${Math.round(12 * u)}px Georgia, serif`;
  ctx.fillStyle = 'rgba(255,248,255,0.55)';
  ctx.fillText(`「${ch.epithet}」`, W / 2, H * 0.32 + 42 * u);

  const lines = [
    `Score  ${run.score.toLocaleString()}`,
    `Time  ${formatRunTime(run.runTimeSec ?? 0)}`,
    `Wave reached  ${run.wave}`,
    `HP remaining  ${run.playerHp} / ${run.playerHpMax}`,
    `Weapon  ${run.weaponLabel}`,
  ];
  ctx.font = `${Math.round(17 * u)}px ui-monospace, "Cascadia Mono", Consolas, monospace`;
  ctx.fillStyle = 'rgba(255, 250, 255, 0.9)';
  let y = H * 0.52;
  for (const line of lines) {
    ctx.fillText(line, W / 2, y);
    y += 28 * u;
  }

  ctx.font = `${Math.round(14 * u)}px Georgia, serif`;
  ctx.fillStyle = 'rgba(255, 220, 200, 0.65)';
  ctx.fillText('CREDITS', W / 2, H * 0.78);
  ctx.font = `${Math.round(13 * u)}px ui-monospace, monospace`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('Imagination Driver 2026', W / 2, H * 0.78 + 22 * u);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.fillText('github.com/dmac780', W / 2, H * 0.78 + 40 * u);
  ctx.fillText('imaginationdriver.com', W / 2, H * 0.78 + 58 * u);

  ctx.font = `${Math.round(14 * u)}px Georgia, serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fillText('Click or press Enter / Esc — main menu', W / 2, H - 36 * u);
}
