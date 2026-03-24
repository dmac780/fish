import { drawMainMenu, mainMenuHitTest, MAIN_MENU_ENTRIES } from './drawUi.js';
import { drawMenuSceneTransitionOverlay } from './drawMenuTransition.js';
import { MENU_SCENE_TRANSITION_SEC } from '../config/scenes.js';
import { MENU_BGM_CLIP_ID } from '../config/audio.js';
import { playUiClick, playUiHover } from './uiClickSound.js';

/** Border flash beats before black scene transition (matches character select). */
const MENU_ACTIVATE_FLASH_SEC = 0.36;

export class MenuScene {
  /**
   * @param {import('./SceneManager.js').SceneManager} manager
   * @param {Record<string, unknown>} deps
   */
  constructor(manager, deps) {
    this.manager = manager;
    this.deps = deps;
    this.selected = 0;
    /** @type {number} */
    this._bgTime = 0;
    /** @type {number} */
    this._enterFadeT = 0;
    /** @type {{ name: string, t: number, index: number } | null} */
    this._leave = null;
    /** @type {{ name: string, index: number, t: number } | null} */
    this._activateFlash = null;
    /** Last main-menu row under pointer (-1 = not over a row); syncs with keyboard focus for hover SFX. */
    this._lastMainMenuPointerHit = -1;
  }

  /**
   * @param {{ skipMenuEnterFade?: boolean } | undefined} data
   */
  enter(data) {
    /** @type {(v: boolean) => void} */ (this.deps.setPlayHudVisible)(false);
    this.selected = 0;
    this._bgTime = 0;
    this._enterFadeT =
      data?.skipMenuEnterFade === true ? MENU_SCENE_TRANSITION_SEC : 0;
    this._leave = null;
    this._activateFlash = null;
    this._lastMainMenuPointerHit = -1;
    /** @type {import('../game/AudioManager.js').AudioManager | null | undefined} */
    const au = /** @type {any} */ (this.deps.audio);
    au?.startMenuBgm?.(MENU_BGM_CLIP_ID);
  }

  /** @param {number} dt */
  update(dt) {
    this._bgTime += dt;
    if (this._leave) {
      this._leave.t += dt;
      if (this._leave.t >= MENU_SCENE_TRANSITION_SEC) {
        const name = this._leave.name;
        this._leave = null;
        this.manager.switchTo(name);
      }
      return;
    }
    if (this._activateFlash) {
      this._activateFlash.t += dt;
      if (this._activateFlash.t >= MENU_ACTIVATE_FLASH_SEC) {
        const { name, index } = this._activateFlash;
        this._activateFlash = null;
        this._leave = { name, t: 0, index };
      }
      return;
    }
    const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
    const input = /** @type {{ mouse: { x: number, y: number } }} */ (this.deps.input);
    const hit = mainMenuHitTest(canvas, input.mouse.x, input.mouse.y);
    if (hit >= 0) {
      if (hit !== this._lastMainMenuPointerHit) {
        playUiHover(this.deps);
        this._lastMainMenuPointerHit = hit;
      }
      this.selected = hit;
    } else if (this._lastMainMenuPointerHit >= 0) {
      this._lastMainMenuPointerHit = -1;
    }
    if (this._enterFadeT < MENU_SCENE_TRANSITION_SEC) this._enterFadeT += dt;
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    let highlightIndex = this.selected;
    if (this._activateFlash) highlightIndex = this._activateFlash.index;
    else if (this._leave) highlightIndex = this._leave.index;

    /** @type {null | { index: number, t: number, duration: number }} */
    let activateFlash = null;
    if (this._activateFlash) {
      activateFlash = {
        index: this._activateFlash.index,
        t: this._activateFlash.t,
        duration: MENU_ACTIVATE_FLASH_SEC,
      };
    }

    drawMainMenu(ctx, this.selected, this._bgTime, {
      highlightIndex,
      activateFlash,
    });
    drawMenuSceneTransitionOverlay(ctx, this._enterFadeT, this._leave?.t ?? 0);
  }

  _busy() {
    return !!(this._leave || this._activateFlash);
  }

  _activateOption(i) {
    if (this._busy()) return;
    const name = i === 0 ? 'charSelect' : i === 1 ? 'glossary' : i === 2 ? 'settings' : null;
    if (name) {
      playUiClick(this.deps);
      this._activateFlash = { name, index: i, t: 0 };
    }
  }

  /** @param {KeyboardEvent} e */
  onKeyDown(e) {
    if (this._busy()) return;
    if (e.repeat) return;
    if (e.key === 'ArrowUp') {
      this.selected = (this.selected + MAIN_MENU_ENTRIES.length - 1) % MAIN_MENU_ENTRIES.length;
      this._lastMainMenuPointerHit = this.selected;
      playUiHover(this.deps);
      return;
    }
    if (e.key === 'ArrowDown') {
      this.selected = (this.selected + 1) % MAIN_MENU_ENTRIES.length;
      this._lastMainMenuPointerHit = this.selected;
      playUiHover(this.deps);
      return;
    }
    if (e.code === 'Enter' || e.key === ' ') {
      this._activateOption(this.selected);
      return;
    }
    if (e.key === '1') {
      this._activateOption(0);
      return;
    }
    if (e.key === '2') {
      this._activateOption(1);
      return;
    }
    if (e.key === '3') {
      this._activateOption(2);
    }
  }

  /** @param {MouseEvent} e */
  onMouseDown(e) {
    if (this._busy()) return;
    if (e.button !== 0) return;
    const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
    const input = /** @type {{ mouse: { x: number, y: number } }} */ (this.deps.input);
    const hit = mainMenuHitTest(canvas, input.mouse.x, input.mouse.y);
    if (hit >= 0) {
      this.selected = hit;
      this._activateOption(hit);
    }
  }
}
