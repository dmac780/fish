/**
 * Boss definitions: stats + tuning for pattern scripts in `game/bosses/`.
 * A boss spawns every `BOSS_WAVE_INTERVAL` waves (10, 20, …) alongside normal spawns.
 */

import { SIM_HZ } from './timing.js';

/** First wave that includes a boss */
export const BOSS_FIRST_WAVE = 10;

/** Spawn a boss every N waves (10 → 20 → 30 …) */
export const BOSS_WAVE_INTERVAL = 10;

/**
 * @param {number} wave
 * @returns {boolean}
 */
export function isBossWave(wave) {
  return wave >= BOSS_FIRST_WAVE && wave % BOSS_WAVE_INTERVAL === 0;
}

export const OCTOROBO = {
  id: 'octorobo',
  logicKey: 'octorobo',
  label: 'Octorobo',
  spriteKey: 'mechocto1',
  /** PNG faces −X (left); mirror flip matches turret / shrimp `left` convention */
  spriteFront: 'left',
  facingMode: 'mirror',
  emoji: '🐙',
  hp: 125,
  /** Hit radius (design units × unitScale) */
  size: 80,
  visualScale: 1.72,
  score: 850,
  approachSpeed: 2.85,
  combatMoveSpeed: 2.15,
  contactDamage: 12,
  knockbackMul: 0.05,
  /** Enter from above; combat anchor Y as fraction of canvas height */
  centerYFrac: 0.36,
  enrageHpFraction: 0.25,
  enrageSpeedMul: 1.15,
  enrageWarningSeconds: 2,
  spiral: {
    /** How many full rotations per spiral volley */
    rotations: 3,
    volley1EmitIntervalTicks: 3,
    volley1AngleStepRad: 0.4,
    volley2EmitIntervalTicks: 5,
    volley2AngleStepRad: 0.3,
    gapBetweenVolleysTicks: 120,
    /** Slower = readable travel (design units/tick × unitScale) */
    bulletSpeed: 5.1,
    bulletLifeTicks: 260,
    bulletDamage: 9,
    bulletSize: 11,
  },
  strafe: {
    shotIntervalTicks: 52,
    bulletSpeed: 4.1,
    bulletLifeTicks: 280,
    bulletDamage: 8,
    bulletSize: 10,
    spreadDeg: [0, -22, 22],
  },
  glossary: {
    label: 'Octorobo',
    jp: 'オクトロボ',
    description:
      'Clockwork octopus with a flair for spirals.',
  },
};

export const KING_BOOT = {
  id: 'king_boot',
  logicKey: 'kingBoot',
  label: 'King Boot',
  spriteKey: 'king_boot',
  spriteFront: 'left',
  facingMode: 'mirror',
  emoji: '🥾',
  hp: 150,
  size: 96,
  visualScale: 1.58,
  score: 1100,
  approachSpeed: 2.65,
  combatMoveSpeed: 2.05,
  contactDamage: 11,
  knockbackMul: 0.06,
  centerYFrac: 0.35,
  enrageHpFraction: 0.25,
  enrageSpeedMul: 1.12,
  enrageWarningSeconds: 2,
  /** Slow aimed orbs: one after another, then pause; repeats forever */
  orbs: {
    emitIntervalTicks: 11,
    volleyCount: 8,
    pauseTicks: 52,
    bulletSpeed: 2.55,
    bulletLifeTicks: 450,
    bulletDamage: 10,
    bulletSize: 20,
    /** Degrees added to aim-at-player per shot in volley (cycles if shorter than volleyCount). */
    spreadDeg: [-16, -9, -4, 0, 4, 9, 16, -7],
  },
  /** Fired once after roaming through all four corners */
  radial: {
    count: 12,
    bulletSpeed: 2.35,
    bulletLifeTicks: 400,
    bulletDamage: 9,
    bulletSize: 17,
  },
  /**
   * Faster bullets in a rotating spiral around the boot; on a cooldown between bursts.
   * While active, slow aimed `orbs` volley pauses.
   */
  spiral: {
    betweenTicks: SIM_HZ * 10,
    firstDelayTicks: SIM_HZ * 6,
    emitIntervalTicks: 7,
    angleStepRad: 0.38,
    rotations: 1.25,
    bulletSpeed: 4.35,
    bulletLifeTicks: 320,
    bulletDamage: 8,
    bulletSize: 11,
  },
  glossary: {
    label: 'King Boot',
    jp: 'キング・ブーツ',
    description:
      'Rubber sovereign on a corner tour.',
  },
};

