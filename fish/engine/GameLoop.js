import { SIM_HZ } from '../config/timing.js';

/**
 * Game loop (requestAnimationFrame driver)
 *
 * - Render: once per real display frame (~60+ Hz); uses whatever rAF gives you.
 * - Simulation: NOT tied to rAF delta. We step the world at a fixed rate (see SIM_HZ)
 *   so bullet-hell collision stays stable. Real elapsed time is accumulated; we may run
 *   0, 1, or several fixed steps per frame to catch up (capped by maxSubSteps).
 *
 * So: fixedDt is 1/SIM_HZ seconds, not "the rAF delta".
 */
export class GameLoop {
  /**
   * @param {{
   *   update: (dt: number) => void,
   *   render: () => void,
   *   fixedDt?: number,
   *   maxSubSteps?: number,
   * }} opts
   */
  constructor({
    update,
    render,
    fixedDt = 1 / SIM_HZ,
    maxSubSteps = 8,
  }) {
    this._update = update;
    this._render = render;
    this.fixedDt = fixedDt;
    this.maxSubSteps = maxSubSteps;
    this._acc = 0;
    this._lastTime = 0;
    this._rafId = null;
    this.running = false;
    this._boundFrame = this._frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._lastTime = performance.now() / 1000;
    this._acc = 0;
    this._rafId = requestAnimationFrame(this._boundFrame);
  }

  stop() {
    this.running = false;
    if (this._rafId != null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /**
   * @param {number} nowMs
   */
  _frame(nowMs) {
    if (!this.running) return;
    const now = nowMs / 1000;
    let frameDt = now - this._lastTime;
    this._lastTime = now;
    frameDt = Math.min(frameDt, 0.25);

    this._acc += frameDt;
    let steps = 0;
    const { fixedDt, maxSubSteps } = this;
    while (this._acc >= fixedDt && steps < maxSubSteps) {
      this._update(fixedDt);
      this._acc -= fixedDt;
      steps++;
    }
    if (steps === maxSubSteps) this._acc = 0;

    this._render();
    if (this.running) {
      this._rafId = requestAnimationFrame(this._boundFrame);
    } else {
      this._rafId = null;
    }
  }
}
