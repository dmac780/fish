import { unitScale } from '../config/units.js';
import {
  drawCharacterSelectBackground,
  getCharacterSelectBackButtonRect,
  drawCharacterSelectBackButton,
} from './drawCharacterSelect.js';
import { getEnemySpriteTexture, getItemTexture, getWeaponTexture } from '../game/assets.js';
import { ENEMY_TYPES } from '../config/enemies.js';
import { TURRET_ENEMY_TYPES } from '../config/turretEnemies.js';
import { OBSTACLE_TYPES } from '../config/obstacleEnemies.js';
import { ITEM_ENEMY_TYPES } from '../config/itemEnemies.js';
import { ITEM_DEFS } from '../config/items.js';
import { WEAPONS } from '../config/weapons.js';
import { BOSSES } from '../config/bosses.js';

export {
  getCharacterSelectBackButtonRect,
  characterSelectBackHitTest,
} from './drawCharacterSelect.js';

/** @typedef {'enemySprite' | 'weaponTexture' | 'itemTexture' | 'emoji'} GlossaryCardKind */

/**
 * @typedef {{
 *   kind: GlossaryCardKind,
 *   spriteKey?: string,
 *   textureKey?: string,
 *   itemId?: string,
 *   emoji?: string,
 *   artScale?: number,
 *   label: string,
 *   jp: string,
 *   description: string,
 *   accent: string,
 *   accentGlow: string,
 * }} GlossaryCard
 */

/**
 * @typedef {{
 *   titleEn: string,
 *   titleJp: string,
 *   accent: string,
 *   accentGlow: string,
 *   cards: GlossaryCard[],
 * }} GlossarySection
 */

const COLS = 3;

/**
 * @param {import('../config/enemies.js').EnemyTypeDef} e
 * @param {string} accent
 * @param {string} glow
 * @returns {GlossaryCard | null}
 */
function cardFromChaser(e, accent, glow) {
  const g = e.glossary;
  if (!g) return null;
  return {
    kind: 'enemySprite',
    spriteKey: e.spriteKey,
    emoji: e.emoji,
    label: g.label,
    jp: g.jp,
    description: g.description,
    accent,
    accentGlow: glow,
  };
}

/**
 * @param {import('../config/turretEnemies.js').TurretEnemyTypeDef} t
 * @param {string} accent
 * @param {string} glow
 */
function cardFromTurret(t, accent, glow) {
  const g = t.glossary;
  if (!g) return null;
  return {
    kind: 'enemySprite',
    spriteKey: t.spriteKey,
    emoji: t.emoji,
    label: g.label,
    jp: g.jp,
    description: g.description,
    accent,
    accentGlow: glow,
  };
}

/**
 * @param {import('../config/itemEnemies.js').ItemEnemyDef} e
 * @param {string} accent
 * @param {string} glow
 */
function cardFromCarrier(e, accent, glow) {
  const g = e.glossary;
  if (!g) return null;
  return {
    kind: 'enemySprite',
    spriteKey: e.spriteKey,
    label: g.label,
    jp: g.jp,
    description: g.description,
    accent,
    accentGlow: glow,
  };
}

/**
 * @param {import('../config/obstacleEnemies.js').ObstacleEnemyDef} o
 * @param {string} accent
 * @param {string} glow
 */
function cardFromObstacle(o, accent, glow) {
  const g = o.glossary;
  if (!g) return null;
  return {
    kind: 'enemySprite',
    spriteKey: o.spriteKey,
    label: g.label,
    jp: g.jp,
    description: g.description,
    accent,
    accentGlow: glow,
  };
}

/**
 * @param {import('../config/items.js').ItemPickupDef} it
 * @param {string} accent
 * @param {string} glow
 */
function cardFromItem(it, accent, glow) {
  const g = it.glossary;
  if (!g) return null;
  return {
    kind: 'itemTexture',
    itemId: it.id,
    label: g.label,
    jp: g.jp,
    description: g.description,
    accent,
    accentGlow: glow,
  };
}