export const GOD_NEPHROPIDAE = {
  id: 'god_nephropidae',
  logicKey: 'godNephropidae',
  label: 'God Nephropidae',
  spriteKey: 'god_nephropidae',
  spriteFront: 'left',
  facingMode: 'mirror',
  emoji: '🦞',
  hp: 200,
  size: 100,
  visualScale: 1.55,
  score: 2000,
  approachSpeed: 2.35,
  combatMoveSpeed: 0,
  contactDamage: 14,
  knockbackMul: 0.04,
  /** Hover anchor (fraction of canvas height); lower on screen keeps HP bar off the top HUD */
  centerYFrac: 0.36,
  /**
   * When true, sprite mirror follows a smooth L/R cycle (sim ticks) instead of tracking the player —
   * reads as subtle idle life on a nearly-symmetrical PNG.
   */
  spriteOscillateFacing: true,
  /** Full left→right→left mirror cycle length in sim ticks (@ 60Hz). */
  spriteOscillateFacingPeriodTicks: 240,
  enrageHpFraction: 0.22,
  enrageSpeedMul: 1.14,
  enrageWarningSeconds: 2.2,
  bigRed: {
    bulletSpeed: 2.2,
    bulletLifeTicks: 400,
    bulletDamage: 14,
    bulletSize: 23,
  },
  /** Horizontal L/R volleys; dodge toward top or bottom between waves */
  sideWave: {
    waveCount: 6,
    lanesPerWave: 3,
    laneSpreadRad: 0.1,
    emitIntervalTicks: 12,
    bulletSpeed: 3.45,
    bulletLifeTicks: 340,
    bulletDamage: 10,
    bulletSize: 12,
    flavor: 'godSide',
  },
  radialSlow: {
    count: 12,
    bulletSpeed: 2.15,
    bulletLifeTicks: 320,
    bulletDamage: 10,
    bulletSize: 13,
    flavor: 'godRadial',
  },
  radialFast: {
    count: 12,
    bulletSpeed: 3.95,
    bulletLifeTicks: 260,
    bulletDamage: 11,
    bulletSize: 10.5,
    /** Offset so fast ring sits between slow spokes */
    angleOffsetRad: Math.PI / 12,
    flavor: 'godRadial',
  },
  betweenRadialTicks: 14,
  cycleGapTicks: 68,
  /** While enraged: trios from left / right / below on a steady cadence (cap total). */
  enrageShrimp: {
    maxSpawn: 50,
    /** ~2s between pulses @ 60Hz */
    pulseIntervalTicks: 120,
    /** Shrimp per pulse */
    perPulse: 3,
    /** Horizontal eject from flank (× unitScale) */
    burstImpulseU: 5,
  },
  glossary: {
    label: 'God Nephropidae',
    jp: '神・ネフロピダエ',
    description:
      'Deep-water God Crustacean.',
  },
};

/**
 * @typedef {typeof OCTOROBO | typeof KING_BOOT | typeof GOD_NEPHROPIDAE} BossDef
 */

/** @type {Record<string, BossDef>} */
export const BOSSES = {
  octorobo: OCTOROBO,
  king_boot: KING_BOOT,
  god_nephropidae: GOD_NEPHROPIDAE,
};

/**
 * @param {number} wave
 * @returns {BossDef | null}
 */
export function getBossDefForWave(wave) {
  if (!isBossWave(wave)) return null;
  const tier = Math.floor(wave / BOSS_WAVE_INTERVAL);
  // 10 → Octorobo, 20 → King Boot, 30 → God Nephropidae (final), 40 → Octorobo, …
  const m = tier % 3;
  if (m === 1) return OCTOROBO;
  if (m === 2) return KING_BOOT;
  return GOD_NEPHROPIDAE;
}
