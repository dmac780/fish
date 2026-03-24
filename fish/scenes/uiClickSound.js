import {
  UI_BUTTON_CLICK_CLIP_ID,
  UI_SECONDARY_CLICK_CLIP_ID,
  UI_HOVER_CLIP_ID,
} from '../config/audio.js';

/**
 * Primary: back, hub nav, char select, pause resume / quit / confirm yes.
 * @param {{ audio?: import('../game/AudioManager.js').AudioManager | null }} deps
 */
export function playUiClick(deps) {
  deps.audio?.play(UI_BUTTON_CLICK_CLIP_ID);
}

/**
 * Secondary: settings volume & bindings, pause mixer rows, confirm “no”.
 * @param {{ audio?: import('../game/AudioManager.js').AudioManager | null }} deps
 */
export function playUiSecondaryClick(deps) {
  deps.audio?.play(UI_SECONDARY_CLICK_CLIP_ID);
}

/**
 * Hover / focus change on hub UI (menu entries, back, char cards).
 * @param {{ audio?: import('../game/AudioManager.js').AudioManager | null }} deps
 */
export function playUiHover(deps) {
  deps.audio?.play(UI_HOVER_CLIP_ID);
}
