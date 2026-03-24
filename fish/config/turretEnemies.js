/**
 * Static “bullet hell” enemies: move to a hold point, then fire scripted patterns.
 *
 * `holdAnchor`: corner/side preset, `center` (random point in mid playfield), or `random` among edges only. Override with `holdFrac: { x, y }` in 0–1.
 *
 * Turret `attack` uses vector bullets: speed, life, damage, `projectileSize` (hit radius, design units).
 */

/**
 * @typedef {'random' | 'center' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'} TurretHoldAnchor
 */

/**
 * `aimMode` `radial`: `spreadDeg` are absolute headings from +X (east). Default: aim at player, add `spreadDeg` offsets.
 * @typedef {{
 *   atTick: number,
 *   spreadDeg: number[],
 *   aimMode?: 'player' | 'radial',
 * }} TurretAttackBurst
 */

/**
 * idleBobAmp / idleBobRate: turret idle bounce (optional on TurretEnemyTypeDef).
 * @typedef {{
 *   cycleTicks: number,
 *   firstDelayTicks?: number,
 *   bursts: TurretAttackBurst[],
 *   projectileSpeed: number,
 *   projectileLifeTicks: number,
 *   projectileDamage: number,
 *   projectileSize: number,
 * }} TurretAttackPattern
 */

/**
 * Turrets use `facingMode: 'mirror'` (horizontal flip toward player). Match `spriteFront` to PNG nose (`left` / `right`).
 * @typedef {{
 *   behavior: 'turret',
 *   spriteKey: string,
 *   spriteFront?: 'top' | 'right' | 'bottom' | 'left',
 *   facingMode?: import('./enemies.js').EnemyFacingMode,
 *   emoji?: string,
 *   hp: number,
 *   size: number,
 *   score: number,
 *   knockbackMul?: number,
 *   approachSpd: number,
 *   holdAnchor: TurretHoldAnchor,
 *   holdFrac?: { x: number, y: number },
 *   attack: TurretAttackPattern,
 *   idleBobAmp?: number,
 *   idleBobRate?: number,
 *   glossary?: { label: string, jp: string, description: string },
 * }} TurretEnemyTypeDef
 */

const EDGE = 0.11;

/**
 * @param {number} W
 * @param {number} H
 * @param {TurretHoldAnchor} anchor
 * @param {{ x: number, y: number } | undefined} holdFrac
 */
export function resolveTurretHoldPosition(W, H, anchor, holdFrac) {
  if (
    holdFrac &&
    typeof holdFrac.x === 'number' &&
    typeof holdFrac.y === 'number' &&
    holdFrac.x >= 0 &&
    holdFrac.x <= 1 &&
    holdFrac.y >= 0 &&
    holdFrac.y <= 1
  ) {
    return { x: holdFrac.x * W, y: holdFrac.y * H };
  }

  const mx = EDGE * W;
  const my = EDGE * H;
  const cx0 = W * 0.34;
  const cx1 = W * 0.66;
  const cy0 = H * 0.3;
  const cy1 = H * 0.7;
  /** @type {Record<string, { x: number, y: number }>} */
  const spots = {
    nw: { x: mx, y: my },
    ne: { x: W - mx, y: my },
    sw: { x: mx, y: H - my },
    se: { x: W - mx, y: H - my },
    n: { x: W / 2, y: my },
    s: { x: W / 2, y: H - my },
    e: { x: W - mx, y: H / 2 },
    w: { x: mx, y: H / 2 },
    center: {
      x: cx0 + Math.random() * (cx1 - cx0),
      y: cy0 + Math.random() * (cy1 - cy0),
    },
  };

  let key = anchor;
  if (anchor === 'random') {
    const keys = Object.keys(spots).filter((k) => k !== 'center');
    key = /** @type {keyof typeof spots} */ (keys[Math.floor(Math.random() * keys.length)]);
  }
  const p = spots[key];
  if (p) return { ...p };
  return { x: W / 2, y: H / 2 };
}

