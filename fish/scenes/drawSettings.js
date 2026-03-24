import { unitScale } from '../config/units.js';
import { AUDIO_VOLUME_STEPS } from '../config/audio.js';
import {
  drawCharacterSelectBackground,
  drawCharacterSelectBackButton,
  getCharacterSelectBackButtonRect,
} from './drawCharacterSelect.js';
import {
  INPUT_ACTION_ORDER,
  inputActionLabels,
  formatKeyDisplay,
} from '../config/inputSettings.js';

export { characterSelectBackHitTest } from './drawCharacterSelect.js';

/**
 * @typedef {{
 *   x: number,
 *   y: number,
 *   w: number,
 *   h: number,
 *   step: number,
 * }} VolumeSegmentHit
 */

/**
 * @typedef {{
 *   W: number,
 *   H: number,
 *   u: number,
 *   back: { x: number, y: number, w: number, h: number },
 *   mute: { x: number, y: number, w: number, h: number },
 *   showFps: { x: number, y: number, w: number, h: number },
 *   fullscreen: { x: number, y: number, w: number, h: number },
 *   sfx: { y: number, rowH: number, segs: VolumeSegmentHit[], minus: Rect, plus: Rect },
 *   music: { y: number, rowY: number, rowH: number, segs: VolumeSegmentHit[], minus: Rect, plus: Rect },
 *   resetRow: { x: number, y: number, w: number, h: number },
 *   bindRows: Array<{ action: string, x: number, y: number, w: number, h: number }>,
 * }} SettingsLayout
 */

/** @typedef {{ x: number, y: number, w: number, h: number }} Rect */

/**
 * Japanese title baseline Y; keep in sync with `settingsFirstRowY`.
 * @param {number} H
 */
function settingsTitleY(H) {
  return H * 0.056;
}

/**
 * Top Y of the first settings row (SFX): just under title or back button.
 * @param {number} H
 * @param {number} u
 * @param {{ x: number, y: number, w: number, h: number }} back
 */
function settingsFirstRowY(H, u, back) {
  const ty = settingsTitleY(H);
  const belowTitles = ty + 17 * u + 10 * u;
  return Math.max(back.y + back.h + 5 * u, belowTitles);
}

/**
 * @param {number} xTrack
 * @param {number} y
 * @param {number} trackW
 * @param {number} trackH
 * @param {number} u
 * @returns {VolumeSegmentHit[]}
 */
