import { unitScale } from '../config/units.js';
import { getFishPortraitTexture } from '../game/assets.js';
import { statToHp, statToSpeedMult } from '../config/characters.js';

/**
 * @typedef {{ x: number, y: number, w: number, h: number, index: number }} CardRect
 */

/**
 * @typedef {{
 *   kind: 'flash',
 *   index: number,
 *   t: number,
 *   duration: number,
 * } | {
 *   kind: 'fade',
 *   index: number,
 *   alpha: number,
 * }} CharacterSelectExitFx
 */

/**
 * @typedef {{
 *   warmth: number[],
 *   characters: import('../config/characters.js').CharacterDef[],
 *   time?: number,
 *   exitFx?: CharacterSelectExitFx | null,
 *   backHover?: boolean,
 *   backDimmed?: boolean,
 * }} CharacterSelectDrawOpts
 */

/** @param {string} hex #rrggbb */
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return { r: 255, g: 180, b: 140 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

/** 
 * Convert a color `c` to an RGBA string with an optional alpha `a`.
 * @param {{ r: number, g: number, b: number }} c
 * @param {number} a
 * @returns {string}
 */
function rgbStr(c, a = 1) {
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

/** @param {number} r 0–255 */
function rgbHue(r, g, b) {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  if (d < 1e-6) return 210;
  let h = 0;
  if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) / 6;
  else if (max === G) h = ((B - R) / d + 2) / 6;
  else h = ((R - G) / d + 4) / 6;
  return (h * 360) % 360;
}

/**
 * Three sharp border “on” beats: segments 0,2,4 on; 1,3,5 off.
 * @param {number} t
 * @param {number} duration
 */
function exitBorderFlashOn(t, duration) {
  if (duration <= 0 || t >= duration) return false;
  const phases = 6;
  const seg = duration / phases;
  const i = Math.min(phases - 1, Math.floor(t / seg));
  return i % 2 === 0;
}

/** Sun ray fan: radians per second (slow ambient drift, no click boost). */
const SUN_RAY_SPIN_RATE = 0.038;

/** 
 * Blend a color `c` towards a target color `target` by a factor `mix` and a scale `scale`.
 * @param {{ r: number, g: number, b: number }} c
 * @param {{ r: number, g: number, b: number }} target
 * @param {number} mix
 * @param {number} scale
 * @returns {{ r: number, g: number, b: number }}
 */
function blendColor(c, target, mix, scale) {
  if (!c) return null;
  return {
    r: target.r - (target.r - c.r) * mix * scale,
    g: target.g - (target.g - c.g) * mix * scale,
    b: target.b - (target.b - c.b) * mix * scale,
  };
}

/**
 * Anime sky + kyokujitsu-style sun + rotating rainbow spiral (conic + particle spiral).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {number} u
 * @param {number} time seconds, for slow rotation
 * @param {import('../config/characters.js').CharacterDef | null} hoverCharacter fish driving sun / sky tint
 * @param {boolean} sunFlashOn color pulse during confirm (same cadence as card border; no motion change)
 */
export function drawCharacterSelectBackground(ctx, W, H, u, time, hoverCharacter = null, sunFlashOn = false) {
  const ac = hoverCharacter ? hexToRgb(hoverCharacter.accent) : null;
  const mix = ac ? 0.42 : 0;
  const flashBoost = sunFlashOn ? 1 : 0;
  const sunFlash = 'rgba(255, 255, 255, 0.14)';

  const pinkLace = '#ffd6f0';
  const pinkLaceRgb = hexToRgb(pinkLace);
  const pinkBlendScale = 0.35;
  const pinkOffset = 0;

  const seashellPeach = '#fff5f0';
  const seashellPeachRgb = hexToRgb(seashellPeach);

  const sundownPink = '#FFB3B8';
  const sundownPinkRgb = hexToRgb(sundownPink);

  const paleRose = '#ffe8f8';
  const roseOffset = 0.35;

  const peachCream = '#fff0dc';
  const peachOffset = 0.55;

  const oasis = '#fde4c8';
  const oasisOffset = 0.85;

  const blueChalk = '#f5d0ff';
  const blueChalkRgb = hexToRgb(blueChalk);
  const blueBlendScale = 0.4;
  const blueOffset = 1;

  const wildWatermelon = '#ff6b7a';
  const radicalRed = '#ff3355';
  const amaranth = '#e11d48';
  const coralRed = '#ff3b4a';
  const shiraz = '#be123c';

  const coreOffset = 0;
  const midOffset = 0.65;
  const edgeOffset = 1;

  const sky = ctx.createLinearGradient(0, 0, W, H);
  const c0 = ac ? blendColor(ac, pinkLaceRgb, mix, pinkBlendScale) : null;
  const c0Str = c0 ? rgbStr(c0) : pinkLace;
  sky.addColorStop(pinkOffset, c0Str);
  sky.addColorStop(roseOffset , paleRose);
  sky.addColorStop(peachOffset, peachCream);
  sky.addColorStop(oasisOffset, oasis);

  const c1 = ac ? blendColor(ac, blueChalkRgb, mix, blueBlendScale) : null;
  const c1Str = c1 ? rgbStr(c1) : blueChalk;
  sky.addColorStop(blueOffset, c1Str);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  if (sunFlashOn) {
    ctx.fillStyle = sunFlash;
    ctx.fillRect(0, 0, W, H);
  }

  const sunX = W * 0.5;
  const sunY = H + H * 0.06;
  const rayLen = Math.max(W, H) * 1.35;
  const rays = 32;
  const wedge = (Math.PI * 2) / rays;
  const boostRed = 40;
  const boostGreen = 50;
  const boostBlue = 35;

  let rayA = ac 
    ? hexToRgb(hoverCharacter.accent) 
    : sundownPinkRgb;
  
  let rayB = ac
    ? { 
        r: Math.min(255, rayA.r + boostRed),  
        g: Math.min(255, rayA.g + boostGreen), 
        b: Math.min(255, rayA.b + boostBlue),
      }
    : seashellPeachRgb;

  if (sunFlashOn) {
    const liftScale = 0.42;
    const lift = (v) => Math.min(255, Math.round(v + (255 - v) * liftScale));
    rayA = { r: lift(rayA.r), g: lift(rayA.g), b: lift(rayA.b) };
    rayB = { r: lift(rayB.r), g: lift(rayB.g), b: lift(rayB.b) };
  }

  ctx.save();
  ctx.translate(sunX, sunY);
  ctx.rotate(time * SUN_RAY_SPIN_RATE);
  for (let r = 0; r < rays; r++) {
    ctx.rotate(wedge);
    ctx.globalAlpha = 1;

    const baseAlphaEven = 0.88;
    const baseAlphaOdd = 0.82;
    const flashMultEven = 0.1;
    const flashMultOdd = 0.12;

    ctx.fillStyle = r % 2 === 0 
      ? rgbStr(rayB, baseAlphaEven + flashBoost * flashMultEven) 
      : rgbStr(rayA, baseAlphaOdd + flashBoost * flashMultOdd);
    ctx.beginPath();
    ctx.moveTo(0, 0);

    const arcAngle = wedge * 0.48;
    ctx.arc(0, 0, rayLen, -arcAngle, arcAngle);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const sunDiskR = Math.min(W, H) * 0.52;
  ctx.save();

  const diskBase = ac
    ? {
        r: Math.min(255, 255 - (255 - ac.r) * 0.25),
        g: Math.min(255, 248 - (248 - ac.g) * 0.2),
        b: Math.min(255, 242 - (242 - ac.b) * 0.2),
      }
    : { r: 255, g: 248, b: 242 };

  const diskLit = sunFlashOn
    ? {
        r: Math.min(255, diskBase.r + 28),
        g: Math.min(255, diskBase.g + 26),
        b: Math.min(255, diskBase.b + 22),
      }
    : diskBase;

  ctx.fillStyle = rgbStr(diskLit, 0.97);
  ctx.globalAlpha = 0.97 + flashBoost * 0.02;
  ctx.beginPath();

  const diskRadius = sunDiskR * 1.02;
  ctx.arc(sunX, sunY, diskRadius, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const maruR = Math.min(W, H) * 0.13;
  const maruCy = H * 0.8;
  ctx.save();
  const maruGrad = ctx.createRadialGradient(sunX, maruCy, 0, sunX, maruCy, maruR * 1.35);
  if (ac) {
    const fk = flashBoost * 22;
    const core = {
      r: Math.min(255, ac.r + 35 + fk),
      g: Math.min(255, ac.g + 25 + fk),
      b: Math.min(255, ac.b + 20 + fk),
    };
    const mid = {
      r: Math.min(255, ac.r + fk * 0.6),
      g: Math.min(255, ac.g + fk * 0.6),
      b: Math.min(255, ac.b + fk * 0.6),
    };
    const edge = {
      r: Math.max(0, ac.r * 0.55 + fk * 0.35),
      g: Math.max(0, ac.g * 0.5 + fk * 0.35),
      b: Math.max(0, ac.b * 0.55 + fk * 0.35),
    };
    maruGrad.addColorStop(coreOffset, rgbStr(core));
    maruGrad.addColorStop(midOffset, rgbStr(mid));
    maruGrad.addColorStop(edgeOffset, rgbStr(edge));
  } else {
    if (sunFlashOn) {
      maruGrad.addColorStop(coreOffset, wildWatermelon);
      maruGrad.addColorStop(midOffset, radicalRed);
      maruGrad.addColorStop(edgeOffset, amaranth);
    } else {
      maruGrad.addColorStop(coreOffset, coralRed);
      maruGrad.addColorStop(midOffset, amaranth);
      maruGrad.addColorStop(edgeOffset, shiraz);
    }
  }
  ctx.fillStyle = maruGrad;
  ctx.beginPath();
  ctx.arc(sunX, maruCy, maruR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const spiralCx = W * 0.5;
  const spiralCy = H * 0.38;
  const rot = time * 0.35;

  if (typeof ctx.createConicGradient === 'function') {
    const cone = ctx.createConicGradient(spiralCx, spiralCy, rot);
    const stops = 16;
    const hue0 = ac ? rgbHue(ac.r, ac.g, ac.b) : 0;
    for (let s = 0; s <= stops; s++) {
      const t = s / stops;
      const h = ac ? (hue0 + t * 200) % 360 : t * 360;
      cone.addColorStop(t, `hsl(${h}, ${ac ? 78 : 92}%, ${ac ? 58 : 65}%)`);
    }
    ctx.save();
    ctx.globalAlpha = 0.38 + flashBoost * 0.1;
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = cone;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const spiralC2X = W * 0.42;
    const spiralC2Y = H * 0.32;
    const cone2Rot = -rot * 1.2 + 1.2;

    const cone2 = ctx.createConicGradient(spiralC2X, spiralC2Y, cone2Rot);
    for (let s = 0; s <= stops; s++) {
      const t = s / stops;
      const h = ac ? (hue0 + 40 + t * 220) % 360 : t * 360 + 40;
      cone2.addColorStop(t, `hsl(${h}, ${ac ? 72 : 88}%, ${ac ? 62 : 70}%)`);
    }
    ctx.save();
    ctx.globalAlpha = 0.22 + flashBoost * 0.08;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = cone2;
    ctx.beginPath();

    const spiralRadius = Math.max(W, H) * 0.75;
    ctx.arc(spiralCx, spiralCy, spiralRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const maxSpiralR = Math.min(W, H) * 0.62;
  const steps = 220;
  const hueBase = ac ? rgbHue(ac.r, ac.g, ac.b) : 0;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < steps; i++) {
    const p = i / steps;
    const theta = p * 5.5 * Math.PI + rot * 1.8;
    const r = p * maxSpiralR;
    const x = spiralCx + Math.cos(theta) * r;
    const y = spiralCy + Math.sin(theta) * r;
    const hue = ac ? (hueBase + i * 1.2 + time * 40) % 360 : (i * 1.65 + time * 55) % 360;
    const lum = (ac ? 58 : 62) + flashBoost * 7;
    const alphaP = 0.12 + p * 0.2 + flashBoost * 0.06;
    ctx.fillStyle = `hsla(${hue}, ${ac ? 82 : 90}%, ${lum}%, ${alphaP})`;
    ctx.beginPath();
    ctx.arc(x, y, 2.2 * u + p * 3.5 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const vig = ctx.createRadialGradient(W * 0.5, H * 0.35, Math.min(W, H) * 0.15, W * 0.5, H * 0.35, Math.max(W, H) * 0.85);
  vig.addColorStop(0, 'rgba(40, 20, 60, 0)');
  vig.addColorStop(0.55, 'rgba(30, 15, 45, 0.08)');
  vig.addColorStop(1, 'rgba(20, 10, 40, 0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {{ cards: CardRect[], u: number, W: number, H: number }}
 */
export function getCharacterSelectLayout(canvas) {
  const W = canvas.width;
  const H = canvas.height;
  const u = unitScale(canvas);
  const n = 3;
  const gap = 20 * u;
  const cardW = Math.min(240 * u, (W - gap * (n + 1)) / n);
  const cardH = Math.min(320 * u, H * 0.52);
  const totalW = n * cardW + (n - 1) * gap;
  const x0 = (W - totalW) / 2;
  const y0 = H * 0.265;
  /** @type {CardRect[]} */
  const cards = [];
  for (let i = 0; i < n; i++) {
    cards.push({ x: x0 + i * (cardW + gap), y: y0, w: cardW, h: cardH, index: i });
  }
  return { cards, u, W, H };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} mx
 * @param {number} my
 */
export function characterSelectHitTest(canvas, mx, my) {
  const { cards } = getCharacterSelectLayout(canvas);
  for (const c of cards) {
    if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) return c.index;
  }
  return -1;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export function getCharacterSelectBackButtonRect(canvas) {
  const u = unitScale(canvas);
  const pad = 14 * u;
  const bw = 124 * u;
  const bh = 44 * u;
  return { x: pad, y: pad, w: bw, h: bh };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} mx
 * @param {number} my
 */
export function characterSelectBackHitTest(canvas, mx, my) {
  const b = getCharacterSelectBackButtonRect(canvas);
  return mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, w: number, h: number }} rect
 * @param {number} u
 * @param {boolean} hovered
 * @param {boolean} dimmed
 */
export function drawCharacterSelectBackButton(ctx, rect, u, hovered, dimmed) {
  const { x, y, w, h } = rect;
  const r = 12 * u;
  ctx.save();
  ctx.globalAlpha = dimmed ? 0.38 : 1;
  ctx.shadowColor =
    hovered && !dimmed ? 'rgba(210, 85, 115, 0.38)' : 'rgba(45, 30, 60, 0.22)';
  ctx.shadowBlur = hovered && !dimmed ? 20 * u : 9 * u;
  ctx.shadowOffsetY = 4 * u;
  ctx.fillStyle =
    hovered && !dimmed ? 'rgba(255, 252, 255, 0.94)' : 'rgba(255, 255, 255, 0.8)';
  ctx.strokeStyle =
    hovered && !dimmed ? '#c93a52' : 'rgba(105, 78, 118, 0.48)';
  ctx.lineWidth = hovered && !dimmed ? 2.6 * u : 1.7 * u;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = dimmed ? 'rgba(55, 40, 70, 0.45)' : 'rgba(38, 22, 52, 0.88)';
  ctx.font = `bold ${Math.round(15 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.fillText('← 戻る', x + w / 2, y + h / 2);
  ctx.restore();
}

/** Pips per row on character cards (same total track width as the old 4×14u layout). */
const STAT_PIP_COUNT = 3;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} stat filled segments 1–3 (values >3 clamp for display)
 * @param {number} u
 * @param {string} label
 * @param {string} accent
 * @param {number} fade 0–1 — matches card text (`textA`); dims pip outline + empty pips when unselected
 */
function drawStatRow(ctx, x, y, stat, u, label, accent, fade = 1) {
  const gap = 6 * u;
  const pipH = 8 * u;
  /** Match old bar width: 4×(14u + gap) − gap */
  const trackW = 4 * (14 * u + gap) - gap;
  const pipW = (trackW - (STAT_PIP_COUNT - 1) * gap) / STAT_PIP_COUNT;
  const filled = Math.min(STAT_PIP_COUNT, Math.max(0, Math.floor(stat)));
  const f = Math.min(1, Math.max(0, fade));
  const strokeA = 0.2 + 0.68 * f;
  const labelA = 0.28 + 0.57 * f;
  const offPipA = 0.14 + 0.36 * f;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(11 * u)}px monospace`;
  ctx.fillStyle = `rgba(40, 25, 55, ${labelA})`;
  ctx.fillText(label, x, y);
  const lx = x + 64 * u;
  for (let i = 0; i < STAT_PIP_COUNT; i++) {
    const on = i < filled;
    const px = lx + i * (pipW + gap);
    ctx.fillStyle = on ? accent : `rgba(255,255,255,${offPipA})`;
    ctx.beginPath();
    ctx.roundRect(px, y - pipH / 2, pipW, pipH, 3 * u);
    ctx.fill();
    ctx.strokeStyle = `rgba(18, 10, 32, ${strokeA})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {CharacterSelectDrawOpts} opts
 */
export function drawCharacterSelect(ctx, opts) {
  const {
    warmth,
    characters,
    time = 0,
    exitFx = null,
    backHover = false,
    backDimmed = false,
  } = opts;

  const canvas = ctx.canvas;
  const { cards, u, W, H } = getCharacterSelectLayout(canvas);

  const w0 = warmth[0] ?? 0;
  const w1 = warmth[1] ?? 0;
  const w2 = warmth[2] ?? 0;
  const lead = Math.max(w0, w1, w2, 0);
  const focusIdle = lead < 0.06;
  let hoverBi = 0;
  for (let j = 1; j < warmth.length; j++) {
    if ((warmth[j] ?? 0) > (warmth[hoverBi] ?? 0)) hoverBi = j;
  }
  const hoverCharacter = !focusIdle ? characters[hoverBi] ?? null : null;

  const sunFlashOn =
    exitFx?.kind === 'flash' && exitBorderFlashOn(exitFx.t, exitFx.duration);
  drawCharacterSelectBackground(ctx, W, H, u, time, hoverCharacter, sunFlashOn);

  drawCharacterSelectBackButton(
    ctx,
    getCharacterSelectBackButtonRect(canvas),
    u,
    backHover,
    backDimmed,
  );

  const titleY = H * 0.085;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `bold ${Math.round(32 * u)}px Georgia, "Hiragino Mincho ProN", "Yu Mincho", serif`;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 4 * u;
  ctx.lineJoin = 'round';
  ctx.strokeText('Choose your fish', W / 2, titleY);
  ctx.fillStyle = '#3d1f4d';
  ctx.fillText('Choose your fish', W / 2, titleY);

  ctx.font = `${Math.round(16 * u)}px Georgia, "Hiragino Mincho ProN", "Yu Mincho", serif`;
  ctx.strokeStyle = 'rgba(255,255,255,0.52)';
  ctx.lineWidth = 2 * u;
  ctx.strokeText('お魚様を選んでください！', W / 2, titleY + 22 * u);
  ctx.fillStyle = 'rgba(45, 28, 62, 0.88)';
  ctx.fillText('お魚様を選んでください！', W / 2, titleY + 22 * u);

  ctx.font = `${Math.round(11 * u)}px monospace`;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.2 * u;
  ctx.strokeText(
    'フィッシュ・セレクト · HOVER · ENTER · クリック · 運命の決断',
    W / 2,
    titleY + 40 * u,
  );
  ctx.fillStyle = 'rgba(55, 35, 75, 0.7)';
  ctx.fillText(
    'フィッシュ・セレクト · HOVER · ENTER · クリック · 運命の決断',
    W / 2,
    titleY + 40 * u,
  );

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const ch = characters[i];
    const w = warmth[i] ?? 0;
    const dimOthers = lead > 0.08 && w < lead - 0.04;
    const inExitFlash = exitFx?.kind === 'flash' && exitFx.index === i;
    const borderBlinkOn =
      inExitFlash && exitBorderFlashOn(exitFx.t, exitFx.duration);

    const cx = c.x + c.w / 2;
    const cy = c.y + c.h / 2;
    const scale = 1 + 0.08 * w;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    const r = 18 * u;
    const glow = ch.accentGlow;
    const shadowB = (14 + 18 * w) * u;
    ctx.shadowColor = w > 0.08 ? glow : 'rgba(60, 40, 90, 0.35)';
    ctx.shadowBlur = shadowB;
    ctx.shadowOffsetY = 6 * u;

    const frostedActive = !dimOthers && lead > 0.06;

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, c.w, c.h, r);
    ctx.clip();

    if (dimOthers) {
      const bg = ctx.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
      bg.addColorStop(0, 'rgba(255, 252, 255, 0.42)');
      bg.addColorStop(1, 'rgba(245, 240, 255, 0.38)');
      ctx.fillStyle = bg;
      ctx.fillRect(c.x, c.y, c.w, c.h);
    } else if (frostedActive) {
      ctx.fillStyle = 'rgba(236, 242, 252, 0.38)';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      const frost = ctx.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
      frost.addColorStop(0, 'rgba(255, 255, 255, 0.58)');
      frost.addColorStop(0.38, 'rgba(255, 255, 255, 0.1)');
      frost.addColorStop(1, 'rgba(205, 214, 232, 0.32)');
      ctx.fillStyle = frost;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = `${ch.accent}2a`;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      const shine = ctx.createLinearGradient(c.x, c.y, c.x, c.y + c.h * 0.52);
      shine.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      shine.addColorStop(0.45, 'rgba(255, 255, 255, 0.06)');
      shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = shine;
      ctx.fillRect(c.x, c.y, c.w, c.h);
    } else {
      const bg = ctx.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
      bg.addColorStop(0, 'rgba(255, 255, 255, 0.78)');
      bg.addColorStop(0.5, `${ch.accent}22`);
      bg.addColorStop(1, 'rgba(255, 250, 255, 0.72)');
      ctx.fillStyle = bg;
      ctx.fillRect(c.x, c.y, c.w, c.h);
    }
    ctx.restore();

    ctx.shadowColor = w > 0.08 ? glow : 'rgba(60, 40, 90, 0.35)';
    ctx.shadowBlur = shadowB;
    ctx.shadowOffsetY = 6 * u;

    const strokeMix = Math.min(1, w);
    if (borderBlinkOn) {
      ctx.strokeStyle = ch.accent;
      ctx.lineWidth = 3.8 * u;
    } else if (inExitFlash) {
      ctx.strokeStyle = 'rgba(120, 90, 140, 0.5)';
      ctx.lineWidth = 2 * u;
    } else if (frostedActive) {
      ctx.strokeStyle = `rgba(255, 252, 255, ${0.55 + 0.35 * strokeMix})`;
      ctx.lineWidth = 1;
    } else if (dimOthers) {
      ctx.strokeStyle = `rgba(88, 72, 108, ${0.22 + 0.5 * w})`;
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = strokeMix > 0.08 ? ch.accent : 'rgba(120, 90, 140, 0.45)';
      ctx.lineWidth = (2 + 1.5 * w) * u;
    }
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, c.w, c.h, r);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    if (dimOthers) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.roundRect(c.x, c.y, c.w, c.h, r);
      ctx.fill();
      ctx.fillStyle = 'rgba(60, 45, 80, 0.35)';
      ctx.beginPath();
      ctx.roundRect(c.x, c.y, c.w, c.h, r);
      ctx.fill();
    }

    const img = getFishPortraitTexture(ch.assetKey);
    const portraitH = 100 * u;
    let portraitW = 100 * u;
    if (img?.complete && img.naturalWidth > 0) {
      portraitW = portraitH * (img.naturalWidth / img.naturalHeight);
    }
    const px = cx - portraitW / 2;
    const py = c.y + 28 * u;
    let portraitA = 1;
    if (focusIdle) portraitA = 1;
    else portraitA = 0.42 + 0.58 * w;
    if (img?.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = portraitA;
      ctx.drawImage(img, px, py, portraitW, portraitH);
      ctx.restore();
    } else {
      ctx.globalAlpha = Math.max(0.35, portraitA * 0.95);
      ctx.font = `${Math.round(56 * u)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🐟', cx, py + portraitH / 2);
      ctx.globalAlpha = 1;
    }

    const textA = focusIdle ? 1 : 0.55 + 0.45 * w;
    const nameBaseY = c.y + c.h - 112 * u;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(45, 30, 60, ${0.55 + 0.45 * textA})`;
    ctx.font = `bold ${Math.round(20 * u)}px Georgia, serif`;
    ctx.textAlign = 'right';
    ctx.fillText(ch.label, cx - 6 * u, nameBaseY);
    ctx.font = `${Math.round(19 * u)}px Georgia, "Hiragino Mincho ProN", "Yu Mincho", serif`;
    ctx.textAlign = 'left';
    ctx.fillText(ch.jp, cx + 6 * u, nameBaseY);

    ctx.textAlign = 'center';
    ctx.font = `${Math.round(10 * u)}px monospace`;
    ctx.fillStyle = `rgba(75, 50, 95, ${0.5 + 0.4 * textA})`;
    ctx.fillText(ch.romaji, cx, nameBaseY + 15 * u);
    ctx.font = `${Math.round(10 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
    ctx.fillStyle = `rgba(120, 70, 100, ${0.42 + 0.38 * textA})`;
    ctx.fillText(`「${ch.epithet}」`, cx, nameBaseY + 30 * u);

    drawStatRow(ctx, c.x + 22 * u, c.y + c.h - 68 * u, ch.speedStat, u, '速 SPD', ch.accent, textA);
    drawStatRow(ctx, c.x + 22 * u, c.y + c.h - 44 * u, ch.hpStat, u, '体 HP', ch.accent, textA);

    const hpVal = statToHp(ch.hpStat);
    const spMult = statToSpeedMult(ch.speedStat);
    ctx.font = `${Math.round(10 * u)}px monospace`;
    ctx.fillStyle = `rgba(45, 30, 65, ${0.45 + 0.35 * textA})`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `${hpVal} HP · ${spMult.toFixed(1)}× swim · ステータス`,
      cx,
      c.y + c.h - 18 * u,
    );

    ctx.restore();
  }

  if (exitFx?.kind === 'fade' && exitFx.alpha > 0) {
    ctx.fillStyle = `rgba(8, 6, 18, ${exitFx.alpha})`;
    ctx.fillRect(0, 0, W, H);
  }
}
