/**
 * Stat tiers 1–3 on character cards; 2 = baseline (100 HP, 1.0× swim). Legacy 4 maps like 3.
 */

/** @param {number} stat */
export function statToHp(stat) {
  if (stat === 1) return 80;
  if (stat === 2) return 100;
  if (stat === 3 || stat === 4) return 120;
  return 100;
}

/** @param {number} stat */
export function statToSpeedMult(stat) {
  if (stat === 1) return 0.8;
  if (stat === 2) return 1.0;
  if (stat === 3 || stat === 4) return 1.2;
  return 1.0;
}

/**
 * @typedef {{
 *   id: string,
 *   key: string,
 *   label: string,
 *   jp: string,
 *   romaji: string,
 *   epithet: string,
 *   assetKey: string,
 *   speedStat: number,
 *   hpStat: number,
 *   accent: string,
 *   accentGlow: string,
 * }} CharacterDef
 */

/** @type {CharacterDef[]} */
export const CHARACTERS = [
  {
    id: 'a',
    key: 'bass',
    label: 'Bass',
    jp: 'バス',
    romaji: 'BASU',
    epithet: '漆黒の海戦士',
    assetKey: 'fish_a',
    speedStat: 1,
    hpStat: 3,
    accent: '#5eead4',
    accentGlow: 'rgba(94, 234, 212, 0.55)',
  },
  {
    id: 'b',
    key: 'catfish',
    label: 'Catfish',
    jp: 'ナマズ',
    romaji: 'NAMAZU',
    epithet: '深淵のひげ先輩',
    assetKey: 'fish_b',
    speedStat: 2,
    hpStat: 2,
    accent: '#c4b5fd',
    accentGlow: 'rgba(196, 181, 253, 0.55)',
  },
  {
    id: 'c',
    key: 'carp',
    label: 'Carp',
    jp: 'コイ',
    romaji: 'KOI',
    epithet: '滝を登る伝説級',
    assetKey: 'fish_c',
    speedStat: 3,
    hpStat: 1,
    accent: '#fdba74',
    accentGlow: 'rgba(253, 186, 116, 0.55)',
  },
];

/** @param {string} id */
export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

export const DEFAULT_CHARACTER_ID = 'a';
