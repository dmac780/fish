import { unitScale } from '../config/units.js';
import { drawCharacterSelectBackground } from './drawCharacterSelect.js';

/** @typedef {{ en: string, jp: string, romaji: string }} MainMenuEntry */

/** @type {readonly MainMenuEntry[]} */
export const MAIN_MENU_ENTRIES = [
  { en: 'Survival', jp: '生存戦', romaji: 'SURVIVAL' },
  { en: 'Glossary', jp: '図鑑', romaji: 'GLOSSARY' },
  { en: 'Settings', jp: '設定', romaji: 'SETTINGS' },
];

/**
 * Three sharp border “on” beats (same cadence as character-select confirm).
 * @param {number} t seconds
 * @param {number} duration seconds
 * @returns {boolean}
 */
function mainMenuBorderFlashOn(t, duration) {
  if (duration <= 0 || t >= duration) return false;
  const phases = 6;
  const seg = duration / phases;
  const i = Math.min(phases - 1, Math.floor(t / seg));
  return i % 2 === 0;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} selectedIndex keyboard selection
 * @param {number} [time] seconds — animates sky / spiral
 * @param {{
 *   highlightIndex?: number,
 *   activateFlash?: null | { index: number, t: number, duration: number },
 * }} [drawOpts]
 */
export function drawMainMenu(ctx, selectedIndex, time = 0, drawOpts = {}) {
  const highlightIndex = drawOpts.highlightIndex ?? selectedIndex;
  const activateFlash = drawOpts.activateFlash ?? null;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const u = unitScale(ctx.canvas);

  drawCharacterSelectBackground(ctx, W, H, u, time, null, false);

  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(38 * u)}px Georgia, "Hiragino Mincho ProN", "Yu Mincho", serif`;
  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineWidth = 3.5 * u;
  ctx.lineJoin = 'round';
  ctx.strokeText('Fish with Gun', W / 2, H * 0.11);
  ctx.fillStyle = '#2a1538';
  ctx.fillText('Fish with Gun', W / 2, H * 0.11);

  ctx.font = `${Math.round(17 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2 * u;
  ctx.strokeText('フィッシュ・ウィズ・ガン', W / 2, H * 0.11 + 26 * u);
  ctx.fillStyle = 'rgba(45, 28, 62, 0.88)';
  ctx.fillText('フィッシュ・ウィズ・ガン', W / 2, H * 0.11 + 26 * u);

  const cardW = Math.min(400 * u, W - 56 * u);
  const cardH = 50 * u;
  const gap = 12 * u;
  const firstCy = H * 0.38;
  const cx = W / 2;
  const r = 14 * u;

  for (let i = 0; i < MAIN_MENU_ENTRIES.length; i++) {
    const sel = i === highlightIndex;
    const inActivateFlash =
      activateFlash != null && activateFlash.index === i && activateFlash.duration > 0;
    const borderBlinkOn =
      inActivateFlash && mainMenuBorderFlashOn(activateFlash.t, activateFlash.duration);
    const cy = firstCy + i * (cardH + gap);
    const x = cx - cardW / 2;
    const y = cy - cardH / 2;

    ctx.save();
    ctx.shadowColor = sel ? 'rgba(225, 80, 110, 0.45)' : 'rgba(60, 40, 90, 0.28)';
    ctx.shadowBlur = sel ? 28 * u : 12 * u;
    ctx.shadowOffsetY = 5 * u;

    const paper = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
    if (sel) {
      paper.addColorStop(0, 'rgba(255, 252, 255, 0.95)');
      paper.addColorStop(0.5, 'rgba(255, 245, 248, 0.92)');
      paper.addColorStop(1, 'rgba(255, 248, 252, 0.94)');
    } else {
      paper.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
      paper.addColorStop(1, 'rgba(250, 246, 255, 0.68)');
    }
    ctx.fillStyle = paper;
    if (inActivateFlash) {
      if (borderBlinkOn) {
        ctx.strokeStyle = '#d62850';
        ctx.lineWidth = 4.2 * u;
      } else {
        ctx.strokeStyle = 'rgba(110, 80, 120, 0.42)';
        ctx.lineWidth = 1.8 * u;
      }
    } else {
      ctx.strokeStyle = sel ? '#c93a52' : 'rgba(110, 80, 120, 0.42)';
      ctx.lineWidth = sel ? 3 * u : 1.8 * u;
    }
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, r);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = sel ? '#1a0d24' : 'rgba(35, 22, 48, 0.78)';
    ctx.font = `bold ${Math.round(22 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
    ctx.fillText(MAIN_MENU_ENTRIES[i].jp, cx, cy - 7 * u);
    ctx.font = `${Math.round(12 * u)}px monospace`;
    ctx.fillStyle = sel ? 'rgba(90, 55, 75, 0.75)' : 'rgba(70, 50, 85, 0.55)';
    ctx.fillText(MAIN_MENU_ENTRIES[i].romaji, cx, cy + 12 * u);
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const hintY = H * 0.88;
  ctx.fillStyle = 'rgba(45, 30, 60, 0.55)';
  ctx.font = `${Math.round(12 * u)}px monospace`;
  ctx.fillText('↑↓ 選択 · Enter · クリック', W / 2, hintY);
  ctx.fillStyle = 'rgba(45, 30, 60, 0.42)';
  ctx.font = `${Math.round(10 * u)}px monospace`;
  ctx.fillText('game by imagination driver', W / 2, hintY + 16 * u);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} mx
 * @param {number} my
 * @returns {number} option index or -1
 */
export function mainMenuHitTest(canvas, mx, my) {
  const W = canvas.width;
  const H = canvas.height;
  const u = unitScale(canvas);
  const cardW = Math.min(400 * u, W - 56 * u);
  const cardH = 50 * u;
  const gap = 12 * u;
  const firstCy = H * 0.38;
  const cx = W / 2;

  for (let i = 0; i < MAIN_MENU_ENTRIES.length; i++) {
    const cy = firstCy + i * (cardH + gap);
    const x = cx - cardW / 2;
    const y = cy - cardH / 2;
    if (mx >= x && mx <= x + cardW && my >= y && my <= y + cardH) return i;
  }
  return -1;
}
