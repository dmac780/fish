import { unitScale } from '../config/units.js';
import { formatRunTime } from './formatRunTime.js';
import { SIM_HZ } from '../config/timing.js';
import { player as playerCfg, enemy as enemyCfg, fishTime as fishTimeCfg } from '../config/gameplay.js';
import { getWeapon } from '../config/weapons.js';
import {
  getWeaponTexture,
  getArmuzzleTexture,
  getFishPortraitTexture,
  getOceanBgTexture,
  getEnemySpriteTexture,
  getVfxTexture,
  getItemTexture,
} from './assets.js';
import { BOSS_DEATH_EXPLOSION } from '../config/vfx.js';
import { gunMirrorYForAim } from './weaponMath.js';
import { SPRITE_FRONT_RADIANS } from '../config/enemies.js';
import { getItemDef } from '../config/items.js';
import { gameConfig } from '../config/gameConfig.js';
import { drawHostilePurpleOrb } from './enemyProjectileStyle.js';
import { drawWorldBubbles } from './bubbleFx.js';

/**
 * Hostile collision outline (matches `obstaclePlayerHit` / `obstacleBulletHit` circle vs AABB).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} e enemy from `state.enemies`
 */
function drawEnemyHitboxDebug(ctx, e) {
  const hw = e.obstacleHitHalfW;
  const hh = e.obstacleHitHalfH;
  ctx.beginPath();
  if (hw != null && hh != null) {
    let top;
    let hgt;
    if (e.dropHoldAnchorBottom) {
      top = e.y - 2 * hh;
      hgt = 2 * hh;
    } else {
      top = e.y - hh;
      hgt = 2 * hh;
    }
    ctx.rect(e.x - hw, top, 2 * hw, hgt);
  } else {
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
  }
  ctx.stroke();
}

/**
 * @param {import('../config/enemies.js').SpriteFront | undefined} front
 * @param {number} dx toward target (e.g. player.x - enemy.x)
 * @param {number} dy
 */
function enemyFaceRotation(front, dx, dy) {
  const f = front ?? 'top';
  const base = SPRITE_FRONT_RADIANS[f];
  if (base === undefined) return 0;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return 0;
  return Math.atan2(dy, dx) - base;
}

/** @param {import('../config/bosses.js').BossDef | undefined} def */
function bossDisplayName(def) {
  const en = def?.label ?? 'BOSS';
  const jp = def?.glossary?.jp;
  return jp ? `${jp} (${en})` : en;
}

function bufferSize(ctx) {
  const c = ctx.canvas;
  return { W: c.width, H: c.height };
}

export function drawWater(ctx) {
  const { W, H } = bufferSize(ctx);
  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(0, 0, W, H);
}

/**
 * Warm desaturated “bullet time” look on the bg only (CSS filter on 2D canvas).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ bulletTimeActive?: boolean }} [opts]
 */
