import { CHARACTERS } from '../config/characters.js';
import { MENU_SCENE_TRANSITION_SEC } from '../config/scenes.js';
import {
  drawCharacterSelect,
  characterSelectHitTest,
  characterSelectBackHitTest,
} from './drawCharacterSelect.js';
import { drawMenuSceneTransitionOverlay } from './drawMenuTransition.js';
import { playUiClick, playUiHover } from './uiClickSound.js';

/** Three quick border on/off cycles, then fade */
const EXIT_FLASH_DURATION = 0.36;
/** Full-screen fade into gameplay */
const EXIT_FADE_DURATION = 0.62;
/** Focus weight ease (higher = snappier) */
const FOCUS_EASE_LAMBDA = 11;

export class CharacterSelectScene {
  /**
   * @param {import('./SceneManager.js').SceneManager} manager
   * @param {Record<string, unknown>} deps
   */
  constructor(manager, deps) {
    this.manager = manager;
    this.deps = deps;
    /** @type {number} */
    this.focusIndex = 0;
    /** @type {number} */
    this._bgTime = 0;
    /** @type {number[]} smooth 0–1 focus per card */
    this._warmth = [1, 0, 0];
    /** @type {{ index: number, phase: 'flash' | 'fade', t: number } | null} */
    this._exit = null;
    /** @type {number} */
    this._enterFadeT = 0;
    /** @type {{ t: number } | null} */
    this._leaveMenu = null;
    /** Last mouse-hover target for SFX: back, card index, or null. */
    this._lastHoverTarget = /** @type {null | 'back' | number} */ (null);
  }

  enter() {
    /** @type {(v: boolean) => void} */ (this.deps.setPlayHudVisible)(false);
    this.focusIndex = 0;
    this._bgTime = 0;
    this._warmth = [1, 0, 0];
    this._exit = null;
    this._enterFadeT = 0;
    this._leaveMenu = null;
    this._lastHoverTarget = null;
  }

  /** @param {number} dt */
  update(dt) {
    this._bgTime += dt;
    if (this._enterFadeT < MENU_SCENE_TRANSITION_SEC) this._enterFadeT += dt;

    if (this._leaveMenu && !this._exit) {
      this._leaveMenu.t += dt;
      if (this._leaveMenu.t >= MENU_SCENE_TRANSITION_SEC) {
        this.manager.switchTo('menu');
      }
      return;
    }

    if (this._exit) {
      this._exit.t += dt;
      if (this._exit.phase === 'flash') {
        if (this._exit.t >= EXIT_FLASH_DURATION) {
          this._exit.phase = 'fade';
          this._exit.t = 0;
        }
      } else if (this._exit.t >= EXIT_FADE_DURATION) {
        const ch = CHARACTERS[this._exit.index];
        if (ch) this.manager.switchTo('play', { characterId: ch.id, fromCharSelect: true });
        this._exit = null;
      }
      return;
    }

    const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
    const input = /** @type {{ mouse: { x: number, y: number } }} */ (this.deps.input);
    const onBack = characterSelectBackHitTest(canvas, input.mouse.x, input.mouse.y);
    const hit = characterSelectHitTest(canvas, input.mouse.x, input.mouse.y);
    /** @type {null | 'back' | number} */
    let hoverKey = null;
    if (onBack) hoverKey = 'back';
    else if (hit >= 0) hoverKey = hit;
    if (hoverKey !== this._lastHoverTarget && hoverKey !== null) {
      playUiHover(this.deps);
      this._lastHoverTarget = hoverKey;
    } else if (hoverKey === null && this._lastHoverTarget !== null) {
      this._lastHoverTarget = null;
    }
    if (hit >= 0) this.focusIndex = hit;
    const goal = this.focusIndex;
    const k = 1 - Math.exp(-FOCUS_EASE_LAMBDA * dt);
    for (let i = 0; i < this._warmth.length; i++) {
      const target = i === goal ? 1 : 0;
      this._warmth[i] += (target - this._warmth[i]) * k;
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
    const input = /** @type {{ mouse: { x: number, y: number } }} */ (this.deps.input);
    const backDimmed = !!this._exit || !!this._leaveMenu;
    const backHover =
      !backDimmed &&
      characterSelectBackHitTest(canvas, input.mouse.x, input.mouse.y);

    /** @type {import('./drawCharacterSelect.js').CharacterSelectDrawOpts['exitFx']} */
    let exitFx = null;
    if (this._exit) {
      if (this._exit.phase === 'flash') {
        exitFx = {
          kind: 'flash',
          index: this._exit.index,
          t: this._exit.t,
          duration: EXIT_FLASH_DURATION,
        };
      } else {
        exitFx = {
          kind: 'fade',
          index: this._exit.index,
          alpha: Math.min(1, this._exit.t / EXIT_FADE_DURATION),
        };
      }
    }

    drawCharacterSelect(ctx, {
      warmth: this._warmth,
      characters: CHARACTERS,
      time: this._bgTime,
      exitFx,
      backHover,
      backDimmed,
    });
    drawMenuSceneTransitionOverlay(
      ctx,
      this._enterFadeT,
      this._leaveMenu && !this._exit ? this._leaveMenu.t : 0,
    );
  }

  /** @param {number} i */
  _confirm(i) {
    if (this._exit) return;
    const ch = CHARACTERS[i];
    if (!ch) return;
    playUiClick(this.deps);
    this._exit = { index: i, phase: 'flash', t: 0 };
  }

  /** @param {KeyboardEvent} e */
  onKeyDown(e) {
    if (this._exit || this._leaveMenu) return;
    if (e.repeat) return;
    if (e.key === 'Escape') {
      playUiClick(this.deps);
      this._leaveMenu = { t: 0 };
      return;
    }
    if (e.key === 'ArrowLeft') {
      this.focusIndex = (this.focusIndex + CHARACTERS.length - 1) % CHARACTERS.length;
      playUiHover(this.deps);
      return;
    }
    if (e.key === 'ArrowRight') {
      this.focusIndex = (this.focusIndex + 1) % CHARACTERS.length;
      playUiHover(this.deps);
      return;
    }
    if (e.code === 'Enter' || e.key === ' ') {
      this._confirm(this.focusIndex);
      return;
    }
    if (e.key === '1') this._confirm(0);
    else if (e.key === '2') this._confirm(1);
    else if (e.key === '3') this._confirm(2);
  }

  /** @param {MouseEvent} e */
  onMouseDown(e) {
    if (this._exit || this._leaveMenu) return;
    if (e.button !== 0) return;
    const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
    const input = /** @type {{ mouse: { x: number, y: number } }} */ (this.deps.input);
    if (characterSelectBackHitTest(canvas, input.mouse.x, input.mouse.y)) {
      playUiClick(this.deps);
      this._leaveMenu = { t: 0 };
      return;
    }
    const hit = characterSelectHitTest(canvas, input.mouse.x, input.mouse.y);
    if (hit >= 0) this._confirm(hit);
  }
}
