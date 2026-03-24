/**
 * Engine defaults (polyphony cap when a clip omits `maxVoices`).
 */
export const AUDIO_ENGINE_DEFAULTS = {
  defaultMaxVoices: 14,
};

/** Discrete UI steps (0 = silent … 10 = full) for settings. */
export const AUDIO_VOLUME_STEPS = 10;

/** Default mixer steps when no saved settings (first launch). */
export const DEFAULT_SFX_VOLUME_STEP = 8;
export const DEFAULT_MUSIC_VOLUME_STEP = 6;

/** Looped hub theme after splash; fades out when survival run starts (`AudioManager.startMenuBgm`). */
export const MENU_BGM_CLIP_ID = 'bgm_menu_fish_with_fun';

/** Nav, back, scene changes, char pick (`playUiClick`). */
export const UI_BUTTON_CLICK_CLIP_ID = 'button_click';

/** Settings sliders / toggles, pause volume rows (`playUiSecondaryClick`). */
export const UI_SECONDARY_CLICK_CLIP_ID = 'ui_click';

/** Menu rows, back buttons, char cards on hover / focus change (`playUiHover`). */
export const UI_HOVER_CLIP_ID = 'ui_hover';

/**
 * `pitchShiftCents`: fixed transpose (100 ≈ 1 semitone up, -100 down), applied before jitter.
 * `bus`: optional; default `sfx`. Use `music` for BGM / ambient (routed to music volume).
 *
 * @typedef {{
 *   src: string,
 *   volume?: number,
 *   bus?: 'sfx' | 'music',
 *   pitchShiftCents?: number,
 *   pitchJitterCents?: [number, number],
 *   maxVoices?: number,
 * }} AudioClipDef
 */

/** @type {Record<string, AudioClipDef>} */
export const AUDIO_CLIPS = {
  ak_shot: {
    src: new URL('../assets/sfx/ak_shot.mp3', import.meta.url).href,
    volume: 0.62,
    pitchJitterCents: [-65, 65],
    maxVoices: 10,
  },
  shotty: {
    src: new URL('../assets/sfx/shotty.mp3', import.meta.url).href,
    volume: 0.68,
    pitchJitterCents: [-90, 90],
    maxVoices: 8,
  },
  no_ammo: {
    src: new URL('../assets/sfx/no_ammo.mp3', import.meta.url).href,
    volume: 0.95,
    maxVoices: 3,
  },
  reload: {
    src: new URL('../assets/sfx/reload.mp3', import.meta.url).href,
    volume: 0.72,
    maxVoices: 2,
    pitchShiftCents: 200,
  },
  enemy_hit: {
    src: new URL('../assets/sfx/enemy_hit.mp3', import.meta.url).href,
    volume: 0.4,
    pitchJitterCents: [-40, 40],
    maxVoices: 4,
  },
  meathit: {
    src: new URL('../assets/sfx/meathit.mp3', import.meta.url).href,
    volume: 1,
    maxVoices: 1,
  },
  pickup_eat: {
    src: new URL('../assets/sfx/eat.mp3', import.meta.url).href,
    volume: 0.78,
    pitchJitterCents: [-35, 35],
    maxVoices: 6,
  },
  pickup_weapon: {
    src: new URL('../assets/sfx/pickup_weapon.mp3', import.meta.url).href,
    volume: 0.72,
    pitchJitterCents: [-30, 30],
    maxVoices: 4,
  },
  explosion: {
    src: new URL('../assets/sfx/explosion.mp3', import.meta.url).href,
    volume: 0.78,
    maxVoices: 2,
  },
  [UI_BUTTON_CLICK_CLIP_ID]: {
    src: new URL('../assets/sfx/button_click.mp3', import.meta.url).href,
    volume: 0.58,
    maxVoices: 16,
  },
  [UI_SECONDARY_CLICK_CLIP_ID]: {
    src: new URL('../assets/sfx/ui_click.mp3', import.meta.url).href,
    volume: 0.52,
    maxVoices: 20,
  },
  [UI_HOVER_CLIP_ID]: {
    src: new URL('../assets/sfx/hover.mp3', import.meta.url).href,
    volume: 0.45,
    maxVoices: 24,
  },
  [MENU_BGM_CLIP_ID]: {
    src: new URL('../assets/music/fishwithgun.mp3', import.meta.url).href,
    bus: 'music',
    volume: 0.52,
    maxVoices: 1,
  },
  bgm_game_1: {
    src: new URL('../assets/music/game1.mp3', import.meta.url).href,
    bus: 'music',
    volume: 0.7,
    maxVoices: 1,
  },
  bgm_game_2: {
    src: new URL('../assets/music/game2.mp3', import.meta.url).href,
    bus: 'music',
    volume: 0.7,
    maxVoices: 1,
  },
  bgm_game_3: {
    src: new URL('../assets/music/game3.mp3', import.meta.url).href,
    bus: 'music',
    volume: 0.7,
    maxVoices: 1,
  },
  bgm_game_4: {
    src: new URL('../assets/music/game4.mp3', import.meta.url).href,
    bus: 'music',
    volume: 0.7,
    maxVoices: 1,
  },
};

/** In-order survival BGM; loops forever as 1 → 2 → 3 → 1 … (`AudioManager` HTML pool). */
export const GAMEPLAY_BGM_CLIP_IDS = ['bgm_game_1', 'bgm_game_2', 'bgm_game_3', 'bgm_game_4'];
