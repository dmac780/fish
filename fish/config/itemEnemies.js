/**
 * Item carriers: cross the screen slowly, no player damage; on death drop a pickup from `items.js`.
 * Spawn count per wave is flat (not scaled like main mobs) — tune `rollItemCarrierSlots` / `rollItemCarrierOnSpawn`.
 */

import { SIM_HZ } from './timing.js';

/**
 * @typedef {{
 *   id: string,
 *   spriteKey: string,
 *   spriteFront: import('./enemies.js').SpriteFront,
 *   facingMode: import('./enemies.js').EnemyFacingMode,
 *   hp: number,
 *   size: number,
 *   travelSeconds: number,
 *   bobAmp: number,
 *   bobRate: number,
 *   dropItemId?: string,
 *   dropConsumableIds?: string[],
 *   dropWeaponItemIds?: string[],
 *   dropWeaponChance?: number,
 *   score: number,
 *   visualScale?: number,
 *   glossary?: { label: string, jp: string, description: string },
 * }} ItemEnemyDef
 */

/** Clam — 50% consumable vs 50% weapon; weapon branch picks uniformly from `dropWeaponItemIds`. */
/** @type {ItemEnemyDef} */
export const CLAM_CARRIER = {
  id: 'clam_carrier',
  spriteKey: 'clam',
  spriteFront: 'right',
  facingMode: 'mirror',
  hp: 5,
  size: 42,
  travelSeconds: 15,
  bobAmp: 30,
  bobRate: 0.052,
  dropConsumableIds: ['health', 'hotsauce', 'lucky_neko'],
  dropWeaponItemIds: ['weapon_shotgun', 'weapon_ak', 'weapon_revolver'],
  dropWeaponChance: 0.5,
  score: 0,
  visualScale: 1.05,
  glossary: {
    label: 'Lucky Clam',
    jp: '幸運のハマグリ',
    description:
      'Harmless parcel drifting by. Pop it: sometimes lunch, sometimes a louder gun.',
  },
};

/** Same movement as clam; always drops fish cake (`health`). Front faces left. */
/** @type {ItemEnemyDef} */
export const FAKE_FISH_CARRIER = {
  id: 'fake_fish_carrier',
  spriteKey: 'fake_fish',
  spriteFront: 'left',
  facingMode: 'mirror',
  hp: 5,
  size: 42,
  travelSeconds: 15,
  bobAmp: 30,
  bobRate: 0.052,
  dropItemId: 'health',
  score: 0,
  visualScale: 1.05,
  glossary: {
    label: 'Fake Fish',
    jp: '偽物の魚',
    description: 'Looks wrong on purpose. Break it for a sure fish cake.',
  },
};

/**
 * @param {Pick<ItemEnemyDef, 'dropItemId' | 'dropConsumableIds' | 'dropWeaponItemIds' | 'dropWeaponChance'>} def
 * @returns {string} item id for `ITEM_DEFS`
 */
export function rollCarrierDropItemId(def) {
  const cons = def.dropConsumableIds;
  const wins = def.dropWeaponItemIds;
  const pW = def.dropWeaponChance;
  if (cons && cons.length && wins && wins.length && typeof pW === 'number' && pW > 0 && pW < 1) {
    return Math.random() < pW
      ? wins[Math.floor(Math.random() * wins.length)]
      : cons[Math.floor(Math.random() * cons.length)];
  }
  if (def.dropItemId) return def.dropItemId;
  if (cons?.length) return cons[Math.floor(Math.random() * cons.length)];
  if (wins?.length) return wins[Math.floor(Math.random() * wins.length)];
  return 'health';
}

/** All carriers (glossary, etc.). Normal wave spawns pick 50/50 clam vs fake fish in `FishHellGame`. */
/** @type {readonly ItemEnemyDef[]} */
export const ITEM_ENEMY_TYPES = [CLAM_CARRIER, FAKE_FISH_CARRIER];

/**
 * How many item carriers to try to spawn this wave (0–2). Flat distribution; edit weights to rebalance.
 * @returns {0|1|2}
 */
export function rollItemCarrierSlots() {
  const r = Math.random();
  if (r < 0.44) return 0;
  if (r < 0.86) return 1;
  return 2;
}

/**
 * Each normal spawn tick: chance to spawn an item carrier instead of a chaser, if slots remain.
 * Low so carriers are uncommon vs main mobs.
 */
export function rollItemCarrierOnSpawn() {
  return Math.random() < 0.28;
}

export const ITEM_PICKUP_HOLD_SECONDS = 2;

/** @returns {number} sim ticks */
export function itemPickupHoldTicks() {
  return ITEM_PICKUP_HOLD_SECONDS * SIM_HZ;
}
