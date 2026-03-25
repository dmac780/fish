import {
  INPUT_SETTINGS_STORAGE_KEY,
  defaultInputBindings,
  INPUT_ACTION_ORDER,
  MOUSE_LEFT_SHOOT_BINDING,
  normalizeKeyEvent,
} from '../config/inputSettings.js';
import {
  AUDIO_VOLUME_STEPS,
  DEFAULT_MUSIC_VOLUME_STEP,
  DEFAULT_SFX_VOLUME_STEP,
} from '../config/audio.js';

/**
 * Persisted player preferences + query helpers for movement / reload.
 * Does not own the raw `keys` map — pass it from `createInput` each frame.
 */
export class InputManager {
  /**
   * @param {{ audio?: import('../game/AudioManager.js').AudioManager | null }} [opts]
   */
  constructor(opts = {}) {
    /** @type {import('../game/AudioManager.js').AudioManager | null} */
    this._audio = opts.audio ?? null;

    /** @type {Record<string, string>} */
    this.bindings = { ...defaultInputBindings };

    /** 0 … AUDIO_VOLUME_STEPS (0 = off, STEPS = full) */
    this.sfxStep = this._clampStep(DEFAULT_SFX_VOLUME_STEP);
    this.musicStep = this._clampStep(DEFAULT_MUSIC_VOLUME_STEP);
    this.muted = false;
    this.showFps = false;
    this.fullscreen = false;
  }

  /**
   * Set the audio manager.
   * @param {import('../game/AudioManager.js').AudioManager | null} a
   * @returns {void}
   */
  setAudio(a) {
    this._audio = a;
    this.applyAudio();
  }

  /**
   * Apply the audio settings.
   * @returns {void}
   */
  applyAudio() {
    const a = this._audio;
    if (!a) return;
    const n = AUDIO_VOLUME_STEPS;
    a.sfxVolume = Math.min(1, Math.max(0, this.sfxStep / n));
    a.musicVolume = Math.min(1, Math.max(0, this.musicStep / n));
    a.muted = this.muted;
    if (typeof a.refreshMenuBgmVolume === 'function') a.refreshMenuBgmVolume();
    if (typeof a.refreshGameplayBgmVolume === 'function') a.refreshGameplayBgmVolume();
  }

  /**
   * Clamp the step.
   * @param {number} s
   * @returns {number}
   */
  _clampStep(s) {
    const n = AUDIO_VOLUME_STEPS;
    return Math.min(n, Math.max(0, Math.round(s)));
  }

  /**
   * Load the input settings.
   * @returns {void}
   */
  load() {
    try {
      const raw = localStorage.getItem(INPUT_SETTINGS_STORAGE_KEY);
      if (!raw) {
        this.applyAudio();
        return;
      }
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        const n = AUDIO_VOLUME_STEPS;
        if (data.v >= 2) {
          if (typeof data.sfxStep === 'number' && Number.isFinite(data.sfxStep)) {
            this.sfxStep = this._clampStep(data.sfxStep);
          }
          if (typeof data.musicStep === 'number' && Number.isFinite(data.musicStep)) {
            this.musicStep = this._clampStep(data.musicStep);
          }
        } else if (typeof data.masterVolume === 'number' && Number.isFinite(data.masterVolume)) {
          const m = Math.min(1, Math.max(0, data.masterVolume));
          const s = this._clampStep(Math.round(m * n));
          this.sfxStep = s;
          this.musicStep = s;
        }
        if (typeof data.muted === 'boolean') this.muted = data.muted;
        if (typeof data.showFps === 'boolean') this.showFps = data.showFps;
        if (typeof data.fullscreen === 'boolean') this.fullscreen = data.fullscreen;
        if (data.bindings && typeof data.bindings === 'object') {
          for (const id of INPUT_ACTION_ORDER) {
            const v = data.bindings[id];
            if (typeof v === 'string' && v.length > 0) this.bindings[id] = v.toLowerCase();
          }
        }
      }
    } catch {
      //
    }
    this.applyAudio();
  }

  /**
   * Save the input settings.
   * @returns {void}
   */
  save() {
    try {
      localStorage.setItem(
        INPUT_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          v: 2,
          sfxStep: this.sfxStep,
          musicStep: this.musicStep,
          muted: this.muted,
          showFps: this.showFps,
          fullscreen: this.fullscreen,
          bindings: { ...this.bindings },
        }),
      );
    } catch {
      //
    }
  }

  /**
   * Get the prevent default keys list.
   * @returns {string[]}
   */
  getPreventDefaultKeysList() {
    const out = new Set();
    for (const id of INPUT_ACTION_ORDER) {
      const k = this.bindings[id];
      if (k && k !== MOUSE_LEFT_SHOOT_BINDING) out.add(k);
    }
    return [...out];
  }

  /**
   * Check if an action is down.
   * @param {string} action
   * @param {Record<string, boolean>} keys
   */
  isActionDown(action, keys) {
    const k = this.bindings[action];
    return !!(k && keys[k]);
  }

  /**
   * Check if an action matches a key.
   * @param {string} action
   * @param {KeyboardEvent} e
   */
  matchesActionKey(action, e) {
    if (e.repeat) return false;
    const want = this.bindings[action];
    if (!want) return false;
    return normalizeKeyEvent(e) === want;
  }

  /**
   * Set the SFX step.
   * @param {number} step 0…AUDIO_VOLUME_STEPS
   * @param {boolean} [persist=true]
   */
  setSfxStep(step, persist = true) {
    this.sfxStep = this._clampStep(step);
    this.applyAudio();
    if (persist) this.save();
  }

  /**
   * Set the music step.
   * @param {number} step 0…AUDIO_VOLUME_STEPS
   * @param {boolean} [persist=true]
   */
  setMusicStep(step, persist = true) {
    this.musicStep = this._clampStep(step);
    this.applyAudio();
    if (persist) this.save();
  }

  /**
   * Bump the SFX step.
   * @param {number} delta
   * @returns {void}
   */
  bumpSfx(delta) {
    this.setSfxStep(this.sfxStep + delta);
  }

  /**
   * Bump the music step.
   * @param {number} delta
   * @returns {void}
   */
  bumpMusic(delta) {
    this.setMusicStep(this.musicStep + delta);
  }

  /**
   * Toggle the muted state.
   * @returns {void}
   */
  toggleMuted() {
    this.muted = !this.muted;
    this.applyAudio();
    this.save();
  }

  /**
   * Toggle the FPS display.
   * @returns {void}
   */
  toggleShowFps() {
    this.showFps = !this.showFps;
    this.save();
  }

  /**
   * Toggle the fullscreen state.
   * @returns {void}
   */
  toggleFullscreen() {
    this.fullscreen = !this.fullscreen;
    this.save();
  }

  /**
   * Set a binding.
   * @param {string} action
   * @param {string} key normalized storage key
   */
  setBinding(action, key) {
    if (!INPUT_ACTION_ORDER.includes(/** @type {any} */ (action))) return;
    const k = key.toLowerCase();
    if (k === 'escape') return;
    for (const id of INPUT_ACTION_ORDER) {
      if (id !== action && this.bindings[id] === k) {
        this.bindings[id] = defaultInputBindings[id];
      }
    }
    this.bindings[action] = k;
    this.save();
  }

  /**
   * Reset the bindings to default.
   * @returns {void}
   */
  resetBindingsToDefault() {
    this.bindings = { ...defaultInputBindings };
    this.save();
  }
}
