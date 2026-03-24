export class SceneManager {
  /**
   * @param {Record<string, unknown>} deps
   */
  constructor(deps) {
    this.deps = deps;
    /** @type {Map<string, new (mgr: SceneManager, deps: any) => any>} */
    this._registry = new Map();
    /** @type {any} */
    this.current = null;
  }

  /**
   * @param {string} name
   * @param {new (mgr: SceneManager, deps: any) => any} SceneClass
   */
  register(name, SceneClass) {
    this._registry.set(name, SceneClass);
  }

  /**
   * @param {string} name
   * @param {Record<string, unknown>} [data]
   */
  switchTo(name, data) {
    this.current?.exit?.();
    const SceneClass = this._registry.get(name);
    if (!SceneClass) throw new Error(`Unknown scene: ${name}`);
    this.current = new SceneClass(this, this.deps);
    this.current.enter?.(data);
  }

  /** @param {number} dt */
  update(dt) {
    this.current?.update?.(dt);
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.current?.render?.(ctx);
  }

  /** @param {KeyboardEvent} e */
  onKeyDown(e) {
    this.current?.onKeyDown?.(e);
  }

  /** @param {MouseEvent} e */
  onMouseDown(e) {
    this.current?.onMouseDown?.(e);
  }

  /** @param {WheelEvent} e */
  onWheel(e) {
    this.current?.onWheel?.(e);
  }

  /** Tab switch, alt-tab, minimize — `PlayScene` pauses the run. */
  onWindowBlur() {
    this.current?.onWindowBlur?.();
  }
}
