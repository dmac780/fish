import { SIM_HZ } from './timing.js';
import { BOSS_DEATH_EXPLOSION } from './vfx.js';

/**
 * Small underwater bubbles: transparent fill + pale rim, drift up in screen space.
 * Use `spawnBubbleBurst` from `game/bubbleFx.js` with a preset name or a partial override.
 */

/** Between idle puffs while player is not moving (@ 60Hz ticks) */
export const playerIdleBubbleIntervalTicks = SIM_HZ * 3;

/**
 * @typedef {{
 *   count: number,
 *   radiiU: number[],
 *   vyU: number,
 *   driftU: number,
 *   spreadU: number,
 *   aboveU: number,
 *   maxLifeTicks: number,
 *   spawnJitterU?: number,
 * }} BubbleBurstPreset
 */

/** @type {Record<string, BubbleBurstPreset>} */
export const bubbleFxPresets = {
  /** Three sizes, above player, soft ambient */
  idle: {
    count: 3,
    radiiU: [1.05, 1.55, 2.05],
    vyU: -2.85,
    driftU: 0.22,
    spreadU: 4.5,
    aboveU: 16,
    maxLifeTicks: Math.round(SIM_HZ * 1.35),
    spawnJitterU: 5,
  },
  /** From muzzle / impacts: slightly snappier, more bubbles */
  muzzle: {
    count: 4,
    radiiU: [0.75, 1.05, 1.4, 1.75],
    vyU: -3.5,
    driftU: 0.38,
    spreadU: 6,
    aboveU: 2,
    maxLifeTicks: Math.round(SIM_HZ * 1.05),
    spawnJitterU: 4,
  },
};

/**
 * Staggered bubbles when a boss dies: cheap emitter (few spawns/frame), disk around explosion.
 * Radius uses `BOSS_DEATH_EXPLOSION.drawH × u × radiusMulOfExplosionDrawH`.
 */
export const bossDeathBubbleEmitter = {
  /** Total bubbles to emit (spread over `maxAliveTicks`) */
  bubbleCount: 32,
  /** Emitter lifetime (sim ticks); ~staggered 32÷3 waves × ~3 tick gaps + margin */
  maxAliveTicks: Math.max(BOSS_DEATH_EXPLOSION.frames * BOSS_DEATH_EXPLOSION.ticksPerFrame + 32, 104),
  /** Spawn disk radius = explosion draw height × u × this */
  radiusMulOfExplosionDrawH: 0.5,
  cooldownMinTicks: 1.2,
  cooldownMaxTicks: 4.8,
  /** Hard cap per emitter per update (keeps catch-up frames cheap) */
  spawnsPerFrameCap: 3,
};