function buildVolumeSegments(xTrack, y, trackW, trackH, u) {
  const n = AUDIO_VOLUME_STEPS;
  const gap = Math.max(3 * u, 4);
  const inner = trackW - (n - 1) * gap;
  const sw = inner / n;
  const segs = [];
  for (let i = 0; i < n; i++) {
    segs.push({
      x: xTrack + i * (sw + gap),
      y,
      w: sw,
      h: trackH,
      step: i + 1,
    });
  }
  return segs;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {SettingsLayout}
 */
export function computeSettingsLayout(canvas) {
  const W = canvas.width;
  const H = canvas.height;
  const u = unitScale(canvas);
  const back = getCharacterSelectBackButtonRect(canvas);
  const cx = W / 2;
  const contentW = Math.min(520 * u, W - 36 * u);
  const x0 = cx - contentW / 2;

  const rowH = 42 * u;
  const trackH = 25 * u;
  const gap = 7 * u;
  const toggleH = 38 * u;
  const bindRowH = 40 * u;
  const labelCol = 132 * u;
  const btnW = 34 * u;
  const btnGap = 8 * u;
  const sx = x0 + labelCol;
  const trackRight = x0 + contentW - 2 * btnW - btnGap;
  /** Gap before − / + so “8/10” readout does not overlap blocks or buttons */
  const trackToMinusGap = 44 * u;
  const trackW = Math.max(80 * u, trackRight - sx - trackToMinusGap);

  let y = settingsFirstRowY(H, u, back);
  const sfxY = y;
  const sfxTy = sfxY + (rowH - trackH) / 2;
  const sfxMinus = {
    x: x0 + contentW - 2 * btnW - btnGap,
    y: sfxY,
    w: btnW,
    h: rowH,
  };
  const sfxPlus = { x: x0 + contentW - btnW, y: sfxY, w: btnW, h: rowH };
  const sfxSegs = buildVolumeSegments(sx, sfxTy, trackW, trackH, u);

  y += rowH + gap * 0.72;
  const musicY = y;
  const musicTy = musicY + (rowH - trackH) / 2;
  const musicMinus = {
    x: x0 + contentW - 2 * btnW - btnGap,
    y: musicY,
    w: btnW,
    h: rowH,
  };
  const musicPlus = { x: x0 + contentW - btnW, y: musicY, w: btnW, h: rowH };
  const musicSegs = buildVolumeSegments(sx, musicTy, trackW, trackH, u);

  y += rowH + gap * 0.78;
  const mute = { x: x0, y, w: contentW, h: toggleH };

  y += mute.h + gap * 0.5;
  const showFps = { x: x0, y, w: contentW, h: toggleH };

  y += showFps.h + gap * 0.5;
  const fullscreen = { x: x0, y, w: contentW, h: toggleH };

  /** Section break before key bindings (keep clear of full-viewport row) */
  y += fullscreen.h + 24 * u + gap * 1.75;
  const bindRows = [];
  for (const action of INPUT_ACTION_ORDER) {
    bindRows.push({ action, x: x0, y, w: contentW, h: bindRowH });
    y += bindRowH + gap * 0.52;
  }

  y += gap * 0.55;
  const resetRow = { x: x0, y, w: contentW, h: 36 * u };

  return {
    W,
    H,
    u,
    back,
    mute,
    showFps,
    fullscreen,
    sfx: {
      y: sfxY,
      rowH,
      segs: sfxSegs,
      minus: sfxMinus,
      plus: sfxPlus,
    },
    music: {
      y: musicY,
      rowY: musicY,
      rowH,
      segs: musicSegs,
      minus: musicMinus,
      plus: musicPlus,
    },
    resetRow,
    bindRows,
  };
}

/**
 * @param {SettingsLayout} lay
 * @param {number} mx
 * @param {number} my
 */
export function settingsHitTest(lay, mx, my) {
  const { back, mute, showFps, fullscreen, resetRow, bindRows } = lay;
  if (mx >= back.x && mx <= back.x + back.w && my >= back.y && my <= back.y + back.h) {
    return { kind: 'back' };
  }
  if (mx >= mute.x && mx <= mute.x + mute.w && my >= mute.y && my <= mute.y + mute.h) {
    return { kind: 'mute' };
  }
  if (
    mx >= showFps.x &&
    mx <= showFps.x + showFps.w &&
    my >= showFps.y &&
    my <= showFps.y + showFps.h
  ) {
    return { kind: 'showFps' };
  }
  if (
    mx >= fullscreen.x &&
    mx <= fullscreen.x + fullscreen.w &&
    my >= fullscreen.y &&
    my <= fullscreen.y + fullscreen.h
  ) {
    return { kind: 'fullscreen' };
  }

  for (const s of lay.sfx.segs) {
    if (mx >= s.x && mx <= s.x + s.w && my >= s.y && my <= s.y + s.h) {
      return { kind: 'sfxStep', step: s.step };
    }
  }
  const sm = lay.sfx.minus;
  const sp = lay.sfx.plus;
  if (mx >= sm.x && mx <= sm.x + sm.w && my >= sm.y && my <= sm.y + sm.h) {
    return { kind: 'sfxBump', delta: -1 };
  }
  if (mx >= sp.x && mx <= sp.x + sp.w && my >= sp.y && my <= sp.y + sp.h) {
    return { kind: 'sfxBump', delta: 1 };
  }

  for (const s of lay.music.segs) {
    if (mx >= s.x && mx <= s.x + s.w && my >= s.y && my <= s.y + s.h) {
      return { kind: 'musicStep', step: s.step };
    }
  }
  const mm = lay.music.minus;
  const mp = lay.music.plus;
  if (mx >= mm.x && mx <= mm.x + mm.w && my >= mm.y && my <= mm.y + mm.h) {
    return { kind: 'musicBump', delta: -1 };
  }
  if (mx >= mp.x && mx <= mp.x + mp.w && my >= mp.y && my <= mp.y + mp.h) {
    return { kind: 'musicBump', delta: 1 };
  }

  if (
    mx >= resetRow.x &&
    mx <= resetRow.x + resetRow.w &&
    my >= resetRow.y &&
    my <= resetRow.y + resetRow.h
  ) {
    return { kind: 'reset' };
  }
  for (const r of bindRows) {
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
      return { kind: 'bind', action: r.action };
    }
  }
  return null;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   time?: number,
 *   backHover?: boolean,
 *   backDimmed?: boolean,
 *   sfxStep: number,
 *   musicStep: number,
 *   muted: boolean,
 *   showFps: boolean,
 *   fullscreen: boolean,
 *   captureAction: string | null,
 *   bindings: Record<string, string>,
 * }} opts
 */
