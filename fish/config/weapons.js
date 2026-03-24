import { SIM_HZ } from './timing.js';

/** Sim ticks between auto shots: `round(SIM_HZ * 60 / rpm)`. */
function rpmToCooldownTicks(rpm) {
  return Math.max(1, Math.round((SIM_HZ * 60) / rpm));
}

/**
 * Metal-Slug–style weapon definitions (design units × unitScale in game).
 *
 * Aim space (after rotate(aimAngle)):
 *   +X = along barrel toward muzzle (right side of sprite PNG).
 *   Perp = “gun up” on screen (nudge bullets visually toward top vs barrel line).
 *
 * `muzzle.along` / `muzzle.perp` = spawn point from fish center (`perp` sign follows aim-based gun mirror; see `weaponMath.gunAimPerpSign`).
 * `sprite.*` = where to draw the PNG (barrel on the right of the image).
 */
export const DEFAULT_WEAPON_ID = 'ak';

/** @type {Record<string, WeaponDef>} */
export const WEAPONS = {
  ak: {
    id: 'ak',
    label: 'AK',
    textureKey: 'ar',
    spritePx: { w: 64, h: 28 },
    muzzle: {
      along: 64,
      perp: 6,
    },
    sprite: {
      rightEdgeAlong: 72,
      centerPerp: 0,
    },
    fire: {
      bulletSpeed: 22,
      hitKnockback: 3.5,
      maxAmmo: 30,
      reloadTicks: 60,
      bulletLifeTicks: 80,
      auto: true,
      autoCooldownTicks: rpmToCooldownTicks(600),
      sfxShoot: 'ak_shot',
      sfxNoAmmo: 'no_ammo',
      sfxReload: 'reload',
      /** Visual only: gun slides back along barrel (design units × unitScale) */
      visualKickU: 1.85,
    },
    muzzleFlash: {
      frames: 4,
      frameW: 180,
      frameH: 80,
      drawH: 52,
      lifeTicks: 6,
      perpOffset: -2.2,
    },
    glossary: {
      label: 'Assault rifle',
      jp: 'アサルト・フィッシュ',
      description:
        'Full-auto and a deep magazine.',
    },
  },
  shotgun: {
    id: 'shotgun',
    label: 'Shotgun',
    textureKey: 'shotty',
    spritePx: { w: 62, h: 26 },
    muzzle: {
      along: 56,
      perp: 5,
    },
    sprite: {
      rightEdgeAlong: 64,
      centerPerp: 0,
    },
    fire: {
      bulletSpeed: 18.5,
      hitKnockback: 2.8,
      maxAmmo: 2,
      reloadTicks: 100,
      bulletLifeTicks: 52,
      auto: true,
      autoCooldownTicks: rpmToCooldownTicks(80),
      pelletCount: 10,
      pelletHitDamage: 1,
      pelletSpreadDeg: 18,
      pelletSpreadNoiseDeg: 6.2,
      pelletSpreadConeJitter: 0.32,
      pelletKnockMul: 0.22,
      sfxShoot: 'shotty',
      sfxNoAmmo: 'no_ammo',
      sfxReload: 'reload',
      visualKickU: 2.65,
    },
    muzzleFlash: {
      frames: 4,
      frameW: 180,
      frameH: 80,
      drawH: 48,
      lifeTicks: 6,
      perpOffset: -2,
    },
    glossary: {
      label: 'Shotgun',
      jp: '散弾の浪漫',
      description:
        'Wide cone, with two loud shots.',
    },
  },
  revolver: {
    id: 'revolver',
    label: 'Revolver',
    textureKey: 'revolver',
    pickupTextureKey: 'pickup_revolver',
    spritePx: { w: 36, h: 28 },
    dualWield: true,
    /** Full separation between hands in local perp units (before mirror sign). */
    dualPerp: 8,
    muzzle: {
      along: 36,
      perp: 6,
    },
    sprite: {
      rightEdgeAlong: 44,
      centerPerp: 0,
    },
    fire: {
      bulletSpeed: 22,
      hitKnockback: 3.5,
      maxAmmo: 14,
      reloadTicks: 60,
      bulletLifeTicks: 80,
      auto: true,
      autoCooldownTicks: rpmToCooldownTicks(300),
      bulletDamage: 2,
      sfxShoot: 'ak_shot',
      sfxNoAmmo: 'no_ammo',
      sfxReload: 'reload',
      visualKickU: 2.05,
    },
    muzzleFlash: {
      frames: 4,
      frameW: 180,
      frameH: 80,
      drawH: 44,
      lifeTicks: 6,
      perpOffset: -2.2,
    },
    glossary: {
      label: 'Revolver X2',
      jp: 'リボルバー',
      description:
        'Dual-wield revolvers with alternating fire.',
      glossaryScale: 0.66,
    },
  },
};

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   textureKey: string,
 *   pickupTextureKey?: string,
 *   spritePx: { w: number, h: number },
 *   dualWield?: boolean,
 *   dualPerp?: number,
 *   muzzle: { along: number, perp: number },
 *   sprite: { rightEdgeAlong: number, centerPerp: number },
 *   fire: {
 *     bulletSpeed: number,
 *     hitKnockback?: number,
 *     maxAmmo: number,
 *     reloadTicks: number,
 *     bulletLifeTicks: number,
 *     auto: boolean,
 *     autoCooldownTicks: number,
 *     pelletCount?: number,
 *     pelletSpreadDeg?: number,
 *     pelletSpreadNoiseDeg?: number,
 *     pelletSpreadConeJitter?: number,
 *     pelletKnockMul?: number,
 *     pelletHitDamage?: number,
 *     bulletDamage?: number,
 *     sfxShoot?: string,
 *     sfxNoAmmo?: string,
 *     sfxReload?: string,
 *     visualKickU?: number,
 *   },
 *   muzzleFlash?: {
 *     frames: number,
 *     frameW: number,
 *     frameH: number,
 *     drawH: number,
 *     lifeTicks: number,
 *     perpOffset?: number,
 *   },
 *   glossary?: { label: string, jp: string, description: string, glossaryScale?: number },
 * }} WeaponDef
 */

/**
 * @param {string} [id]
 * @returns {WeaponDef}
 */
export function getWeapon(id = DEFAULT_WEAPON_ID) {
  return WEAPONS[id] ?? WEAPONS[DEFAULT_WEAPON_ID];
}