/**
 * @param {import('../config/weapons.js').WeaponDef} w
 * @param {string} accent
 * @param {string} glow
 */
function cardFromWeapon(w, accent, glow) {
  const g = w.glossary;
  if (!g) return null;
  return {
    kind: 'weaponTexture',
    textureKey: w.pickupTextureKey ?? w.textureKey,
    artScale: w.glossary?.glossaryScale ?? 1,
    label: g.label,
    jp: g.jp,
    description: g.description,
    accent,
    accentGlow: glow,
  };
}

/**
 * @param {import('../config/bosses.js').BossDef} b
 * @param {string} accent
 * @param {string} glow
 */
function cardFromBoss(b, accent, glow) {
  const g = b.glossary;
  if (!g) return null;
  return {
    kind: 'enemySprite',
    spriteKey: b.spriteKey,
    emoji: b.emoji,
    label: g.label,
    jp: g.jp,
    description: g.description,
    accent,
    accentGlow: glow,
  };
}

/**
 * Builds sections by reading `glossary` on each config entry only. No separate glossary config file.
 * @returns {GlossarySection[]}
 */
export function buildGlossarySections() {
  const chaserAccent = '#5eead4';
  const chaserGlow = 'rgba(94, 234, 212, 0.45)';
  const turretAccent = '#c4b5fd';
  const turretGlow = 'rgba(196, 181, 253, 0.5)';
  const obstacleAccent = '#34d399';
  const obstacleGlow = 'rgba(52, 211, 153, 0.45)';
  const carrierAccent = '#fcd34d';
  const carrierGlow = 'rgba(252, 211, 77, 0.45)';
  const bossAccent = '#fb7185';
  const bossGlow = 'rgba(251, 113, 133, 0.5)';
  const pickupAccent = '#93c5fd';
  const pickupGlow = 'rgba(147, 197, 253, 0.5)';

  /** @type {GlossarySection[]} */
  const sections = [];

  const chasers = ENEMY_TYPES.map((e) => cardFromChaser(e, chaserAccent, chaserGlow)).filter(Boolean);
  if (chasers.length) {
    sections.push({
      titleJp: '追跡の魚たち',
      titleEn: 'Chasers',
      accent: chaserAccent,
      accentGlow: chaserGlow,
      cards: /** @type {GlossaryCard[]} */ (chasers),
    });
  }

  const turrets = TURRET_ENEMY_TYPES.map((t) => cardFromTurret(t, turretAccent, turretGlow)).filter(
    Boolean,
  );
  if (turrets.length) {
    sections.push({
      titleJp: '据え置き砲台',
      titleEn: 'Turrets',
      accent: turretAccent,
      accentGlow: turretGlow,
      cards: /** @type {GlossaryCard[]} */ (turrets),
    });
  }

  const obstacles = OBSTACLE_TYPES.map((o) => cardFromObstacle(o, obstacleAccent, obstacleGlow)).filter(
    Boolean,
  );
  if (obstacles.length) {
    sections.push({
      titleJp: '障害物',
      titleEn: 'Obstacles',
      accent: obstacleAccent,
      accentGlow: obstacleGlow,
      cards: /** @type {GlossaryCard[]} */ (obstacles),
    });
  }

  const carriers = ITEM_ENEMY_TYPES.map((e) => cardFromCarrier(e, carrierAccent, carrierGlow)).filter(
    Boolean,
  );
  if (carriers.length) {
    sections.push({
      titleJp: 'お届け便',
      titleEn: 'Carriers',
      accent: carrierAccent,
      accentGlow: carrierGlow,
      cards: /** @type {GlossaryCard[]} */ (carriers),
    });
  }

  const bosses = Object.values(BOSSES)
    .map((b) => cardFromBoss(b, bossAccent, bossGlow))
    .filter(Boolean);
  if (bosses.length) {
    sections.push({
      titleJp: 'ボス',
      titleEn: 'Bosses',
      accent: bossAccent,
      accentGlow: bossGlow,
      cards: /** @type {GlossaryCard[]} */ (bosses),
    });
  }

  /** @type {GlossaryCard[]} */
  const pickupsAndWeapons = [];
  for (const it of Object.values(ITEM_DEFS)) {
    if (it.grantsWeaponId) continue;
    const c = cardFromItem(it, pickupAccent, pickupGlow);
    if (c) pickupsAndWeapons.push(c);
  }
  for (const w of Object.values(WEAPONS)) {
    const c = cardFromWeapon(w, pickupAccent, pickupGlow);
    if (c) pickupsAndWeapons.push(c);
  }
  if (pickupsAndWeapons.length) {
    sections.push({
      titleJp: 'アイテム',
      titleEn: 'Pickups',
      accent: pickupAccent,
      accentGlow: pickupGlow,
      cards: pickupsAndWeapons,
    });
  }

  return sections;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxW
 * @param {number} maxLines
 */
function wrapDescription(ctx, text, maxW, maxLines) {
  /** @type {string[]} */
  const lines = [];
  let rest = text.trim();
  while (rest.length > 0 && lines.length < maxLines) {
    let end = 1;
    while (end <= rest.length && ctx.measureText(rest.slice(0, end)).width <= maxW) end += 1;
    if (end > 1) end -= 1;
    else end = 1;
    const tryBreak = rest.slice(0, end);
    const sp = tryBreak.lastIndexOf(' ');
    if (sp > 0 && end < rest.length && sp > end * 0.35) {
      lines.push(tryBreak.slice(0, sp).trimEnd());
      rest = rest.slice(sp + 1).trimStart();
    } else {
      lines.push(tryBreak.trimEnd());
      rest = rest.slice(end).trimStart();
    }
  }
  if (rest.length > 0 && lines.length > 0) {
    const last = lines.length - 1;
    lines[last] = lines[last].replace(/…?$/, '') + '…';
  }
  return lines;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {GlossarySection[]} sections
 */
export function getGlossaryMaxScroll(canvas, sections) {
  const lay = computeGlossaryLayout(canvas, sections);
  return Math.max(0, lay.totalHeight - lay.viewportH);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {GlossarySection[]} sections
 */
function computeGlossaryLayout(canvas, sections) {
  const W = canvas.width;
  const H = canvas.height;
  const u = unitScale(canvas);
  const margin = 12 * u;
  const gap = 7 * u;
  const sectionGap = 9 * u;
  const headerBlock = 24 * u;
  const rowGap = gap;
  const maxCardW = 148 * u;
  const innerW = W - 2 * margin;
  const cardW = Math.min(maxCardW, (innerW - (COLS - 1) * gap) / COLS);
  const cardH = 128 * u;

  const contentTop = H * 0.108 + 22 * u;
  let y = 0;
  for (const sec of sections) {
    if (!sec.cards.length) continue;
    y += headerBlock;
    const rows = Math.ceil(sec.cards.length / COLS);
    y += rows * (cardH + rowGap);
    y += sectionGap;
  }
  const totalHeight = y + 22 * u;
  const viewportH = H - contentTop - 20 * u;
  return {
    W,
    H,
    u,
    margin,
    gap,
    rowGap,
    sectionGap,
    headerBlock,
    cardW,
    cardH,
    cols: COLS,
    contentTop,
    viewportH,
    totalHeight,
  };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} u
 * @param {GlossaryCard} card
 * @param {boolean} hovered
 */
function drawGlossaryCard(ctx, x, y, w, h, u, card, hovered) {
  const r = 11 * u;
  const ac = card.accent;
  const glow = card.accentGlow;

  ctx.save();
  ctx.shadowColor = hovered ? glow : 'rgba(55, 35, 85, 0.2)';
  ctx.shadowBlur = hovered ? 16 * u : 7 * u;
  ctx.shadowOffsetY = 3 * u;

  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  bg.addColorStop(0.45, `${ac}16`);
  bg.addColorStop(1, 'rgba(255, 252, 255, 0.84)');
  ctx.fillStyle = bg;
  ctx.strokeStyle = hovered ? ac : 'rgba(110, 80, 120, 0.38)';
  ctx.lineWidth = hovered ? 2.2 * u : 1.35 * u;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const artH = 42 * u;
  const artY = y + 7 * u;
  const cx = x + w / 2;

  if (card.kind === 'enemySprite' && card.spriteKey) {
    const img = getEnemySpriteTexture(card.spriteKey);
    if (img?.complete && img.naturalWidth > 0) {
      const ih = artH;
      const iw = ih * (img.naturalWidth / img.naturalHeight);
      ctx.drawImage(img, cx - iw / 2, artY, iw, ih);
    } else if (card.emoji) {
      ctx.font = `${Math.round(artH * 0.82)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(card.emoji, cx, artY + artH / 2);
    }
  } else if (card.kind === 'weaponTexture' && card.textureKey) {
    const img = getWeaponTexture(card.textureKey);
    if (img?.complete && img.naturalWidth > 0) {
      const scl = Math.max(0.45, Math.min(1.5, card.artScale ?? 1));
      const iw = Math.min(w - 14 * u, artH * 2.2 * scl);
      const ih = iw * (img.naturalHeight / img.naturalWidth);
      const sy = artY + (artH - ih) / 2;
      ctx.drawImage(img, cx - iw / 2, sy, iw, ih);
    }
  } else if (card.kind === 'itemTexture' && card.itemId) {
    const img = getItemTexture(card.itemId);
    if (img?.complete && img.naturalWidth > 0) {
      const ih = artH;
      const iw = ih * (img.naturalWidth / img.naturalHeight);
      ctx.drawImage(img, cx - iw / 2, artY, iw, ih);
    } else {
      ctx.fillStyle = 'rgba(80, 45, 95, 0.14)';
      ctx.strokeStyle = 'rgba(80, 45, 95, 0.35)';
      ctx.lineWidth = Math.max(1, u);
      const pw = Math.min(w - 22 * u, artH * 1.15);
      const ph = artH * 0.86;
      ctx.beginPath();
      ctx.roundRect(cx - pw / 2, artY + (artH - ph) / 2, pw, ph, 4 * u);
      ctx.fill();
      ctx.stroke();
    }
  } else if (card.kind === 'emoji' && card.emoji) {
    ctx.font = `${Math.round(artH * 0.85)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.emoji, cx, artY + artH / 2);
  }

  let ty = artY + artH + 5 * u;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `bold ${Math.round(11.5 * u)}px Georgia, serif`;
  ctx.fillStyle = 'rgba(35, 22, 48, 0.92)';
  ctx.fillText(card.label, cx, ty);
  ty += 13 * u;
  ctx.font = `${Math.round(10.5 * u)}px Georgia, "Hiragino Mincho ProN", "Yu Mincho", serif`;
  ctx.fillStyle = 'rgba(80, 45, 95, 0.88)';
  ctx.fillText(card.jp, cx, ty);
  ty += 14 * u;

  ctx.font = `${Math.round(8.5 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.textAlign = 'left';
  const descPad = 6 * u;
  const descW = w - descPad * 2;
  const lines = wrapDescription(ctx, card.description, descW, 3);
  ctx.fillStyle = 'rgba(45, 30, 60, 0.78)';
  const lh = 9.5 * u;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x + descPad, ty + i * lh);
  }

  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {GlossaryDrawOpts} opts
 */
export function drawGlossary(ctx, opts) {
  const { sections, scrollY, time = 0, backHover = false, backDimmed = false, mx = -1, my = -1 } =
    opts;
  const canvas = ctx.canvas;
  const lay = computeGlossaryLayout(canvas, sections);
  const { W, H, u, margin, gap, rowGap, sectionGap, headerBlock, cardW, cardH, contentTop, viewportH } =
    lay;

  drawCharacterSelectBackground(ctx, W, H, u, time, null, false);

  const backRect = getCharacterSelectBackButtonRect(canvas);
  drawCharacterSelectBackButton(ctx, backRect, u, backHover, backDimmed);

  const titleY = H * 0.068;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `bold ${Math.round(26 * u)}px Georgia, "Hiragino Mincho ProN", "Yu Mincho", serif`;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3 * u;
  ctx.lineJoin = 'round';
  ctx.strokeText('Fish Archive', W / 2, titleY);
  ctx.fillStyle = '#2f1538';
  ctx.fillText('Fish Archive', W / 2, titleY);
  ctx.font = `${Math.round(13 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.4 * u;
  ctx.strokeText('図鑑', W / 2, titleY + 17 * u);
  ctx.fillStyle = 'rgba(45, 28, 62, 0.86)';
  ctx.fillText('図鑑', W / 2, titleY + 17 * u);
  ctx.font = `${Math.round(9 * u)}px monospace`;
  ctx.fillStyle = 'rgba(55, 35, 75, 0.58)';
  ctx.fillText('WHEEL  ARROWS  ESC', W / 2, titleY + 30 * u);

  ctx.save();
  ctx.beginPath();
  ctx.rect(margin * 0.35, contentTop - 3 * u, W - margin * 0.7, viewportH + 6 * u);
  ctx.clip();

  let y = contentTop - scrollY;
  for (const sec of sections) {
    if (!sec.cards.length) continue;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.round(14 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.6 * u;
    ctx.strokeText(sec.titleJp, W / 2, y + 11 * u);
    ctx.fillStyle = 'rgba(40, 22, 55, 0.9)';
    ctx.fillText(sec.titleJp, W / 2, y + 11 * u);
    ctx.font = `bold ${Math.round(10.5 * u)}px Georgia, serif`;
    ctx.fillStyle = sec.accent;
    ctx.fillText(sec.titleEn, W / 2, y + 22 * u);
    ctx.restore();

    y += headerBlock;

    let row = 0;
    for (let i = 0; i < sec.cards.length; ) {
      const remaining = sec.cards.length - i;
      const inRow = Math.min(COLS, remaining);
      const rowWn = inRow * cardW + (inRow - 1) * gap;
      const sx = (W - rowWn) / 2;
      const cy = y + row * (cardH + rowGap);
      for (let j = 0; j < inRow; j++) {
        const cx = sx + j * (cardW + gap);
        const hovered =
          mx >= 0 &&
          my >= 0 &&
          mx >= cx &&
          mx <= cx + cardW &&
          my >= Math.max(contentTop, cy) &&
          my <= Math.min(contentTop + viewportH, cy + cardH) &&
          my >= contentTop &&
          my <= contentTop + viewportH;
        drawGlossaryCard(ctx, cx, cy, cardW, cardH, u, sec.cards[i], hovered);
        i += 1;
      }
      row += 1;
    }
    const rows = Math.ceil(sec.cards.length / COLS);
    y += rows * (cardH + rowGap) + sectionGap;
  }

  ctx.restore();

  const maxScroll = Math.max(0, lay.totalHeight - viewportH);
  if (maxScroll > 0) {
    const trackX = W - 8 * u;
    const trackH = viewportH;
    const trackY = contentTop;
    ctx.fillStyle = 'rgba(40, 25, 55, 0.22)';
    ctx.beginPath();
    ctx.roundRect(trackX - 2.5 * u, trackY, 5 * u, trackH, 2.5 * u);
    ctx.fill();
    const thumbH = Math.max(20 * u, (viewportH / lay.totalHeight) * trackH);
    const t0 = maxScroll <= 0 ? 0 : scrollY / maxScroll;
    const thumbY = trackY + (trackH - thumbH) * t0;
    ctx.fillStyle = 'rgba(200, 90, 120, 0.5)';
    ctx.beginPath();
    ctx.roundRect(trackX - 2.5 * u, thumbY, 5 * u, thumbH, 2.5 * u);
    ctx.fill();
  }
}

/**
 * @typedef {{
 *   sections: GlossarySection[],
 *   scrollY: number,
 *   time?: number,
 *   backHover?: boolean,
 *   backDimmed?: boolean,
 *   mx?: number,
 *   my?: number,
 * }} GlossaryDrawOpts
 */
