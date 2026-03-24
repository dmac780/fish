import { unitScale } from '../config/units.js';
import { AUDIO_VOLUME_STEPS } from '../config/audio.js';

/**
 * @typedef {{
 *   x: number,
 *   y: number,
 *   w: number,
 *   h: number,
 *   step: number,
 * }} PauseVolSeg
 */

/** @typedef {{ x: number, y: number, w: number, h: number }} PauseRect */

/**
 * @param {number} xTrack
 * @param {number} y
 * @param {number} trackW
 * @param {number} trackH
 * @param {number} u
 * @returns {PauseVolSeg[]}
 */
function buildVolSegs(xTrack, y, trackW, trackH, u) {
  const n = AUDIO_VOLUME_STEPS;
  const gap = Math.max(2.5 * u, 3);
  const inner = trackW - (n - 1) * gap;
  const sw = inner / n;
  const segs = [];
  for (let i = 0; i < n; i++) {
    segs.push({ x: xTrack + i * (sw + gap), y, w: sw, h: trackH, step: i + 1 });
  }
  return segs;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {{
 *   W: number,
 *   H: number,
 *   u: number,
 *   panel: PauseRect,
 *   resume: PauseRect,
 *   sfx: { labelMidY: number, segs: PauseVolSeg[], minus: PauseRect, plus: PauseRect },
 *   music: { labelMidY: number, segs: PauseVolSeg[], minus: PauseRect, plus: PauseRect },
 *   mute: PauseRect,
 *   mainMenu: PauseRect,
 *   confirmPanel: PauseRect,
 *   confirmYes: PauseRect,
 *   confirmNo: PauseRect,
 * }}
 */
export function computePauseMenuLayout(canvas) {
  const W = canvas.width;
  const H = canvas.height;
  const u = unitScale(canvas);
  const pw = Math.min(420 * u, W - 28 * u);
  const px = (W - pw) / 2;
  const pad = 14 * u;
  const innerW = pw - pad * 2;
  const rowH = 38 * u;
  const trackH = 24 * u;
  const volLabelW = 74 * u;
  const btnW = 30 * u;
  const btnGap = 6 * u;
  const trackX = px + pad + volLabelW;
  const trackW = Math.max(64 * u, innerW - volLabelW - 2 * btnW - btnGap - 4 * u);

  const panelTop = H * 0.06;
  let y = panelTop + 46 * u;
  const resume = { x: px + pad, y, w: innerW, h: rowH + 4 * u };
  y += resume.h + 10 * u;

  const sfxLabelMidY = y + rowH / 2;
  const sfxTy = y + (rowH - trackH) / 2;
  const sfxSegs = buildVolSegs(trackX, sfxTy, trackW, trackH, u);
  const sfxMinus = { x: px + pw - pad - 2 * btnW - btnGap, y, w: btnW, h: rowH };
  const sfxPlus = { x: px + pw - pad - btnW, y, w: btnW, h: rowH };
  y += rowH + 6 * u;

  const musicLabelMidY = y + rowH / 2;
  const musicTy = y + (rowH - trackH) / 2;
  const musicSegs = buildVolSegs(trackX, musicTy, trackW, trackH, u);
  const musicMinus = { x: px + pw - pad - 2 * btnW - btnGap, y, w: btnW, h: rowH };
  const musicPlus = { x: px + pw - pad - btnW, y, w: btnW, h: rowH };
  y += rowH + 8 * u;

  const mute = { x: px + pad, y, w: innerW, h: 36 * u };
  y += mute.h + 10 * u;

  const mainMenu = { x: px + pad, y, w: innerW, h: rowH + 2 * u };
  /** Room below main menu so footer hint does not overlap the button */
  y += mainMenu.h + 26 * u;

  const panel = { x: px, y: panelTop, w: pw, h: y - panelTop };

  const cw = Math.min(340 * u, W - 32 * u);
  /** Tall enough for even bands: copy → EN → buttons → key hint → bottom margin */
  const ch = 150 * u;
  const confirmPanel = { x: (W - cw) / 2, y: H * 0.36, w: cw, h: ch };
  const btnYw = (cw - pad * 3) / 2;
  const confirmBtnY = confirmPanel.y + ch - 78 * u;
  const confirmYes = {
    x: confirmPanel.x + pad,
    y: confirmBtnY,
    w: btnYw,
    h: 36 * u,
  };
  const confirmNo = {
    x: confirmPanel.x + pad * 2 + btnYw,
    y: confirmBtnY,
    w: btnYw,
    h: 36 * u,
  };

  return {
    W,
    H,
    u,
    panel,
    resume,
    sfx: { labelMidY: sfxLabelMidY, segs: sfxSegs, minus: sfxMinus, plus: sfxPlus },
    music: { labelMidY: musicLabelMidY, segs: musicSegs, minus: musicMinus, plus: musicPlus },
    mute,
    mainMenu,
    confirmPanel,
    confirmYes,
    confirmNo,
  };
}

/**
 * @param {ReturnType<typeof computePauseMenuLayout>} lay
 * @param {number} mx
 * @param {number} my
 * @param {boolean} confirmMenu
 */
export function pauseMenuHitTest(lay, mx, my, confirmMenu) {
  if (confirmMenu) {
    if (
      mx >= lay.confirmYes.x &&
      mx <= lay.confirmYes.x + lay.confirmYes.w &&
      my >= lay.confirmYes.y &&
      my <= lay.confirmYes.y + lay.confirmYes.h
    ) {
      return { kind: 'confirmYes' };
    }
    if (
      mx >= lay.confirmNo.x &&
      mx <= lay.confirmNo.x + lay.confirmNo.w &&
      my >= lay.confirmNo.y &&
      my <= lay.confirmNo.y + lay.confirmNo.h
    ) {
      return { kind: 'confirmNo' };
    }
    return null;
  }

  const { resume, sfx, music, mute, mainMenu } = lay;
  if (
    mx >= resume.x &&
    mx <= resume.x + resume.w &&
    my >= resume.y &&
    my <= resume.y + resume.h
  ) {
    return { kind: 'resume' };
  }
  for (const s of sfx.segs) {
    if (mx >= s.x && mx <= s.x + s.w && my >= s.y && my <= s.y + s.h) {
      return { kind: 'sfxStep', step: s.step };
    }
  }
  if (
    mx >= sfx.minus.x &&
    mx <= sfx.minus.x + sfx.minus.w &&
    my >= sfx.minus.y &&
    my <= sfx.minus.y + sfx.minus.h
  ) {
    return { kind: 'sfxBump', delta: -1 };
  }
  if (
    mx >= sfx.plus.x &&
    mx <= sfx.plus.x + sfx.plus.w &&
    my >= sfx.plus.y &&
    my <= sfx.plus.y + sfx.plus.h
  ) {
    return { kind: 'sfxBump', delta: 1 };
  }
  for (const s of music.segs) {
    if (mx >= s.x && mx <= s.x + s.w && my >= s.y && my <= s.y + s.h) {
      return { kind: 'musicStep', step: s.step };
    }
  }
  if (
    mx >= music.minus.x &&
    mx <= music.minus.x + music.minus.w &&
    my >= music.minus.y &&
    my <= music.minus.y + music.minus.h
  ) {
    return { kind: 'musicBump', delta: -1 };
  }
  if (
    mx >= music.plus.x &&
    mx <= music.plus.x + music.plus.w &&
    my >= music.plus.y &&
    my <= music.plus.y + music.plus.h
  ) {
    return { kind: 'musicBump', delta: 1 };
  }
  if (mx >= mute.x && mx <= mute.x + mute.w && my >= mute.y && my <= mute.y + mute.h) {
    return { kind: 'mute' };
  }
  if (
    mx >= mainMenu.x &&
    mx <= mainMenu.x + mainMenu.w &&
    my >= mainMenu.y &&
    my <= mainMenu.y + mainMenu.h
  ) {
    return { kind: 'mainMenu' };
  }
  return null;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {PauseVolSeg[]} segs
 * @param {number} step
 * @param {number} u
 * @param {string} onFill
 * @param {string} offFill
 */
function drawStepBlocks(ctx, segs, step, u, onFill, offFill) {
  const r = Math.max(3 * u, 4);
  for (const s of segs) {
    const on = step >= s.step;
    ctx.fillStyle = on ? onFill : offFill;
    ctx.strokeStyle = on ? 'rgba(80, 40, 60, 0.5)' : 'rgba(90, 70, 110, 0.38)';
    ctx.lineWidth = on ? 1.6 * u : 1 * u;
    ctx.beginPath();
    ctx.roundRect(s.x, s.y, s.w, s.h, r);
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {PauseRect} r
 * @param {number} u
 * @param {string} label
 */
function drawSmallBtn(ctx, r, u, label) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 252, 255, 0.9)';
  ctx.strokeStyle = 'rgba(110, 85, 130, 0.45)';
  ctx.lineWidth = 1.2 * u;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 6 * u);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(16 * u)}px Georgia, serif`;
  ctx.fillStyle = '#3d2048';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   sfxStep: number,
 *   musicStep: number,
 *   muted: boolean,
 *   confirmMenu: boolean,
 * }} opts
 */
export function drawPauseMenu(ctx, opts) {
  const { sfxStep, musicStep, muted, confirmMenu } = opts;
  const canvas = ctx.canvas;
  const lay = computePauseMenuLayout(canvas);
  const { W, H, u } = lay;

  ctx.fillStyle = 'rgba(8, 5, 16, 0.78)';
  ctx.fillRect(0, 0, W, H);

  if (confirmMenu) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, W, H);
    const p = lay.confirmPanel;
    ctx.fillStyle = 'rgba(36, 22, 48, 0.97)';
    ctx.strokeStyle = 'rgba(255, 200, 210, 0.35)';
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 14 * u);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(17 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
    ctx.fillStyle = '#fdf8fc';
    ctx.fillText('メニューに戻りますか？', p.x + p.w / 2, p.y + 30 * u);
    ctx.font = `${Math.round(12 * u)}px Georgia, serif`;
    ctx.fillStyle = 'rgba(240, 220, 235, 0.82)';
    ctx.fillText('Return to main menu? Unsaved run ends.', p.x + p.w / 2, p.y + 48 * u);

    drawChoiceBtn(ctx, lay.confirmYes, u, 'はい · YES', 'rgba(200, 70, 95, 0.92)');
    drawChoiceBtn(ctx, lay.confirmNo, u, 'いいえ · NO', 'rgba(90, 75, 115, 0.88)');

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `${Math.round(10 * u)}px monospace`;
    ctx.fillStyle = 'rgba(200, 190, 220, 0.55)';
    /** ~28u below button bottoms; ~11u margin to panel edge (hint sits low, uses dead space) */
    ctx.fillText('ESC / N · cancel    Y / Enter · yes', p.x + p.w / 2, p.y + p.h - 11 * u);
    return;
  }

  const p = lay.panel;
  ctx.fillStyle = 'rgba(32, 20, 44, 0.94)';
  ctx.strokeStyle = 'rgba(255, 190, 205, 0.28)';
  ctx.lineWidth = 2 * u;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 28 * u;
  ctx.beginPath();
  ctx.roundRect(p.x, p.y, p.w, p.h, 16 * u);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const titleY = p.y + 26 * u;
  ctx.font = `bold ${Math.round(22 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2 * u;
  ctx.strokeText('一時停止', p.x + p.w / 2, titleY);
  ctx.fillStyle = '#f5eef8';
  ctx.fillText('一時停止', p.x + p.w / 2, titleY);
  ctx.font = `${Math.round(11 * u)}px monospace`;
  ctx.fillStyle = 'rgba(200, 180, 210, 0.7)';
  ctx.fillText('PAUSED', p.x + p.w / 2, titleY + 14 * u);

  drawPrimaryRow(ctx, lay.resume, u, '再開 · RESUME', 'rgba(220, 95, 120, 0.35)');

  const pad = 14 * u;
  const lx = p.x + pad;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(11 * u)}px Georgia, serif`;
  ctx.fillStyle = 'rgba(220, 200, 235, 0.9)';
  ctx.fillText('効果音 · SFX', lx, lay.sfx.labelMidY);
  drawStepBlocks(
    ctx,
    lay.sfx.segs,
    sfxStep,
    u,
    'rgba(210, 88, 118, 0.9)',
    'rgba(50, 38, 68, 0.45)',
  );
  drawSmallBtn(ctx, lay.sfx.minus, u, '−');
  drawSmallBtn(ctx, lay.sfx.plus, u, '+');

  ctx.font = `bold ${Math.round(11 * u)}px Georgia, serif`;
  ctx.fillStyle = 'rgba(220, 200, 235, 0.9)';
  ctx.fillText('音楽 · BGM', lx, lay.music.labelMidY);
  drawStepBlocks(
    ctx,
    lay.music.segs,
    musicStep,
    u,
    'rgba(130, 100, 210, 0.9)',
    'rgba(50, 38, 68, 0.45)',
  );
  drawSmallBtn(ctx, lay.music.minus, u, '−');
  drawSmallBtn(ctx, lay.music.plus, u, '+');

  drawMuteRow(ctx, lay.mute, u, muted);

  drawDangerRow(ctx, lay.mainMenu, u, 'メインメニュー · MAIN MENU');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = `${Math.round(10 * u)}px monospace`;
  ctx.fillStyle = 'rgba(180, 160, 200, 0.5)';
  ctx.fillText('ESC · 再開', p.x + p.w / 2, p.y + p.h - 10 * u);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {PauseRect} r
 * @param {number} u
 * @param {string} text
 * @param {string} tint
 */
function drawPrimaryRow(ctx, r, u, text, tint) {
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  g.addColorStop(0, 'rgba(255, 250, 252, 0.95)');
  g.addColorStop(1, tint);
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(200, 90, 115, 0.55)';
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 11 * u);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(15 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.fillStyle = '#2a1420';
  ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {PauseRect} r
 * @param {number} u
 * @param {boolean} muted
 */
function drawMuteRow(ctx, r, u, muted) {
  ctx.fillStyle = 'rgba(48, 32, 62, 0.88)';
  ctx.strokeStyle = muted ? 'rgba(210, 80, 110, 0.5)' : 'rgba(120, 95, 140, 0.4)';
  ctx.lineWidth = muted ? 1.8 * u : 1.2 * u;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 9 * u);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(13 * u)}px Georgia, serif`;
  ctx.fillStyle = '#eee8f2';
  ctx.fillText('ミュート · MUTE ALL', r.x + 12 * u, r.y + r.h / 2);
  ctx.textAlign = 'right';
  ctx.font = `${Math.round(11 * u)}px monospace`;
  ctx.fillStyle = muted ? 'rgba(255, 140, 160, 0.95)' : 'rgba(160, 145, 185, 0.75)';
  ctx.fillText(muted ? 'ON' : 'OFF', r.x + r.w - 12 * u, r.y + r.h / 2);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {PauseRect} r
 * @param {number} u
 * @param {string} text
 */
function drawDangerRow(ctx, r, u, text) {
  ctx.fillStyle = 'rgba(55, 28, 38, 0.88)';
  ctx.strokeStyle = 'rgba(200, 100, 120, 0.42)';
  ctx.lineWidth = 1.5 * u;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 9 * u);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(13 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.fillStyle = 'rgba(255, 220, 228, 0.92)';
  ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {PauseRect} r
 * @param {number} u
 * @param {string} text
 * @param {string} fill
 */
function drawChoiceBtn(ctx, r, u, text, fill) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.4 * u;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 9 * u);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(12 * u)}px Georgia, serif`;
  ctx.fillStyle = '#1a0a12';
  ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2);
}
