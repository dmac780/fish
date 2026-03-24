import { drawCredits } from './drawCredits.js';
import { drawMenuSceneTransitionOverlay } from './drawMenuTransition.js';
import { MENU_SCENE_TRANSITION_SEC } from '../config/scenes.js';

/**
 * @typedef {{
 *   score: number,
 *   wave: number,
 *   characterId: string,
 *   playerHp: number,
 *   playerHpMax: number,
 *   weaponId: string,
 *   weaponLabel: string,
 *   runTimeSec: number,
 * }} CreditsRunPayload
 */

export class CreditsScene {
  /**
   * @param {import('./SceneManager.js').SceneManager} manager
   * @param {Record<string, unknown>} deps
   */
  constructor(manager, deps) {
    this.manager = manager;
    this.deps = deps;
    /** @type {CreditsRunPayload | null} */
    this._run = null;
    /** @type {number} */
    this._enterFadeT = 0;
    /** @type {{ t: number } | null} */
    this._leaveMenu = null;
  }

  /** @param {CreditsRunPayload | undefined} data */
  enter(data) {
    /** @type {(v: boolean) => void} */ (this.deps.setPlayHudVisible)(false);
    this._run = data ?? null;
    this._enterFadeT = 0;
    this._leaveMenu = null;
  }

  /** @param {number} dt */
  update(dt) {
    if (this._enterFadeT < MENU_SCENE_TRANSITION_SEC) this._enterFadeT += dt;
    if (this._leaveMenu) {
      this._leaveMenu.t += dt;
      if (this._leaveMenu.t >= MENU_SCENE_TRANSITION_SEC) {
        this.manager.switchTo('menu');
      }
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    if (this._run) drawCredits(ctx, this._run);
    drawMenuSceneTransitionOverlay(ctx, this._enterFadeT, this._leaveMenu?.t ?? 0);
  }

  /** @param {KeyboardEvent} e */
  onKeyDown(e) {
    if (e.repeat) return;
    if (this._leaveMenu) return;
    if (e.code === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      this._leaveMenu = { t: 0 };
    }
  }

  /** @param {MouseEvent} e */
  onMouseDown(e) {
    if (e.button === 0 && !this._leaveMenu) this._leaveMenu = { t: 0 };
  }
}
