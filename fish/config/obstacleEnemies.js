/**
 * Obstacles: environmental hazards (not turrets/chasers).
 *
 * `flavor: 'cross'` — enters from one side, crosses the screen, despawns off the far edge (warn first).
 * `flavor: 'drop_hold'` — warn at edge, moves in, holds, then leaves (hook from top or coral from bottom).
 * `dropHoldFromBottom` — rise from below, retract downward.
 * `dropHoldAnchorBottom` — `y` is bottom of sprite/hitbox (spike rooted at floor); omit tether.
 */

import { SIM_HZ } from './timing.js';

/**
 * @typedef {{
 *   id: string,
 *   flavor: 'cross',
 *   spriteKey: string,
 *   spriteFront: 'top' | 'right' | 'bottom' | 'left',
 *   fixedTravelMirror?: 1 | -1,
 *   size: number,
 *   crossSpeed: number,
 *   warnDurationTicks: number,
 *   warnOpacityCycles: number,
 *   contactDamage: number,
 *   score: number,
 *   visualScale?: number,
 *   obstacleInvulnerable?: boolean,
 *   glossary?: { label: string, jp: string, description: string },
 * }} ObstacleCrossDef
 */

/**
 * Drop-hold obstacles (hook / coral). Coral-only: `coralRiseMinTravelFrac` = min fraction of full bottom-anchor
 * travel; `coralMinVisibleSpriteFrac` = min fraction of drawn sprite height that must intersect the playfield.
 * @typedef {{
 *   id: string,
 *   flavor: 'drop_hold',
 *   spriteKey: string,
 *   spriteFront: 'top' | 'right' | 'bottom' | 'left',
 *   size: number,
 *   hitHalfW: number,
 *   hitHalfH: number,
 *   dropSpeed: number,
 *   retractSpeed: number,
 *   holdTicks: number,
 *   warnDurationTicks: number,
 *   warnOpacityCycles: number,
 *   contactDamage: number,
 *   score: number,
 *   visualScale?: number,
 *   obstacleInvulnerable?: boolean,
 *   dropHoldFromBottom?: boolean,
 *   dropHoldAnchorBottom?: boolean,
 *   coralBottomClipU?: number,
 *   coralRiseMinTravelFrac?: number,
 *   coralMinVisibleSpriteFrac?: number,
 *   glossary?: { label: string, jp: string, description: string },
 * }} ObstacleDropHoldDef
 */

/** @typedef {ObstacleCrossDef | ObstacleDropHoldDef} ObstacleEnemyDef */

/** Long eel: left → right after warning. */
/** @type {ObstacleEnemyDef} */
export const LONG_EEL = {
  id: 'long_eel',
  flavor: 'cross',
  spriteKey: 'long_eel',
  spriteFront: 'left',
  fixedTravelMirror: 1,
  size: 56,
  crossSpeed: 5.4,
  warnDurationTicks: 84,
  warnOpacityCycles: 3,
  contactDamage: 16,
  score: 30,
  visualScale: 1.05,
  obstacleInvulnerable: true,
  glossary: {
    label: 'Long Eel',
    jp: 'ロングイール',
    description:
      'A full-lane dash hazard. Warning first, then a fast left-to-right body sweep.',
  },
};

/** Fishing hook: warning at top → drops to a random depth → holds 5s → zips back up. */
/** @type {ObstacleDropHoldDef} */
export const FISHING_HOOK = {
  id: 'fishing_hook',
  flavor: 'drop_hold',
  spriteKey: 'fishing_hook',
  spriteFront: 'top',
  size: 48,
  hitHalfW: 25,
  hitHalfH: 50,
  dropSpeed: 4.2,
  retractSpeed: 16,
  holdTicks: 5 * SIM_HZ,
  warnDurationTicks: 84,
  warnOpacityCycles: 3,
  contactDamage: 14,
  score: 28,
  visualScale: 1,
  obstacleInvulnerable: true,
  glossary: {
    label: 'Fishing Hook',
    jp: '釣り針',
    description:
      'Drops from above, lingers, then snaps upward. Stay clear of the line and barb.',
  },
};

/**
 * Tall coral spike: PNG 72×233 — drawn large, bottom-anchored so it grows from the floor (no gap below).
 */
/** @type {ObstacleDropHoldDef} */
export const CORAL_OBSTACLE = {
  id: 'coral_obstacle',
  flavor: 'drop_hold',
  spriteKey: 'coral',
  spriteFront: 'bottom',
  dropHoldFromBottom: true,
  dropHoldAnchorBottom: true,
  /** Logical scale for hit + motion; draw uses size×1.4×visualScale */
  size: 154,
  hitHalfW: 38,
  hitHalfH: 118,
  dropSpeed: 3.6,
  retractSpeed: 15,
  holdTicks: 5 * SIM_HZ,
  warnDurationTicks: 84,
  warnOpacityCycles: 3,
  contactDamage: 14,
  score: 28,
  visualScale: 1.22,
  obstacleInvulnerable: true,
  /** Sprite bottom stays ≥ H + this×u so the ugly base is clipped below the screen. */
  coralBottomClipU: 4,
  /** Least anchor travel as a fraction of full rise; paired with `coralMinVisibleSpriteFrac` so tall art can’t stay hidden. */
  coralRiseMinTravelFrac: 0.5,
  /** At least this much of the drawn height must be on-screen at hold (matches `render.js` drawH). */
  coralMinVisibleSpriteFrac: 0.5,
  glossary: {
    label: 'Coral Spire',
    jp: '珊瑚の塔',
    description:
      'A big spike that punches up from the seabed, holds, then drops away.',
  },
};

/** @type {readonly ObstacleEnemyDef[]} */
export const OBSTACLE_TYPES = [LONG_EEL, FISHING_HOOK, CORAL_OBSTACLE];

export const OBSTACLE_FIRST_WAVE = 5;

/** @param {number} wave */
export function maxObstaclesPerWave(wave) {
  if (wave < OBSTACLE_FIRST_WAVE) return 0;
  if (wave < 10) return 1;
  if (wave < 16) return 2;
  if (wave < 24) return 3;
  return 4;
}

/** @param {number} wave */
export function rollObstacleSpawn(wave) {
  if (wave < OBSTACLE_FIRST_WAVE) return false;
  const w = wave - OBSTACLE_FIRST_WAVE;
  return Math.random() < 0.068 + Math.min(0.048, w * 0.005 + Math.max(0, w - 8) * 0.004);
}