export function drawSettings(ctx, opts) {
  const {
    time = 0,
    backHover = false,
    backDimmed = false,
    sfxStep,
    musicStep,
    muted,
    showFps,
    fullscreen,
    captureAction,
    bindings,
  } = opts;
  const canvas = ctx.canvas;
  const lay = computeSettingsLayout(canvas);
  const { W, H, u } = lay;
  const x0 = lay.bindRows[0]?.x ?? (W / 2 - Math.min(520 * u, W - 36 * u) / 2);

  drawCharacterSelectBackground(ctx, W, H, u, time, null, false);
  drawCharacterSelectBackButton(ctx, lay.back, u, backHover, backDimmed);

  const titleY = settingsTitleY(H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `bold ${Math.round(26 * u)}px Georgia, "Hiragino Mincho ProN", "Yu Mincho", serif`;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3 * u;
  ctx.lineJoin = 'round';
  ctx.strokeText('設定', W / 2, titleY);
  ctx.fillStyle = '#2f1538';
  ctx.fillText('設定', W / 2, titleY);
  ctx.font = `${Math.round(13 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.4 * u;
  ctx.strokeText('SETTINGS', W / 2, titleY + 17 * u);
  ctx.fillStyle = 'rgba(45, 28, 62, 0.86)';
  ctx.fillText('SETTINGS', W / 2, titleY + 17 * u);

  const sfxCy = lay.sfx.y + lay.sfx.rowH / 2;
  const musicCy = lay.music.y + lay.music.rowH / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(12 * u)}px Georgia, serif`;
  ctx.fillStyle = 'rgba(55, 35, 75, 0.85)';
  ctx.fillText('効果音 · SFX', x0, sfxCy);
  drawClickySteps(ctx, lay.sfx.segs, sfxStep, u, 'rgba(200, 85, 115, 0.88)', 'rgba(55, 40, 75, 0.28)');
  const readoutPad = 10 * u;
  ctx.textAlign = 'right';
  ctx.font = `${Math.round(10 * u)}px monospace`;
  ctx.fillStyle = 'rgba(75, 50, 95, 0.55)';
  ctx.fillText(`${sfxStep}/${AUDIO_VOLUME_STEPS}`, lay.sfx.minus.x - readoutPad, sfxCy);
  drawMiniBtn(ctx, lay.sfx.minus, u, '−');
  drawMiniBtn(ctx, lay.sfx.plus, u, '+');

  ctx.textAlign = 'left';
  ctx.font = `bold ${Math.round(12 * u)}px Georgia, serif`;
  ctx.fillStyle = 'rgba(55, 35, 75, 0.85)';
  ctx.fillText('音楽 · BGM', x0, musicCy);
  drawClickySteps(ctx, lay.music.segs, musicStep, u, 'rgba(120, 95, 200, 0.88)', 'rgba(55, 40, 75, 0.28)');
  ctx.textAlign = 'right';
  ctx.font = `${Math.round(10 * u)}px monospace`;
  ctx.fillStyle = 'rgba(75, 50, 95, 0.55)';
  ctx.fillText(`${musicStep}/${AUDIO_VOLUME_STEPS}`, lay.music.minus.x - readoutPad, musicCy);
  drawMiniBtn(ctx, lay.music.minus, u, '−');
  drawMiniBtn(ctx, lay.music.plus, u, '+');

  drawToggleRow(ctx, lay.mute, u, 'ミュート · MUTE ALL', muted);
  drawToggleRow(ctx, lay.showFps, u, 'FPS表示 · SHOW FPS', showFps);
  drawToggleRow(ctx, lay.fullscreen, u, '全画面表示 · FULL VIEWPORT', fullscreen);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.font = `bold ${Math.round(12 * u)}px Georgia, serif`;
  ctx.fillStyle = 'rgba(55, 35, 75, 0.88)';
  ctx.fillText('操作 · CONTROLS', x0, lay.bindRows[0].y - 12 * u);
  ctx.textBaseline = 'alphabetic';

  for (const r of lay.bindRows) {
    const lab =
      inputActionLabels[/** @type {keyof typeof inputActionLabels} */ (r.action)] ?? {
        jp: r.action,
        romaji: '',
      };
    const keyId = bindings[r.action] ?? '';
    const capturing = captureAction === r.action;
    drawBindingRow(ctx, r, u, lab, keyId, capturing);
  }

  drawResetRow(ctx, lay.resetRow, u);

  ctx.textAlign = 'center';
  ctx.font = `${Math.round(10 * u)}px monospace`;
  ctx.fillStyle = 'rgba(55, 35, 75, 0.55)';
  const escY = Math.min(
    H - 8 * u,
    Math.max(lay.resetRow.y + lay.resetRow.h + 10 * u, H * 0.86),
  );
  ctx.fillText('ESC · メニューへ戻る', W / 2, escY);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {VolumeSegmentHit[]} segs
 * @param {number} step 0…AUDIO_VOLUME_STEPS
 * @param {number} u
 * @param {string} onFill
 * @param {string} offFill
 */
function drawClickySteps(ctx, segs, step, u, onFill, offFill) {
  const r = Math.max(4 * u, 5);
  for (const s of segs) {
    const on = step >= s.step;
    ctx.fillStyle = on ? onFill : offFill;
    ctx.strokeStyle = on ? 'rgba(80, 40, 60, 0.55)' : 'rgba(90, 70, 110, 0.4)';
    ctx.lineWidth = on ? 2 * u : 1.2 * u;
    ctx.beginPath();
    ctx.roundRect(s.x, s.y, s.w, s.h, r);
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Rect} r
 * @param {number} u
 * @param {string} ch
 */
function drawMiniBtn(ctx, r, u, ch) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 252, 255, 0.88)';
  ctx.strokeStyle = 'rgba(120, 90, 140, 0.45)';
  ctx.lineWidth = 1.4 * u;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 8 * u);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(18 * u)}px Georgia, serif`;
  ctx.fillStyle = '#3d2048';
  ctx.fillText(ch, r.x + r.w / 2, r.y + r.h / 2);
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Rect} r
 * @param {number} u
 * @param {string} label
 * @param {boolean} on
 */
function drawToggleRow(ctx, r, u, label, on) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.strokeStyle = on ? 'rgba(200, 70, 100, 0.65)' : 'rgba(110, 80, 120, 0.4)';
  ctx.lineWidth = on ? 2.2 * u : 1.5 * u;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 12 * u);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(15 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.fillStyle = '#2a1538';
  ctx.fillText(label, r.x + 16 * u, r.y + r.h / 2);
  ctx.textAlign = 'right';
  ctx.font = `${Math.round(12 * u)}px monospace`;
  ctx.fillStyle = on ? 'rgba(180, 50, 80, 0.9)' : 'rgba(70, 50, 90, 0.65)';
  ctx.fillText(on ? 'ON' : 'OFF', r.x + r.w - 16 * u, r.y + r.h / 2);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Rect & { action?: string }} r
 * @param {number} u
 * @param {{ jp: string, romaji: string }} lab
 * @param {string} keyId
 * @param {boolean} capturing
 */
function drawBindingRow(ctx, r, u, lab, keyId, capturing) {
  ctx.fillStyle = capturing ? 'rgba(255, 248, 252, 0.95)' : 'rgba(255, 255, 255, 0.76)';
  ctx.strokeStyle = capturing ? 'rgba(210, 60, 90, 0.55)' : 'rgba(110, 80, 120, 0.38)';
  ctx.lineWidth = capturing ? 2.4 * u : 1.5 * u;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 12 * u);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(15 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.fillStyle = '#2a1538';
  ctx.fillText(lab.jp, r.x + 14 * u, r.y + r.h / 2 - 5 * u);
  ctx.font = `${Math.round(10 * u)}px monospace`;
  ctx.fillStyle = 'rgba(90, 60, 100, 0.65)';
  ctx.fillText(lab.romaji, r.x + 14 * u, r.y + r.h / 2 + 9 * u);
  ctx.textAlign = 'right';
  ctx.font = `bold ${Math.round(14 * u)}px monospace`;
  ctx.fillStyle = capturing ? 'rgba(200, 60, 90, 0.95)' : 'rgba(45, 30, 65, 0.88)';
  const txt = capturing ? 'キーを押す…' : formatKeyDisplay(keyId);
  ctx.fillText(txt, r.x + r.w - 14 * u, r.y + r.h / 2);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Rect} r
 * @param {number} u
 */
function drawResetRow(ctx, r, u) {
  ctx.fillStyle = 'rgba(245, 240, 255, 0.65)';
  ctx.strokeStyle = 'rgba(100, 80, 130, 0.35)';
  ctx.lineWidth = 1.2 * u;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 10 * u);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(12 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.fillStyle = 'rgba(55, 35, 80, 0.82)';
  ctx.fillText('既定のキーに戻す · RESET TO DEFAULTS', r.x + r.w / 2, r.y + r.h / 2);
}
