import {
  buildGlossarySections,
  drawGlossary,
  getGlossaryMaxScroll,
  characterSelectBackHitTest,
} from './drawGlossary.js';
import { drawMenuSceneTransitionOverlay } from './drawMenuTransition.js';
import { MENU_SCENE_TRANSITION_SEC } from '../config/scenes.js';
import { playUiClick, playUiHover } from './uiClickSound.js';

const SCROLL_KEY_PX = 72;

export class GlossaryScene {
  /**
   * @param {import('./SceneManager.js').SceneManager} manager
   * @param {Record<string, unknown>} deps
   */
  constructor(manager, deps) {
    this.manager = manager;
    this.deps = deps;
    this.sections = buildGlossarySections();
    /** @type {number} */
    this.scrollY = 0;
    /** @type {number} */
    this._bgTime = 0;
    /** @type {number} */
    this._enterFadeT = 0;
    /** @type {{ t: number } | null} */
    this._leaveMenu = null;
    /** @type {boolean} */
    this._lastBackHover = false;
  }

  enter() {
    /** @type {(v: boolean) => void} */ (this.deps.setPlayHudVisible)(false);
    this.scrollY = 0;
    this._bgTime = 0;
    this._enterFadeT = 0;
    this._leaveMenu = null;
    this._lastBackHover = false;
  }

  /** @param {number} dt */
  update(dt) {
    this._bgTime += dt;
    if (this._enterFadeT < MENU_SCENE_TRANSITION_SEC) this._enterFadeT += dt;
    if (!this._leaveMenu) {
      const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
      const input = /** @type {{ mouse: { x: number, y: number } }} */ (this.deps.input);
      const backHover = characterSelectBackHitTest(canvas, input.mouse.x, input.mouse.y);
      if (backHover && !this._lastBackHover) playUiHover(this.deps);
      this._lastBackHover = backHover;
    }
    if (this._leaveMenu) {
      this._leaveMenu.t += dt;
      if (this._leaveMenu.t >= MENU_SCENE_TRANSITION_SEC) {
        this.manager.switchTo('menu');
      }
    }
  }

  _clampScroll() {
    const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
    const max = getGlossaryMaxScroll(canvas, this.sections);
    this.scrollY = Math.max(0, Math.min(max, this.scrollY));
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
    const input = /** @type {{ mouse: { x: number, y: number } }} */ (this.deps.input);
    const backHover =
      !this._leaveMenu &&
      characterSelectBackHitTest(canvas, input.mouse.x, input.mouse.y);
    this._clampScroll();
    drawGlossary(ctx, {
      sections: this.sections,
      scrollY: this.scrollY,
      time: this._bgTime,
      backHover,
      backDimmed: !!this._leaveMenu,
      mx: input.mouse.x,
      my: input.mouse.y,
    });
    drawMenuSceneTransitionOverlay(ctx, this._enterFadeT, this._leaveMenu?.t ?? 0);
  }

  /** @param {WheelEvent} e */
  onWheel(e) {
    if (this._leaveMenu) return;
    e.preventDefault();
    const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
    this.scrollY += e.deltaY * 0.85;
    const max = getGlossaryMaxScroll(canvas, this.sections);
    this.scrollY = Math.max(0, Math.min(max, this.scrollY));
  }

  /** @param {KeyboardEvent} e */
  onKeyDown(e) {
    if (e.repeat) return;
    const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
    const max = getGlossaryMaxScroll(canvas, this.sections);
    if (e.key === 'Escape') {
      this.manager.switchTo('menu');
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      this.scrollY = Math.max(0, this.scrollY - (e.key === 'PageUp' ? SCROLL_KEY_PX * 4 : SCROLL_KEY_PX));
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      this.scrollY = Math.min(max, this.scrollY + (e.key === 'PageDown' ? SCROLL_KEY_PX * 4 : SCROLL_KEY_PX));
      e.preventDefault();
    }
  }

  /** @param {MouseEvent} e */
  onMouseDown(e) {
    if (e.button !== 0) return;
    if (this._leaveMenu) return;
    const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
    const input = /** @type {{ mouse: { x: number, y: number } }} */ (this.deps.input);
    if (characterSelectBackHitTest(canvas, input.mouse.x, input.mouse.y)) {
      playUiClick(this.deps);
      this._leaveMenu = { t: 0 };
    }
  }
}
