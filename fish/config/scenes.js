/** Scene flow (seconds). Wave banner counts down in sim time — freezes when paused. */
export const WAVE_BANNER_SEC = 2;

/** Black fades out while menu is drawn underneath; driver text fades first */
export const SPLASH_CROSSFADE_SEC = 1.4;

/** Portion of crossfade where driver text is visible (0–1) */
export const SPLASH_DRIVER_TEXT_FADE_PORTION = 0.42;

/**
 * Full-screen black in/out between main menu, character select, glossary, settings, game over.
 * Use the same value when fading into gameplay after character select (`PlayScene`).
 */
export const MENU_SCENE_TRANSITION_SEC = 0.45;

/** Hub → gameplay: menu BGM fade (covers char-select handoff + intro black). */
export const MENU_BGM_FADE_OUT_SEC = 1.05;

/** Gameplay holds on last frame while this black overlay rises, then `CreditsScene` loads. */
export const VICTORY_TO_CREDITS_FADE_SEC = 1.05;
