import {
  drawSettings,
  computeSettingsLayout,
  settingsHitTest,
  characterSelectBackHitTest,
} from './drawSettings.js';
import { drawMenuSceneTransitionOverlay } from './drawMenuTransition.js';
import { MENU_SCENE_TRANSITION_SEC } from '../config/scenes.js';
import { MOUSE_LEFT_SHOOT_BINDING, normalizeKeyEvent } from '../config/inputSettings.js';
import { playUiClick, playUiHover, playUiSecondaryClick } from './uiClickSound.js';

export class SettingsScene {
  /**
   * @param {import('./SceneManager.js').SceneManager} manager
   * @param {Record<string, unknown>} deps
   */
  constructor(manager, deps) {
    this.manager = manager;
    this.deps = deps;
    /** @type {number} */
    this._bgTime = 0;
    /** @type {number} */
    this._enterFadeT = 0;
    /** @type {{ t: number } | null} */
    this._leaveMenu = null;
    /** @type {string | null} */
    this._captureAction = null;
    /** @type {boolean} */
    this._lastBackHover = false;
  }

  enter() {
    /** @type {(v: boolean) => void} */ (this.deps.setPlayHudVisible)(false);
    this._bgTime = 0;
    this._enterFadeT = 0;
    this._leaveMenu = null;
    this._captureAction = null;
    this._lastBackHover = false;
  }

  /** @param {number} dt */
  update(dt) {
    this._bgTime += dt;
    if (this._enterFadeT < MENU_SCENE_TRANSITION_SEC) this._enterFadeT += dt;
    if (!this._leaveMenu && !this._captureAction) {
      const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
      const input = /** @type {{ mouse: { x: number, y: number } }} */ (this.deps.input);
      const backHover = characterSelectBackHitTest(canvas, input.mouse.x, input.mouse.y);
      if (backHover && !this._lastBackHover) playUiHover(this.deps);
      this._lastBackHover = backHover;
    } else {
      this._lastBackHover = false;
    }
    if (this._leaveMenu) {
      this._leaveMenu.t += dt;
      if (this._leaveMenu.t >= MENU_SCENE_TRANSITION_SEC) {
        this.manager.switchTo('menu');
      }
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
    const input = /** @type {{ mouse: { x: number, y: number } }} */ (this.deps.input);
    const im = /** @type {import('../engine/InputManager.js').InputManager} */ (this.deps.inputManager);
    const backHover =
      !this._leaveMenu &&
      !this._captureAction &&
      characterSelectBackHitTest(canvas, input.mouse.x, input.mouse.y);

    drawSettings(ctx, {
      time: this._bgTime,
      backHover,
      backDimmed: !!this._leaveMenu || !!this._captureAction,
      sfxStep: im.sfxStep,
      musicStep: im.musicStep,
      muted: im.muted,
      showFps: im.showFps,
      fullscreen: im.fullscreen,
      captureAction: this._captureAction,
      bindings: im.bindings,
    });
    drawMenuSceneTransitionOverlay(ctx, this._enterFadeT, this._leaveMenu?.t ?? 0);
  }

  _startLeave() {
    this._captureAction = null;
    this._leaveMenu = { t: 0 };
  }

  /** @param {KeyboardEvent} e */
  onKeyDown(e) {
    if (this._leaveMenu) return;
    if (this._captureAction) {
      if (e.repeat) return;
      if (e.key === 'Escape') {
        playUiSecondaryClick(this.deps);
        this._captureAction = null;
        return;
      }
      const k = normalizeKeyEvent(e);
      if (k === 'escape') return;
      const im = /** @type {import('../engine/InputManager.js').InputManager} */ (
        this.deps.inputManager
      );
      playUiSecondaryClick(this.deps);
      im.setBinding(this._captureAction, k);
      this._captureAction = null;
      e.preventDefault();
      return;
    }
    if (e.repeat) return;
    if (e.key === 'Escape') {
      playUiClick(this.deps);
      this._startLeave();
    }
  }

  /** @param {MouseEvent} e */
  onMouseDown(e) {
    if (this._leaveMenu || e.button !== 0) return;
    const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
    const input = /** @type {{ mouse: { x: number, y: number } }} */ (this.deps.input);
    const im = /** @type {import('../engine/InputManager.js').InputManager} */ (this.deps.inputManager);
    const lay = computeSettingsLayout(canvas);
    const hit = settingsHitTest(lay, input.mouse.x, input.mouse.y);

    if (this._captureAction === 'shoot') {
      const blockLClickAssign =
        hit &&
        (hit.kind === 'back' ||
          hit.kind === 'mute' ||
          hit.kind === 'showFps' ||
          hit.kind === 'fullscreen' ||
          hit.kind === 'sfxStep' ||
          hit.kind === 'sfxBump' ||
          hit.kind === 'musicStep' ||
          hit.kind === 'musicBump' ||
          hit.kind === 'reset');
      if (!blockLClickAssign) {
        playUiSecondaryClick(this.deps);
        im.setBinding('shoot', MOUSE_LEFT_SHOOT_BINDING);
        this._captureAction =
          hit?.kind === 'bind' && hit.action !== 'shoot' ? hit.action : null;
        return;
      }
    }

    if (!hit) return;

    if (hit.kind === 'back') {
      playUiClick(this.deps);
      this._startLeave();
      return;
    }

    playUiSecondaryClick(this.deps);

    if (hit.kind === 'mute') {
      im.toggleMuted();
      return;
    }
    if (hit.kind === 'showFps') {
      im.toggleShowFps();
      return;
    }
    if (hit.kind === 'fullscreen') {
      im.toggleFullscreen();
      /** @type {(() => void) | undefined} */ (this.deps.relayoutDisplay)?.();
      return;
    }
    if (hit.kind === 'sfxStep') {
      im.setSfxStep(hit.step);
      return;
    }
    if (hit.kind === 'sfxBump') {
      im.bumpSfx(hit.delta);
      return;
    }
    if (hit.kind === 'musicStep') {
      im.setMusicStep(hit.step);
      return;
    }
    if (hit.kind === 'musicBump') {
      im.bumpMusic(hit.delta);
      return;
    }
    if (hit.kind === 'reset') {
      im.resetBindingsToDefault();
      return;
    }
    if (hit.kind === 'bind') {
      this._captureAction = hit.action;
    }
  }
}
