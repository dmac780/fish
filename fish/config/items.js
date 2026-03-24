import { SIM_HZ } from './timing.js';

/**
 * World drops spawned when item carriers die. `pickRadius` is design units (× unitScale).
 * `sfxId`: key in `config/audio.js` → `AUDIO_CLIPS`, played on collect (optional).
 */

/**
 * @typedef {{
 *   id: string,
 *   healAmount?: number,
 *   emoji: string,
 *   pickRadius: number,
 *   collectScore?: number,
 *   sfxId?: string,
 *   grantsWeaponId?: string,
 *   buffId?: string,
 *   buffDurationTicks?: number,
 *   damageMul?: number,
 *   noReload?: boolean,
 *   projectileColor?: string,
 *   glossary?: { label: string, jp: string, description: string },
 * }} ItemPickupDef
 */

/** @type {Record<string, ItemPickupDef>} */
export const ITEM_DEFS = {
  health: {
    id: 'health',
    healAmount: 20,
    emoji: '🍥',
    pickRadius: 22,
    collectScore: 12,
    sfxId: 'pickup_eat',
    glossary: {
      label: 'Fish Cake',
      jp: 'かまぼこ回復',
      description: 'Pink-and-white swirl. +20 HP.',
    },
  },
  hotsauce: {
    id: 'hotsauce',
    emoji: '🌶️',
    pickRadius: 22,
    collectScore: 14,
    sfxId: 'pickup_eat',
    buffId: 'hotsauce',
    buffDurationTicks: SIM_HZ * 30,
    damageMul: 2,
    projectileColor: '#ff1744',
    glossary: {
      label: 'Hot Sauce',
      jp: 'ホットソース',
      description:
        'Spicy payload. Doubles your damage for 30 seconds, then the burn fades.',
    },
  },
  lucky_neko: {
    id: 'lucky_neko',
    emoji: '🐱',
    pickRadius: 22,
    collectScore: 14,
    sfxId: 'pickup_eat',
    buffId: 'lucky_neko',
    buffDurationTicks: SIM_HZ * 30,
    noReload: true,
    projectileColor: '#4ade80',
    glossary: {
      label: 'Lucky Neko',
      jp: 'ラッキーネコ',
      description:
        'Fortune smiles for 30 seconds: unlimited ammo and no reload downtime.',
    },
  },
  weapon_shotgun: {
    id: 'weapon_shotgun',
    emoji: '🔫',
    pickRadius: 22,
    collectScore: 10,
    sfxId: 'pickup_weapon',
    grantsWeaponId: 'shotgun',
  },
  weapon_ak: {
    id: 'weapon_ak',
    emoji: '🎯',
    pickRadius: 22,
    collectScore: 10,
    sfxId: 'pickup_weapon',
    grantsWeaponId: 'ak',
  },
  weapon_revolver: {
    id: 'weapon_revolver',
    emoji: '🔫',
    pickRadius: 22,
    collectScore: 10,
    sfxId: 'pickup_weapon',
    grantsWeaponId: 'revolver',
  },
};

/** @param {string} id */
export function getItemDef(id) {
  return ITEM_DEFS[id] ?? null;
}