/** Ink octopus: tri-shot toward player; same volley cadence + bullet pace as cone snail. */
/** @type {TurretEnemyTypeDef} */
export const MECHOCTO = {
  behavior: 'turret',
  spriteKey: 'octo1',
  spriteFront: 'right',
  facingMode: 'mirror',
  emoji: '🐙',
  hp: 8,
  size: 65,
  score: 90,
  knockbackMul: 0.12,
  approachSpd: 3.0,
  holdAnchor: 'random',
  idleBobAmp: 3.4,
  idleBobRate: 0.1,
  attack: {
    cycleTicks: 180,
    firstDelayTicks: 36,
    bursts: [{ atTick: 0, spreadDeg: [0, -22, 22] }],
    projectileSpeed: 6.65,
    projectileLifeTicks: 205,
    projectileDamage: 8,
    projectileSize: 10,
  },
  glossary: {
    label: 'Ink Octopus',
    jp: '墨タコ砲台',
    description:
      'Hugs the edge and fans ink in three directions.',
  },
};

/** Cone snail: chunky shell, one slug per volley; double RPM vs old (3s cycle @ 60Hz). */
/** @type {TurretEnemyTypeDef} */
export const CONE_SNAIL = {
  behavior: 'turret',
  spriteKey: 'cone_snail',
  spriteFront: 'right',
  facingMode: 'mirror',
  emoji: '🐚',
  hp: 10,
  size: 65,
  score: 85,
  knockbackMul: 0.12,
  approachSpd: 3.0,
  holdAnchor: 'random',
  idleBobAmp: 3.4,
  idleBobRate: 0.1,
  attack: {
    cycleTicks: 180,
    firstDelayTicks: 36,
    bursts: [{ atTick: 0, spreadDeg: [0] }],
    projectileSpeed: 6.65,
    projectileLifeTicks: 205,
    projectileDamage: 8,
    projectileSize: 10,
  },
  glossary: {
    label: 'Cone Snail',
    jp: 'コーン巻貝',
    description:
      'Heavy shell. One fat shot on a steady beat.',
  },
};

/** Starfish: center-ish hold, radial 5-way volley; same fire cycle + bullets as cone snail. */
/** @type {TurretEnemyTypeDef} */
export const STARFISH_TURRET = {
  behavior: 'turret',
  spriteKey: 'starfish',
  spriteFront: 'left',
  facingMode: 'mirror',
  emoji: '⭐',
  hp: 8,
  size: 58,
  score: 88,
  knockbackMul: 0.12,
  approachSpd: 3.0,
  holdAnchor: 'center',
  idleBobAmp: 3.4,
  idleBobRate: 0.1,
  attack: {
    cycleTicks: 180,
    firstDelayTicks: 36,
    bursts: [{ atTick: 0, aimMode: 'radial', spreadDeg: [0, 72, 144, 216, 288] }],
    projectileSpeed: 6.65,
    projectileLifeTicks: 205,
    projectileDamage: 5,
    projectileSize: 9,
  },
  glossary: {
    label: 'Starfish Battery',
    jp: 'ヒトデ砲台',
    description:
      'Five shots in every direction.',
  },
};

/** @type {readonly TurretEnemyTypeDef[]} */
export const TURRET_ENEMY_TYPES = [MECHOCTO, CONE_SNAIL, STARFISH_TURRET];

/** No turrets before this wave */
export const TURRET_FIRST_WAVE = 4;

/**
 * Hard cap per wave (how many turret spawn *attempts* can succeed — still gated by `rollTurretSpawn`).
 * @param {number} wave
 */
export function maxTurretsPerWave(wave) {
  if (wave < TURRET_FIRST_WAVE) return 0;
  if (wave < 8) return 1;
  if (wave < 14) return 2;
  if (wave < 22) return 3;
  return 4;
}

/**
 * @param {number} wave
 */
export function rollTurretSpawn(wave) {
  if (wave < TURRET_FIRST_WAVE) return false;
  const w = wave - TURRET_FIRST_WAVE;
  const p = 0.058 + Math.min(0.052, w * 0.007 + Math.max(0, w - 10) * 0.003);
  return Math.random() < p;
}
