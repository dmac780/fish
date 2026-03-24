import {
  SPLASH_CROSSFADE_SEC,
  SPLASH_DRIVER_TEXT_FADE_PORTION,
} from '../config/scenes.js';
import { drawMainMenu } from './drawUi.js';
import { unitScale } from '../config/units.js';

/** Radians per second for “click to play” pulse */
const CLICK_PROMPT_PULSE_RATE = 5.2;

export class SplashScene {
  /**
   * @param {import('./SceneManager.js').SceneManager} manager
   * @param {Record<string, unknown>} deps
   */
  constructor(manager, deps) {
    this.manager = manager;
    this.deps = deps;
    /** @type {'driver' | 'fade'} */
    this.phase = 'driver';
    /** @type {number} time in driver (animation) or unused in fade */
    this.tPhase = 0;
    this.tFade = 0;
  }

  enter() {
    this.phase = 'driver';
    this.tPhase = 0;
    this.tFade = 0;
    /** @type {(v: boolean) => void} */ (this.deps.setPlayHudVisible)(false);
  }

  /** @param {number} dt */
  update(dt) {
    if (this.phase === 'driver') {
      this.tPhase += dt;
      return;
    }
    this.tFade += dt;
    if (this.tFade >= SPLASH_CROSSFADE_SEC) {
      this.manager.switchTo('menu', { skipMenuEnterFade: true });
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const u = unitScale(ctx.canvas);

    if (this.phase === 'driver') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f5f5f5';
      ctx.font = `bold ${Math.round(56 * u)}px monospace`;
      ctx.fillText('IMAGINATION', W / 2, H / 2 - 32 * u);
      ctx.fillText('DRIVER', W / 2, H / 2 + 32 * u);

      const pulse = 0.38 + 0.62 * (0.5 + 0.5 * Math.sin(this.tPhase * CLICK_PROMPT_PULSE_RATE));
      ctx.font = `bold ${Math.round(17 * u)}px Georgia, "Hiragino Mincho ProN", serif`;
      ctx.fillStyle = `rgba(255, 240, 245, ${pulse})`;
      ctx.fillText('クリックしてプレイ', W / 2, H / 2 + 92 * u);
      ctx.font = `bold ${Math.round(14 * u)}px monospace`;
      ctx.fillStyle = `rgba(255, 220, 200, ${pulse * 0.95})`;
      ctx.fillText('CLICK TO PLAY', W / 2, H / 2 + 118 * u);

      ctx.textBaseline = 'alphabetic';
      ctx.font = `${Math.round(11 * u)}px monospace`;
      ctx.fillStyle = 'rgba(180, 175, 195, 0.55)';
      ctx.fillText('imaginationdriver.com', W / 2, H - 52 * u);
      ctx.fillStyle = 'rgba(160, 155, 185, 0.5)';
      ctx.fillText('github.com/dmac780', W / 2, H - 32 * u);
      return;
    }

    drawMainMenu(ctx, 0);

    const fadeT = Math.min(1, this.tFade / SPLASH_CROSSFADE_SEC);
    const blackA = 1 - fadeT;
    if (blackA > 0) {
      ctx.fillStyle = `rgba(0,0,0,${blackA})`;
      ctx.fillRect(0, 0, W, H);
    }

    const textFadeEnd = SPLASH_CROSSFADE_SEC * SPLASH_DRIVER_TEXT_FADE_PORTION;
    const textA = Math.max(0, 1 - this.tFade / textFadeEnd);
    if (textA > 0) {
      ctx.fillStyle = `rgba(245,245,245,${textA})`;
      ctx.font = `bold ${Math.round(56 * u)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('IMAGINATION', W / 2, H / 2 - 32 * u);
      ctx.fillText('DRIVER', W / 2, H / 2 + 32 * u);
    }
  }

  /** @param {MouseEvent} _e */
  onMouseDown(_e) {
    if (this.phase === 'driver') {
      this.phase = 'fade';
      this.tFade = 0;
    }
  }
}
