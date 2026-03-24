/**
 * Enemy archetypes + wave spawn pacing. Sizes/speeds are design units at unitScale 1 (min canvas edge 720px).
 *
 * Visual: `spriteKey` → `getEnemySpriteTexture` in `game/assets.js`; if the image fails, `emoji` is used when set.
 * Future sheet animation can add e.g. `spriteFrameW`, `spriteFrameH`, `spriteFrames` (unused until wired in render).
 *
 * `spriteFront`: which side of the PNG is the “nose” — used with `facingMode` (rotate toward player, or mirror axis).
 *
 * `facingMode`: `'rotate'` (default) — full rotation toward player. `'mirror'` — horizontal flip only (shrimp, turrets); set `spriteFront` to `left`/`right` to match PNG nose.
 *
 * `size`: gameplay radius (hit vs player/bullets) and baseline for on-screen scale (× unitScale at spawn).
 * `visualScale` (optional, default 1): multiplies **only** how big the sprite/emoji is drawn and where the HP bar sits — hitbox still uses `size`.
 */

/**
 * @typedef {'top' | 'right' | 'bottom' | 'left'} SpriteFront
 */

/** Radians: direction of sprite “front” in default draw space (+X right, +Y down) before `rotate` */
export const SPRITE_FRONT_RADIANS = /** @type {const} */ ({
  right: 0,
  bottom: Math.PI / 2,
  left: Math.PI,
  top: -Math.PI / 2,
});

/**
 * @typedef {'rotate' | 'mirror'} EnemyFacingMode
 */

/**
 * @typedef {{
 *   hp: number,
 *   spd: number,
 *   size: number,
 *   score: number,
 *   emoji?: string,
 *   spriteKey?: string,
 *   spriteFront?: SpriteFront,
 *   facingMode?: EnemyFacingMode,
 *   visualScale?: number,
 *   spriteFrameW?: number,
 *   spriteFrameH?: number,
 *   spriteFrames?: number,
 *   glossary?: { label: string, jp: string, description: string },
 * }} EnemyTypeDef
 */

/** @type {EnemyTypeDef[]} */
export const ENEMY_TYPES = [
  {
    spriteKey: 'shrimp1',
    spriteFront: 'right',
    facingMode: 'mirror',
    emoji: '🦀',
    hp: 1,
    spd: 1.5,
    size: 26,
    score: 10,
    glossary: {
      label: 'Shrimp',
      jp: 'エビちゃん',
      description:
        'Tiny and committed to a straight line. One honest hit sends it home.',
    },
  },
  {
    spriteKey: 'crab1',
    spriteFront: 'top',
    facingMode: 'rotate',
    emoji: '🦀',
    hp: 3,
    spd: 1.1,
    size: 32,
    score: 25,
    glossary: {
      label: 'Rock Crab',
      jp: '岩ガニ',
      description: 'Sideways scuttler with a harder shell.',
    },
  },
  {
    spriteKey: 'crab2',
    spriteFront: 'top',
    facingMode: 'rotate',
    emoji: '🦑',
    hp: 2,
    spd: 1.9,
    size: 36,
    score: 20,
    glossary: {
      label: 'Sprint Crab',
      jp: '疾走カニ',
      description: 'Bigger footprint, higher gear. Shows up wanting the whole lane.',
    },
  },
  {
    spriteKey: 'cray1',
    spriteFront: 'top',
    facingMode: 'rotate',
    emoji: '🐡',
    hp: 4,
    spd: 0.85,
    /** Tighter circle vs art; `visualScale` keeps draw height ~same as old size 56. */
    size: 38,
    visualScale: 56 / 38,
    score: 40,
    glossary: {
      label: 'Crayfish',
      jp: 'ザリガニ先輩',
      description: 'Chunky shallows tank. Slow on the fins.',
    },
  },
  {
    spriteKey: 'jelly1',
    spriteFront: 'top',
    facingMode: 'rotate',
    emoji: '🪼',
    hp: 8,
    spd: 0.48,
    size: 54,
    visualScale: 1.24,
    score: 65,
    glossary: {
      label: 'Jellyfish',
      jp: 'ふわふわクラゲ',
      description: 'Soft, patient, and weirdly durable.',
    },
  },
];

/** Seconds between enemy spawns during a wave */
export const WAVE_SPAWN_INTERVAL = 0.6;

/** Seconds between waves after clearing */
export const WAVE_BREAK_DURATION = 2;