function drawSurvivalOceanBackdrop(ctx, opts = {}) {
  const { W, H } = bufferSize(ctx);
  const bg = getOceanBgTexture();
  ctx.save();
  if (opts.bulletTimeActive) {
    ctx.filter =
      'grayscale(0.72) sepia(0.42) saturate(0.82) contrast(1.06) brightness(0.93)';
  }
  if (bg?.complete && bg.naturalWidth > 0) {
    const iw = bg.naturalWidth;
    const ih = bg.naturalHeight;
    const scale = Math.max(W / iw, H / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/**
 * @param {1|-1} facing — swim left (-1) or right (+1)
 * @param {number} aimAngle — gun aim in radians (mouse)
 * @param {string} weaponId
 * @param {string} characterAssetKey e.g. fish_a
 * @param {number} [gunRecoilAlongU] design units — gun shifts back along barrel (visual only)
 */
export function drawFish(ctx, x, y, facing, aimAngle, invuln, weaponId, characterAssetKey, gunRecoilAlongU = 0) {
  const u = unitScale(ctx.canvas);
  const f = facing >= 0 ? 1 : -1;
  const w = getWeapon(weaponId);
  const tex = getWeaponTexture(w.textureKey);
  const { w: natW, h: natH } = w.spritePx;
  ctx.save();
  ctx.translate(x, y);
  ctx.save();
  ctx.rotate(aimAngle);
  // Mirror from aim (left half-plane), not movement facing — avoids upside-down when strafing vs mouse.
  if (gunMirrorYForAim(aimAngle)) ctx.scale(1, -1);
  ctx.translate(-gunRecoilAlongU * u, 0);
  const gw = natW * u;
  const gh = natH * u;
  const right = w.sprite.rightEdgeAlong * u;
  const gx = right - gw;
  const centerPerp = w.sprite.centerPerp * u;
  const handHalf = ((w.dualPerp ?? 0) * 0.5) * u;
  /**
   * Draw a single gun at local-perp center `cp`.
   * @param {number} cp
   */
  function drawGunAt(cp) {
    const gy = cp - gh / 2;
    if (tex && tex.complete && tex.naturalWidth > 0) {
      ctx.drawImage(tex, gx, gy, gw, gh);
    } else {
      ctx.fillStyle = '#aaa';
      ctx.beginPath();
      ctx.roundRect(gx + 2 * u, gy + 10 * u, 22 * u, 8 * u, 3 * u);
      ctx.fill();
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.roundRect(gx + 20 * u, gy + 11 * u, 6 * u, 6 * u, 2 * u);
      ctx.fill();
    }
  }
  if (w.dualWield) {
    // Back hand first (behind fish), front hand later (over fish) so both are visible.
    drawGunAt(centerPerp - handHalf);
  } else {
    drawGunAt(centerPerp);
  }
  ctx.restore();
  const fishImg = getFishPortraitTexture(characterAssetKey);
  const fh = 38 * u;
  let fw = fh;
  if (fishImg?.complete && fishImg.naturalWidth > 0) {
    fw = fh * (fishImg.naturalWidth / fishImg.naturalHeight);
  }
  ctx.save();
  if (invuln > 0 && Math.floor(invuln / 4) % 2 === 0) ctx.globalAlpha = 0.4;
  ctx.save();
  // Portrait faces left in art; flip with facing like the old emoji
  ctx.scale(-f, 1);
  if (fishImg?.complete && fishImg.naturalWidth > 0) {
    ctx.drawImage(fishImg, -fw / 2, -fh / 2, fw, fh);
  } else {
    ctx.font = `${Math.round(28 * u)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐟', 0, 0);
  }
  ctx.restore();
  if (w.dualWield) {
    ctx.save();
    ctx.rotate(aimAngle);
    if (gunMirrorYForAim(aimAngle)) ctx.scale(1, -1);
    ctx.translate(-gunRecoilAlongU * u, 0);
    drawGunAt(centerPerp + handHalf);
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ muzzleFlashes: Array<{
 *   x: number, y: number, angle: number,
 *   weaponId: string, frame: number, life: number, maxLife: number,
 * }> }} state
 */
/**
 * Boss death sheet strip (same horizontal framing as muzzle flash sheets).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ bossDeathFx: Array<{ x: number, y: number, t: number }> }} state
 */
export function drawBossDeathExplosions(ctx, state) {
  const fxList = state.bossDeathFx;
  if (!fxList?.length) return;
  const u = unitScale(ctx.canvas);
  const img = getVfxTexture(BOSS_DEATH_EXPLOSION.textureKey);
  if (!img?.complete || img.naturalWidth <= 0) return;

  const { frames, frameW, frameH, ticksPerFrame, drawH } = BOSS_DEATH_EXPLOSION;
  const dh = drawH * u;
  const dw = (frameW / frameH) * dh;

  for (const fx of fxList) {
    const fi = Math.min(frames - 1, Math.floor(fx.t / ticksPerFrame));
    const sx = fi * frameW;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.translate(fx.x, fx.y);
    ctx.drawImage(img, sx, 0, frameW, frameH, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }
}

export function drawMuzzleFlashes(ctx, state) {
  const u = unitScale(ctx.canvas);
  const img = getArmuzzleTexture();
  if (!img?.complete || img.naturalWidth <= 0) return;

  for (const mf of state.muzzleFlashes) {
    const w = getWeapon(mf.weaponId);
    const cfg = w.muzzleFlash;
    if (!cfg) continue;
    const { frameW, frameH, frames } = cfg;
    const fi = Math.min(mf.frame, frames - 1);
    const sx = fi * frameW;
    const drawH = cfg.drawH * u;
    const drawW = (frameW / frameH) * drawH;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (mf.life / mf.maxLife) * 1.25);
    ctx.translate(mf.x, mf.y);
    ctx.rotate(mf.angle);
    if (gunMirrorYForAim(mf.angle)) ctx.scale(1, -1);
    ctx.drawImage(img, sx, 0, frameW, frameH, 0, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}

/**
 * Arcade-style interstitial between waves (matches hub JP + display typography).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {number} u
 */
function drawWaveClearBanner(ctx, W, H, u) {
  const cx = W / 2;
  const yMain = H * 0.48;
  const ySub = yMain + Math.round(30 * u);
  const mainPx = Math.round(40 * u);
  const subPx = Math.round(16 * u);
  const fontMain = `900 ${mainPx}px Georgia, "Hiragino Mincho ProN", "Yu Mincho", "Arial Black", sans-serif`;
  const fontSub = `700 ${subPx}px Georgia, "Hiragino Mincho ProN", "Yu Mincho", serif`;
  const lineMain = 'WAVE CLEAR';
  const lineSub = 'ウェーブクリア！';

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  const padX = 48 * u;
  const padY = 22 * u;
  const mainStroke = Math.max(3, 3.2 * u);
  ctx.font = fontMain;
  const twMain = ctx.measureText(lineMain).width;
  ctx.font = fontSub;
  const twSub = ctx.measureText(lineSub).width;
  const tw = Math.max(twMain, twSub);
  const boxW = Math.max(padX * 4.4, tw + padX * 2 + mainStroke * 2);

  ctx.fillStyle = 'rgba(12, 6, 28, 0.55)';
  ctx.beginPath();
  ctx.roundRect(cx - boxW / 2, yMain - padY, boxW, padY * 2 + 26 * u, 10 * u);
  ctx.fill();

  ctx.font = fontMain;
  ctx.lineWidth = mainStroke;
  ctx.strokeStyle = 'rgba(25, 12, 45, 0.96)';
  ctx.fillStyle = '#fffef5';
  ctx.shadowColor = 'rgba(255, 210, 90, 0.55)';
  ctx.shadowBlur = 14 * u;
  ctx.strokeText(lineMain, cx, yMain);
  ctx.shadowBlur = 0;
  ctx.fillText(lineMain, cx, yMain);

  ctx.font = fontSub;
  ctx.lineWidth = Math.max(1.5, 1.8 * u);
  ctx.strokeStyle = 'rgba(35, 18, 52, 0.92)';
  ctx.fillStyle = 'rgba(255, 214, 130, 0.98)';
  ctx.strokeText(lineSub, cx, ySub);
  ctx.fillText(lineSub, cx, ySub);

  ctx.restore();
}

/**
 * “Wave N!” — same panel + gold treatment as `drawWaveClearBanner` (visual consistency).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {number} u
 * @param {number} wave
 */
function drawWaveNumberBanner(ctx, W, H, u, wave) {
  const cx = W / 2;
  const yMain = H * 0.48;
  const ySub = yMain + Math.round(30 * u);
  const mainPx = Math.round(40 * u);
  const subPx = Math.round(16 * u);
  const fontMain = `900 ${mainPx}px Georgia, "Hiragino Mincho ProN", "Yu Mincho", "Arial Black", sans-serif`;
  const fontSub = `700 ${subPx}px Georgia, "Hiragino Mincho ProN", "Yu Mincho", serif`;
  const waveStr = `WAVE ${wave}`;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  const padX = 48 * u;
  const padY = 22 * u;
  const mainStroke = Math.max(3, 3.2 * u);
  ctx.font = fontMain;
  const twMain = ctx.measureText(waveStr).width;
  const jp = `第${wave}ウェーブ`;
  ctx.font = fontSub;
  const twSub = ctx.measureText(jp).width;
  const tw = Math.max(twMain, twSub);
  const boxW = Math.max(padX * 4.4, tw + padX * 2 + mainStroke * 2);

  ctx.fillStyle = 'rgba(12, 6, 28, 0.55)';
  ctx.beginPath();
  ctx.roundRect(cx - boxW / 2, yMain - padY, boxW, padY * 2 + 26 * u, 10 * u);
  ctx.fill();

  ctx.font = fontMain;
  ctx.lineWidth = mainStroke;
  ctx.strokeStyle = 'rgba(25, 12, 45, 0.96)';
  ctx.fillStyle = '#fffef5';
  ctx.shadowColor = 'rgba(255, 210, 90, 0.55)';
  ctx.shadowBlur = 14 * u;
  ctx.strokeText(waveStr, cx, yMain);
  ctx.shadowBlur = 0;
  ctx.fillText(waveStr, cx, yMain);

  ctx.font = fontSub;
  ctx.lineWidth = Math.max(1.5, 1.8 * u);
  ctx.strokeStyle = 'rgba(35, 18, 52, 0.92)';
  ctx.fillStyle = 'rgba(255, 214, 130, 0.98)';
  ctx.strokeText(jp, cx, ySub);
  ctx.fillText(jp, cx, ySub);

  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} u
 * @param {{ id: string, ticksLeft: number, maxTicks: number }} buff
 * @param {{ x: number, y: number }} player
 */
function drawActiveBuffHud(ctx, W, u, buff, player) {
  const x = W - 12 * u;
  const y = 12 * u;
  const w = 138 * u;
  const h = 44 * u;
  const pad = 7 * u;
  const sec = buff.ticksLeft / SIM_HZ;
  const frac = Math.max(0, Math.min(1, buff.ticksLeft / Math.max(1, buff.maxTicks)));
  const icon = getItemTexture(buff.id);
  const def = getItemDef(buff.id);
  const nameJp = def?.glossary?.jp ?? def?.label ?? buff.id;
  const px = x - w;
  const py = y;
  const fishR = 22 * u;
  const overlap =
    player.x + fishR > px &&
    player.x - fishR < px + w &&
    player.y + fishR > py &&
    player.y - fishR < py + h;
  ctx.save();
  if (overlap) ctx.globalAlpha = 0.18;
  ctx.translate(x - w, y);
  ctx.fillStyle = 'rgba(9, 16, 22, 0.28)';
  ctx.strokeStyle = 'rgba(222, 245, 255, 0.38)';
  ctx.lineWidth = Math.max(1, 1.05 * u);
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 8 * u);
  ctx.fill();
  ctx.stroke();
  const ih = h - pad * 2 - 8 * u;
  const iw = icon?.complete && icon.naturalWidth > 0 ? ih * (icon.naturalWidth / icon.naturalHeight) : ih;
  const ix = pad;
  const iy = pad - 1 * u;
  if (icon?.complete && icon.naturalWidth > 0) {
    ctx.drawImage(icon, ix, iy, iw, ih);
  } else {
    ctx.fillStyle = 'rgba(240, 248, 255, 0.3)';
    ctx.beginPath();
    ctx.roundRect(ix, iy, ih, ih, 4 * u);
    ctx.fill();
  }
  ctx.font = `bold ${Math.round(11 * u)}px monospace`;
  ctx.fillStyle = 'rgba(238, 248, 255, 0.94)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${sec.toFixed(1)}s`, w - pad, h * 0.36);
  ctx.font = `${Math.round(10 * u)}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(210, 244, 255, 0.95)';
  const nameX = ix + iw + 6 * u;
  const nameY = h * 0.36;
  const nameW = Math.max(0, w - pad - nameX - 38 * u);
  ctx.fillText(nameJp, nameX, nameY, nameW);
  const bw = w - pad * 2;
  const by = h - 13 * u;
  const bh = 6 * u;
  ctx.fillStyle = 'rgba(238, 246, 255, 0.22)';
  ctx.fillRect(pad, by, bw, bh);
  const g = ctx.createLinearGradient(pad, by, pad + bw, by);
  g.addColorStop(0, '#9be7ff');
  g.addColorStop(1, '#22d3ee');
  ctx.fillStyle = g;
  ctx.fillRect(pad, by, bw * frac, bh);
  ctx.restore();
}

/**
 * @param {{ x: number, y: number }} player
 * @param {{ x: number, y: number, w: number, h: number }} rect
 * @param {number} r
 */
function fishOverlapsRect(player, rect, r) {
  return (
    player.x + r > rect.x &&
    player.x - r < rect.x + rect.w &&
    player.y + r > rect.y &&
    player.y - r < rect.y + rect.h
  );
}

/** @param {number} n */
function pad2(n) {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

/** @param {number} n */
function pad3(n) {
  return String(Math.max(0, Math.floor(n))).padStart(3, '0');
}

/** @param {number} n */
function padScore(n) {
  return String(Math.max(0, Math.floor(n))).padStart(8, '0');
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} u
 * @param {{ x: number, y: number, hp: number }} p
 * @param {{ ammo: number, maxAmmo: number, wave: number, score: number, runElapsedSec?: number }} state
 */
function drawTopHudPills(ctx, W, u, p, state) {
  const fishR = 22 * u;
  const left = { x: 12 * u, y: 12 * u, w: 200 * u, h: 34 * u };
  const hudFont = `bold ${Math.round(11.5 * u)}px monospace`;

  ctx.save();
  if (fishOverlapsRect(p, left, fishR)) ctx.globalAlpha = 0.18;
  ctx.fillStyle = 'rgba(9, 16, 22, 0.28)';
  ctx.strokeStyle = 'rgba(222, 245, 255, 0.38)';
  ctx.lineWidth = Math.max(1, 1.05 * u);
  ctx.beginPath();
  ctx.roundRect(left.x, left.y, left.w, left.h, 8 * u);
  ctx.fill();
  ctx.stroke();
  ctx.font = hudFont;
  ctx.fillStyle = 'rgba(238, 248, 255, 0.96)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `HP ${pad3(p.hp)}   |   AMMO ${pad2(state.ammo)}/${pad2(state.maxAmmo)}`,
    left.x + left.w / 2,
    left.y + left.h / 2,
  );
  ctx.restore();

  const timeStr = formatRunTime(state.runElapsedSec ?? 0);
  const centerLine = `WAVE ${pad2(state.wave)} | SCORE ${padScore(state.score)} | TIME ${timeStr}`;
  ctx.save();
  ctx.font = hudFont;
  const tw = ctx.measureText(centerLine).width;
  const padX = 10 * u;
  const padY = 6 * u;
  const cy = 12 * u + 17 * u;
  const centerHit = {
    x: W / 2 - tw / 2 - padX,
    y: cy - 14 * u,
    w: tw + padX * 2,
    h: 28 * u,
  };
  if (fishOverlapsRect(p, centerHit, fishR)) ctx.globalAlpha = 0.18;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(238, 248, 255, 0.96)';
  ctx.shadowColor = 'rgba(5, 12, 22, 0.55)';
  ctx.shadowBlur = 4 * u;
  ctx.fillText(centerLine, W / 2, cy);
  ctx.shadowBlur = 0;
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {number} u
 * @param {{ x: number, y: number }} p
 * @param {{ fishTimeMeter?: number, fishTimeVisualActive?: boolean }} state
 * @param {string} keyDisplay bound key label (from `formatKeyDisplay`)
 */
function drawFishTimeHud(ctx, W, H, u, p, state, keyDisplay) {
  const ft = fishTimeCfg;
  if (!ft?.enabled) return;
  const maxV = ft.meterMax;
  const m = Math.max(0, Math.min(maxV, state.fishTimeMeter ?? 0));
  const frac = maxV > 0 ? m / maxV : 0;
  const barW = Math.min(360 * u, W * 0.52);
  const barH = 9 * u;
  const x = (W - barW) / 2;
  const y = H - 24 * u - barH;
  const labelY = y - 4 * u;
  const titleY = labelY - 11 * u;
  const fishR = 22 * u;
  const hit = {
    x: x - 10 * u,
    y: titleY - 2 * u,
    w: barW + 20 * u,
    h: barH + (y - titleY) + 8 * u,
  };
  ctx.save();
  if (fishOverlapsRect(p, hit, fishR)) ctx.globalAlpha = 0.22;
  ctx.fillStyle = 'rgba(9, 16, 22, 0.38)';
  ctx.strokeStyle = state.fishTimeVisualActive
    ? 'rgba(120, 230, 255, 0.88)'
    : 'rgba(170, 220, 255, 0.45)';
  ctx.lineWidth = Math.max(1, 1.05 * u);
  ctx.beginPath();
  ctx.roundRect(x, y, barW, barH, 5 * u);
  ctx.fill();
  ctx.stroke();
  if (frac > 0) {
    ctx.fillStyle = state.fishTimeVisualActive ? 'rgba(96, 210, 255, 0.95)' : 'rgba(100, 190, 240, 0.62)';
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(0, barW * frac), barH, 5 * u);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = `bold ${Math.round(10 * u)}px Georgia, "Hiragino Mincho ProN", "Yu Mincho", monospace`;
  ctx.fillStyle = 'rgba(238, 248, 255, 0.88)';
  ctx.fillText('バレットタイム · BULLET TIME', W / 2, titleY);
  ctx.font = `${Math.round(8 * u)}px monospace`;
  ctx.fillStyle = 'rgba(210, 228, 240, 0.72)';
  ctx.fillText(`${keyDisplay} 長押し · HOLD`, W / 2, labelY);
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} state
 * @param {{ bulletTimeKeyDisplay?: string }} [ui]
 */
export function renderWorld(ctx, state, ui = {}) {
  const { W, H } = bufferSize(ctx);
  const u = unitScale(ctx.canvas);
  const br = 5 * u;
  const playerBulletColor = state.activeBuff?.projectileColor ?? '#ffe066';
  ctx.save();
  ctx.translate(state.screenShakeX, state.screenShakeY);
  drawSurvivalOceanBackdrop(ctx, { bulletTimeActive: !!state.fishTimeVisualActive });

  for (const b of state.bullets) {
    ctx.save();
    ctx.fillStyle = playerBulletColor;
    ctx.shadowColor = playerBulletColor;
    ctx.shadowBlur = 6 * u;
    ctx.beginPath();
    ctx.arc(b.x, b.y, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const inkBullets = state.enemyBullets;
  if (inkBullets?.length) {
    const ring = Math.max(1.5 * u, 2);
    for (const eb of inkBullets) {
      ctx.save();
      const intense = eb.flavor === 'godRed';
      drawHostilePurpleOrb(ctx, eb.x, eb.y, eb.r, u, ring, intense);
      ctx.restore();
    }
  }

  for (const pt of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, pt.life / 20);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const pendingObs = state.pendingObstacles;
  if (pendingObs?.length) {
    const sz = 11 * u;
    for (const po of pendingObs) {
      const dur = po.warnDurationTicks;
      const cyc = po.warnOpacityCycles ?? 3;
      const t = dur > 0 ? po.warnElapsed / dur : 1;
      const pulse = Math.pow(Math.sin(t * cyc * Math.PI * 2), 2);
      const alpha = 0.12 + 0.42 * pulse;
      const wy = po.warnY ?? po.y;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(po.warnX, wy);
      const dhDef = /** @type {import('../config/obstacleEnemies.js').ObstacleDropHoldDef} */ (po.def);
      if (po.def.flavor === 'drop_hold' && !dhDef.dropHoldFromBottom) ctx.rotate(Math.PI);
      ctx.fillStyle = '#c42828';
      ctx.strokeStyle = 'rgba(90,20,20,0.45)';
      ctx.lineWidth = Math.max(1, u * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, -sz);
      ctx.lineTo(sz * 0.95, sz * 0.62);
      ctx.lineTo(-sz * 0.95, sz * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.font = `${Math.round(16 * u)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e85555';
      ctx.fillText('⚠', 0, 0);
      ctx.restore();
    }
  }

  const p = state.player;
  const boss = state.boss;
  if (boss && boss.hp > 0) {
    const vis = boss.visualScale ?? 1;
    /** Larger draw multiplier than chasers so bosses read clearly on screen */
    const drawH = boss.hitR * 1.82 * vis;
    const sprite =
      boss.spriteKey && typeof boss.spriteKey === 'string'
        ? getEnemySpriteTexture(boss.spriteKey)
        : null;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    const hf = boss.hitFlashTicks ?? 0;
    if (hf > 0) {
      const t = hf / enemyCfg.hitFlashTicks;
      const lo = enemyCfg.hitFlashMinAlpha;
      ctx.globalAlpha = lo + (1 - lo) * (1 - t);
    }
    const bdef = boss.def;
    let mirrorFace;
    if (bdef?.spriteOscillateFacing) {
      const period = Math.max(8, bdef.spriteOscillateFacingPeriodTicks ?? 240);
      const ph = boss.spriteFacingPhase ?? 0;
      mirrorFace = Math.sin((2 * Math.PI * ph) / period) >= 0 ? 1 : -1;
    } else {
      mirrorFace = p.x >= boss.x ? 1 : -1;
    }
    if (sprite?.complete && sprite.naturalWidth > 0) {
      const drawW = drawH * (sprite.naturalWidth / sprite.naturalHeight);
      const front = /** @type {import('../config/enemies.js').SpriteFront | undefined} */ (
        boss.spriteFront
      );
      const flip = front === 'right' ? mirrorFace : -mirrorFace;
      ctx.scale(flip, 1);
      ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
    } else if (boss.emoji) {
      const eFront = /** @type {import('../config/enemies.js').SpriteFront | undefined} */ (boss.spriteFront);
      const emojiFlip = eFront === 'right' ? mirrorFace : -mirrorFace;
      ctx.scale(emojiFlip, 1);
      ctx.font = `${drawH}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(boss.emoji, 0, 0);
    }
    ctx.restore();

    const bw = boss.hitR * 2.4;
    const bh = 7 * u;
    const margin = 10 * u;
    const gap = 6 * u;
    const halfH = drawH * 0.55;
    const cy = boss.y;
    const topIfAbove = cy - halfH - gap - bh;
    const botIfBelow = cy + halfH + gap + bh;
    let byTop;
    if (topIfAbove < margin && botIfBelow <= H - margin) {
      byTop = cy + halfH + gap;
    } else if (botIfBelow > H - margin && topIfAbove >= margin) {
      byTop = cy - halfH - gap - bh;
    } else if (topIfAbove < margin) {
      byTop = cy + halfH + gap;
    } else {
      byTop = cy - halfH - gap - bh;
    }
    /** Keep bar + label clear of top HUD pills (wave / score / time). */
    const topHudReserve = 52 * u;
    const belowBarTop = cy + halfH + gap;
    if (byTop < topHudReserve) {
      if (belowBarTop + bh <= H - margin) byTop = belowBarTop;
      else byTop = Math.max(byTop, topHudReserve);
    }
    ctx.save();
    ctx.fillStyle = '#1a0508';
    ctx.fillRect(boss.x - bw / 2, byTop, bw, bh);
    const frac = boss.hp / boss.maxHp;
    ctx.fillStyle = '#c44';
    ctx.fillRect(boss.x - bw / 2, byTop, bw * frac, bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(1, u * 0.35);
    ctx.strokeRect(boss.x - bw / 2, byTop, bw, bh);
    ctx.font = `${Math.round(13 * u)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eef6ff';
    const bossName = bossDisplayName(boss.def);
    if (byTop < cy) {
      ctx.textBaseline = 'bottom';
      ctx.fillText(bossName, boss.x, byTop - 4 * u);
    } else {
      ctx.textBaseline = 'top';
      ctx.fillText(bossName, boss.x, byTop + bh + 4 * u);
    }
    ctx.restore();
  }

  if (boss && boss.enrageWarningTicks > 0) {
    const w =
      boss.enrageWarningTicks /
      Math.max(1, SIM_HZ * (boss.def?.enrageWarningSeconds ?? 2));
    const pulse = 0.65 + 0.35 * Math.sin((1 - w) * Math.PI * 10);
    ctx.save();
    ctx.globalAlpha = 0.82 * pulse;
    ctx.fillStyle = 'rgba(120, 12, 28, 0.55)';
    ctx.fillRect(0, 0, W, H * 0.14);
    ctx.globalAlpha = 1;
    ctx.font = `bold ${Math.round(26 * u)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffccd0';
    ctx.strokeStyle = '#4a0008';
    ctx.lineWidth = Math.max(2, u * 0.6);
    const msg = `${bossDisplayName(boss.def)} / ENRAGE`;
    ctx.strokeText(msg, W / 2, H * 0.065);
    ctx.fillText(msg, W / 2, H * 0.065);
    ctx.font = `${Math.round(14 * u)}px monospace`;
    ctx.fillStyle = '#ffc8c8';
    ctx.fillText('25% HP / attacks accelerate', W / 2, H * 0.11);
    ctx.restore();
  }

  for (const e of state.enemies) {
    const vis = e.visualScale ?? 1;
    const drawH = e.size * 1.4 * vis;
    const sprite =
      e.spriteKey && typeof e.spriteKey === 'string'
        ? getEnemySpriteTexture(e.spriteKey)
        : null;

    // Hook: fishing line from top. Coral (bottom drop_hold): art is the whole obstacle — no tether.
    if (e.behavior === 'obstacle' && e.obstacleFlavor === 'drop_hold' && !e.dropHoldFromBottom) {
      const attachY = e.y - drawH * 0.48;
      ctx.save();
      ctx.strokeStyle = 'rgba(55, 48, 40, 0.9)';
      ctx.lineWidth = Math.max(1.1, u * 0.5);
      ctx.beginPath();
      ctx.moveTo(e.x, 0);
      ctx.lineTo(e.x, attachY);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120, 110, 98, 0.35)';
      ctx.lineWidth = Math.max(2.2, u * 1.1);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(e.x, 0);
      ctx.lineTo(e.x, attachY);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.behavior === 'turret') {
      ctx.translate(0, e.turretBobY ?? 0);
    }

    const hf = e.hitFlashTicks ?? 0;
    if (hf > 0) {
      const t = hf / enemyCfg.hitFlashTicks;
      const lo = enemyCfg.hitFlashMinAlpha;
      ctx.globalAlpha = lo + (1 - lo) * (1 - t);
    }

    if (sprite?.complete && sprite.naturalWidth > 0) {
      const drawW = drawH * (sprite.naturalWidth / sprite.naturalHeight);
      const ft = e.fixedTravelMirror;
      if (e.obstacleFlavor === 'drop_hold') {
        if (e.dropHoldAnchorBottom) {
          ctx.drawImage(sprite, -drawW / 2, -drawH, drawW, drawH);
        } else {
          ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
        }
      } else if (ft === 1 || ft === -1) {
        ctx.scale(-ft, 1);
        ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
      } else if (e.facingMode === 'mirror') {
        const face = p.x >= e.x ? 1 : -1;
        const front = /** @type {import('../config/enemies.js').SpriteFront | undefined} */ (
          e.spriteFront
        );
        const flip = front === 'right' ? face : -face;
        ctx.scale(flip, 1);
        ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        const rot = enemyFaceRotation(
          /** @type {import('../config/enemies.js').SpriteFront | undefined} */ (e.spriteFront),
          p.x - e.x,
          p.y - e.y,
        );
        ctx.rotate(rot);
        ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
      }
    } else if (e.emoji) {
      const face = p.x >= e.x ? 1 : -1;
      if (e.facingMode === 'mirror') {
        const front = /** @type {import('../config/enemies.js').SpriteFront | undefined} */ (
          e.spriteFront
        );
        ctx.scale(front === 'right' ? face : -face, 1);
      } else {
        ctx.scale(-face, 1);
      }
      ctx.font = `${drawH}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.emoji, 0, 0);
    }
    ctx.restore();

    if (e.maxHp > 1) {
      const bob = e.behavior === 'turret' ? e.turretBobY ?? 0 : 0;
      const cy = e.y + bob;
      const margin = 10 * u;
      const gap = 6 * u;
      const bh = 5 * u;
      const halfH = drawH / 2;
      const topIfAbove = cy - halfH - gap - bh;
      const botIfBelow = cy + halfH + gap + bh;
      let by;
      if (topIfAbove < margin && botIfBelow <= H - margin) {
        by = halfH + gap;
      } else if (botIfBelow > H - margin && topIfAbove >= margin) {
        by = -halfH - gap - bh;
      } else if (topIfAbove < margin) {
        by = halfH + gap;
      } else {
        by = -halfH - gap - bh;
      }
      ctx.save();
      ctx.translate(e.x, cy);
      const bw = e.size * 1.6 * vis;
      const bx = -bw / 2;
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#4c4' : '#f84';
      ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
      ctx.restore();
    }
  }

  if (gameConfig.devMode && gameConfig.showHitboxes) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 140, 72, 0.9)';
    ctx.lineWidth = Math.max(1.25, u * 0.3);
    ctx.setLineDash([4 * u, 3 * u]);
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      drawEnemyHitboxDebug(ctx, e);
    }
    const boss = state.boss;
    if (boss && boss.hp > 0) {
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.hitR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  const pickups = state.worldPickups;
  if (pickups?.length) {
    const tGlow = typeof performance !== 'undefined' ? performance.now() : 0;
    for (const pk of pickups) {
      const idf = getItemDef(pk.itemId);
      if (!idf) continue;
      const pulse = 0.55 + 0.45 * Math.sin(tGlow / 220 + pk.x * 0.01);
      ctx.save();
      ctx.translate(pk.x, pk.y);
      ctx.globalAlpha = 0.35 + 0.25 * pulse;
      const gr = idf.pickRadius * u * 1.35;
      const g = ctx.createRadialGradient(0, 0, 2 * u, 0, 0, gr);
      g.addColorStop(0, 'rgba(120, 255, 160, 0.95)');
      g.addColorStop(0.45, 'rgba(60, 220, 120, 0.4)');
      g.addColorStop(1, 'rgba(40, 180, 90, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, gr, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowColor = '#44ff88';
      ctx.shadowBlur = 14 * u;
      const wDrop = idf.grantsWeaponId ? getWeapon(idf.grantsWeaponId) : null;
      const gunTex = wDrop ? getWeaponTexture(wDrop.pickupTextureKey ?? wDrop.textureKey) : null;
      const itemTex = getItemTexture(idf.id);
      if (gunTex?.complete && gunTex.naturalWidth > 0) {
        const gh = 26 * u;
        const gw = gh * (gunTex.naturalWidth / gunTex.naturalHeight);
        ctx.drawImage(gunTex, -gw / 2, -gh / 2, gw, gh);
      } else if (itemTex?.complete && itemTex.naturalWidth > 0) {
        const ih = 28 * u;
        const iw = ih * (itemTex.naturalWidth / itemTex.naturalHeight);
        ctx.drawImage(itemTex, -iw / 2, -ih / 2, iw, ih);
      } else {
        ctx.font = `${Math.round(26 * u)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(idf.emoji, 0, 0);
      }
      ctx.restore();
    }
  }

  drawWorldBubbles(ctx, state.playerBubbles, u);

  drawFish(
    ctx,
    p.x,
    p.y,
    p.facing,
    p.aimAngle,
    state.invuln,
    state.weaponId,
    state.characterAssetKey,
    state.gunRecoilAlongU,
  );
  drawMuzzleFlashes(ctx, state);
  drawBossDeathExplosions(ctx, state);

  if (gameConfig.devMode && gameConfig.showHitboxes) {
    const hr = playerCfg.hitRadius * u;
    ctx.save();
    ctx.strokeStyle = 'rgba(72, 255, 160, 0.92)';
    ctx.lineWidth = Math.max(1.25, u * 0.3);
    ctx.setLineDash([4 * u, 3 * u]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, hr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (state.reloading) {
    const rt = getWeapon(state.weaponId).fire.reloadTicks;
    const progress = 1 - state.reloadTimer / rt;
    const bw = 44 * u;
    const bh = 5 * u;
    ctx.fillStyle = '#333';
    ctx.fillRect(p.x - bw / 2, p.y - 28 * u, bw, bh);
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(p.x - bw / 2, p.y - 28 * u, bw * progress, bh);
  }

  if (
    state.enemies.length === 0 &&
    state.enemiesLeft === 0 &&
    !state.boss &&
    state.nextWave
  ) {
    drawWaveClearBanner(ctx, W, H, u);
  }

  const wb = state.waveBanner;
  if (wb.timeLeft > 0 && wb.wave != null) {
    drawWaveNumberBanner(ctx, W, H, u, wb.wave);
  }

  if (state.activeBuff) {
    drawActiveBuffHud(ctx, W, u, state.activeBuff, p);
  }

  drawTopHudPills(ctx, W, u, p, state);
  drawFishTimeHud(ctx, W, H, u, p, state, ui.bulletTimeKeyDisplay ?? 'Space');

  if (state.damageFlash > 0) {
    const maxT = playerCfg.damageFlashTicks;
    const peak = playerCfg.damageFlashAlphaPeak;
    const a = (state.damageFlash / maxT) * peak;
    ctx.save();
    ctx.fillStyle = `rgba(200, 48, 58, ${a})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  ctx.restore();
}
