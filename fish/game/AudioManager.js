/**
 * Web Audio: polyphony + optional cent jitter. Dry chain: BufferSource → Gain → destination.
 * HTML fallback: overlapping elements + voice cap.
 */

import { AUDIO_ENGINE_DEFAULTS, GAMEPLAY_BGM_CLIP_IDS, AUDIO_CLIPS } from '../config/audio.js';

/** @param {[number, number]} range */
function randInRange(range) {
  const [lo, hi] = range;
  return lo + Math.random() * (hi - lo);
}

/** @param {number} cents */
function centsToPlaybackRate(cents) {
  return Math.pow(2, cents / 1200);
}

/**
 * @param {{ pitchShiftCents?: number, pitchJitterCents?: [number, number] }} c
 * @returns {number | null} detune cents, or null if no pitch config
 */
function clipDetuneCents(c) {
  const shift = c.pitchShiftCents ?? 0;
  const jitter = c.pitchJitterCents ? randInRange(c.pitchJitterCents) : 0;
  if (!c.pitchJitterCents && (c.pitchShiftCents === undefined || c.pitchShiftCents === null)) {
    return null;
  }
  return shift + jitter;
}

export class AudioManager {
  constructor() {
    /** 0–1, applied to clips on the `sfx` bus */
    this.sfxVolume = 1;
    /** 0–1, applied to clips on the `music` bus */
    this.musicVolume = 1;
    this.muted = false;
    /** @type {AudioContext | null} */
    this._ctx = null;
    /** @type {Map<string, WebAudioClip | HtmlClip>} */
    this._clips = new Map();
    /** @type {Map<string, { source: AudioBufferSourceNode }[]>} */
    this._waVoices = new Map();
    /** @type {Map<string, HTMLAudioElement[]>} */
    this._htmlVoices = new Map();
    this._defaultMaxVoices = AUDIO_ENGINE_DEFAULTS.defaultMaxVoices;
    /** @type {null | MenuBgmState} */
    this._menuBgm = null;
    this._menuBgmFading = false;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._menuBgmFadeTimeout = null;
    /** @type {ReturnType<typeof setInterval> | null} */
    this._menuBgmFadeInterval = null;

    /** Preloaded `HTMLAudioElement`s for survival playlist (game1 → game2 → game3 → …). */
    this._gameplayPool = /** @type {HTMLAudioElement[]} */ ([]);
    this._gameplayActive = false;
    /** True while user/scene has paused survival music (not “between tracks”). */
    this._gameplayBgmPaused = false;
    this._gameplayCurrentIdx = -1;
    /** Applied to all survival `HTMLAudioElement`s (fish time, etc.); clamped in setter. */
    this._gameplayBgmPlaybackRate = 1;
  }

  /**
   * Survival BGM only. Clamped ~0.25–2; safe to call every frame (no-op if unchanged).
   * @param {number} rate
   */
  setGameplayBgmPlaybackRate(rate) {
    const r = Math.min(2, Math.max(0.25, Number(rate) || 1));
    if (this._gameplayBgmPlaybackRate === r) return;
    this._gameplayBgmPlaybackRate = r;
    for (const el of this._gameplayPool) {
      try {
        el.playbackRate = r;
      } catch {
        //
      }
    }
  }

  _clearMenuBgmFadeTimers() {
    if (this._menuBgmFadeTimeout != null) {
      clearTimeout(this._menuBgmFadeTimeout);
      this._menuBgmFadeTimeout = null;
    }
    if (this._menuBgmFadeInterval != null) {
      clearInterval(this._menuBgmFadeInterval);
      this._menuBgmFadeInterval = null;
    }
  }

  _stopMenuBgmNow() {
    this._clearMenuBgmFadeTimers();
    const m = this._menuBgm;
    if (m?.kind === 'wa') {
      try {
        m.source.stop(0);
      } catch {
        //
      }
      try {
        m.source.disconnect();
      } catch {
        //
      }
      try {
        m.gain.disconnect();
      } catch {
        //
      }
    } else if (m?.kind === 'html') {
      m.el.pause();
      m.el.src = '';
    }
    this._menuBgm = null;
    this._menuBgmFading = false;
  }

  /**
   * @param {WebAudioClip | HtmlClip} c
   */
  _menuBgmTargetGain(c) {
    if (this.muted) return 0;
    return Math.min(1, Math.max(0, this.musicVolume * c.volume));
  }

  /** Start or resume hub menu loop; keeps playing across char select / glossary / settings. */
  startMenuBgm(clipId) {
    const c = this._clips.get(clipId);
    if (!c) return;
    if (this._menuBgm?.clipId === clipId && !this._menuBgmFading) {
      this.refreshMenuBgmVolume();
      return;
    }
    this._stopMenuBgmNow();
    const g0 = this._menuBgmTargetGain(c);
    if (this._ctx && c.mode === 'webaudio' && c.buffer) {
      this._ctx.resume().catch(() => {});
      const src = this._ctx.createBufferSource();
      src.buffer = c.buffer;
      src.loop = true;
      const gain = this._ctx.createGain();
      gain.gain.value = g0;
      src.connect(gain);
      gain.connect(this._ctx.destination);
      src.start(0);
      this._menuBgm = { kind: 'wa', source: src, gain, clipId, clip: c };
    } else if (c.mode === 'html') {
      const el = new Audio(/** @type {HtmlClip} */ (c).src);
      el.loop = true;
      el.volume = g0;
      el.play().catch(() => {});
      this._menuBgm = { kind: 'html', el, clipId, clip: c };
    }
  }

  /** Apply music / mute settings to the running menu loop (call after `InputManager.applyAudio`). */
  refreshMenuBgmVolume() {
    if (!this._menuBgm || this._menuBgmFading) return;
    const v = this._menuBgmTargetGain(this._menuBgm.clip);
    if (this._menuBgm.kind === 'wa') {
      const ctx = this._ctx;
      if (!ctx) return;
      const now = ctx.currentTime;
      this._menuBgm.gain.gain.cancelScheduledValues(now);
      this._menuBgm.gain.gain.value = v;
    } else {
      this._menuBgm.el.volume = v;
    }
  }

  /**
   * Fade hub BGM to silence then stop (e.g. when entering survival).
   * @param {number} seconds
   */
  fadeOutMenuBgm(seconds) {
    if (!this._menuBgm) return;
    if (seconds <= 0) {
      this._stopMenuBgmNow();
      return;
    }
    this._clearMenuBgmFadeTimers();
    this._menuBgmFading = true;
    const m = this._menuBgm;
    if (m.kind === 'wa' && this._ctx) {
      const ctx = this._ctx;
      ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const gn = m.gain.gain;
      gn.cancelScheduledValues(now);
      gn.setValueAtTime(gn.value, now);
      gn.linearRampToValueAtTime(0, now + seconds);
      try {
        m.source.stop(now + seconds + 0.08);
      } catch {
        //
      }
      this._menuBgmFadeTimeout = setTimeout(() => {
        this._stopMenuBgmNow();
      }, seconds * 1000 + 120);
    } else if (m.kind === 'html') {
      const el = m.el;
      const v0 = el.volume;
      const steps = Math.max(8, Math.ceil((seconds * 1000) / 40));
      let i = 0;
      this._menuBgmFadeInterval = setInterval(() => {
        i += 1;
        if (i >= steps) {
          this._clearMenuBgmFadeTimers();
          el.pause();
          el.src = '';
          this._menuBgm = null;
          this._menuBgmFading = false;
          return;
        }
        el.volume = v0 * (1 - i / steps);
      }, 40);
    }
  }

  /**
   * @param {Record<string, import('../config/audio.js').AudioClipDef>} registry
   */
  async loadAll(registry) {
    const AC = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
    try {
      this._ctx = AC ? new AC() : null;
    } catch {
      this._ctx = null;
    }

    await Promise.all(Object.entries(registry).map(([id, def]) => this._loadClip(id, def)));
    await this._preloadGameplayBgmHtmlPool();
  }

  /**
   * Decode + browser-cache files via `canplaythrough` so first survival bar has no hitch.
   * Uses dedicated elements (not SFX `play()` voices) so pause/resume keeps position.
   */
  async _preloadGameplayBgmHtmlPool() {
    this._gameplayPool = [];
    for (const id of GAMEPLAY_BGM_CLIP_IDS) {
      const def = AUDIO_CLIPS[id];
      if (!def?.src) continue;
      const el = new Audio();
      el.preload = 'auto';
      // Without this, many browsers time-stretch `playbackRate` and keep pitch. Fish time wants slow + deep.
      try {
        el.preservesPitch = false;
      } catch {
        //
      }
      const pitchEl = /** @type {HTMLAudioElement & Record<string, unknown>} */ (el);
      if ('webkitPreservesPitch' in pitchEl) pitchEl.webkitPreservesPitch = false;
      if ('mozPreservesPitch' in pitchEl) pitchEl.mozPreservesPitch = false;
      await new Promise((resolve) => {
        const done = () => resolve(undefined);
        el.addEventListener('canplaythrough', done, { once: true });
        el.addEventListener('error', done, { once: true });
        el.src = def.src;
        el.load();
        setTimeout(done, 15000);
      });
      this._gameplayPool.push(el);
    }
  }

  /**
   * @param {import('../config/audio.js').AudioClipDef | WebAudioClip | HtmlClip | undefined} c
   */
  _gameplayBgmTargetGain(c) {
    if (!c || this.muted) return 0;
    const v = 'volume' in c && c.volume != null ? c.volume : 1;
    return Math.min(1, Math.max(0, this.musicVolume * v));
  }

  /** Start survival playlist at track 1 (`stopGameplayBgm` first if already running). */
  startGameplayBgm() {
    if (this._gameplayPool.length === 0) return;
    this.stopGameplayBgm();
    this._gameplayActive = true;
    this._gameplayBgmPaused = false;
    this._playGameplayTrack(0);
  }

  stopGameplayBgm() {
    this._gameplayActive = false;
    this._gameplayBgmPaused = false;
    this._gameplayCurrentIdx = -1;
    this._gameplayBgmPlaybackRate = 1;
    for (const el of this._gameplayPool) {
      try {
        el.pause();
        el.currentTime = 0;
        el.onended = null;
        el.playbackRate = 1;
      } catch {
        //
      }
    }
  }

  pauseGameplayBgm() {
    if (!this._gameplayActive || this._gameplayBgmPaused) return;
    this._gameplayBgmPaused = true;
    const el = this._gameplayPool[this._gameplayCurrentIdx];
    if (el) {
      try {
        el.pause();
      } catch {
        //
      }
    }
  }

  resumeGameplayBgm() {
    if (!this._gameplayActive || !this._gameplayBgmPaused) return;
    this._gameplayBgmPaused = false;
    const el = this._gameplayPool[this._gameplayCurrentIdx];
    if (el) el.play().catch(() => {});
  }

  /** Apply music / mute to the current survival track (call after `InputManager.applyAudio`). */
  refreshGameplayBgmVolume() {
    if (!this._gameplayActive || this._gameplayCurrentIdx < 0) return;
    const id = GAMEPLAY_BGM_CLIP_IDS[this._gameplayCurrentIdx];
    const c = this._clips.get(id);
    const el = this._gameplayPool[this._gameplayCurrentIdx];
    if (el && c) el.volume = this._gameplayBgmTargetGain(/** @type {WebAudioClip | HtmlClip} */ (c));
  }

  /** @param {number} idx index into `GAMEPLAY_BGM_CLIP_IDS` / pool */
  _playGameplayTrack(idx) {
    if (!this._gameplayActive) return;
    const n = GAMEPLAY_BGM_CLIP_IDS.length;
    if (n === 0 || this._gameplayPool.length !== n) return;
    const i = ((idx % n) + n) % n;
    const id = GAMEPLAY_BGM_CLIP_IDS[i];
    const c = this._clips.get(id);
    const el = this._gameplayPool[i];
    if (!el || !c) return;

    for (let j = 0; j < this._gameplayPool.length; j++) {
      if (j !== i) {
        const o = this._gameplayPool[j];
        try {
          o.pause();
          o.currentTime = 0;
          o.onended = null;
        } catch {
          //
        }
      }
    }

    try {
      el.pause();
      el.currentTime = 0;
    } catch {
      //
    }
    el.volume = this._gameplayBgmTargetGain(/** @type {WebAudioClip | HtmlClip} */ (c));
    try {
      el.playbackRate = this._gameplayBgmPlaybackRate;
    } catch {
      //
    }
    this._gameplayCurrentIdx = i;
    el.onended = () => {
      if (!this._gameplayActive || this._gameplayBgmPaused) return;
      this._playGameplayTrack(i + 1);
    };
    el.play().catch(() => {});
  }

  /**
   * @param {string} id
   * @param {import('../config/audio.js').AudioClipDef} def
   */
  async _loadClip(id, def) {
    const volume = def.volume ?? 1;
    const pitchShiftCents = def.pitchShiftCents;
    const pitchJitterCents = def.pitchJitterCents;
    const maxVoices = def.maxVoices;

    if (GAMEPLAY_BGM_CLIP_IDS.includes(id)) {
      this._clips.set(id, {
        mode: 'html',
        src: def.src,
        volume,
        bus: def.bus ?? 'sfx',
        pitchShiftCents,
        pitchJitterCents,
        maxVoices,
      });
      return;
    }

    if (this._ctx) {
      try {
        const res = await fetch(def.src);
        if (!res.ok) throw new Error(String(res.status));
        const raw = await res.arrayBuffer();
        const buffer = await this._ctx.decodeAudioData(raw.slice(0));
        this._clips.set(id, {
          mode: 'webaudio',
          buffer,
          volume,
          bus: def.bus ?? 'sfx',
          pitchShiftCents,
          pitchJitterCents,
          maxVoices,
        });
        return;
      } catch {
        //
      }
    }

    await new Promise((resolve) => {
      const probe = new Audio();
      probe.preload = 'auto';
      probe.oncanplaythrough = () => {
        this._clips.set(id, {
          mode: 'html',
          src: def.src,
          volume,
          bus: def.bus ?? 'sfx',
          pitchShiftCents,
          pitchJitterCents,
          maxVoices,
        });
        resolve();
      };
      probe.onerror = () => {
        this._clips.delete(id);
        resolve();
      };
      probe.src = def.src;
      probe.load();
    });
  }

  /** @param {string} id */
  play(id) {
    if (this.muted) return;
    const c = this._clips.get(id);
    if (!c) return;
    const bus = /** @type {{ bus?: string }} */ (c).bus ?? 'sfx';
    const busGain = bus === 'music' ? this.musicVolume : this.sfxVolume;
    if (busGain <= 0) return;
    const gain = Math.min(1, Math.max(0, busGain * c.volume));

    if (c.mode === 'webaudio') {
      this._playWebAudio(/** @type {WebAudioClip} */ (c), id, gain);
    } else {
      this._playHtml(/** @type {HtmlClip} */ (c), id, gain);
    }
  }

  /**
   * @param {WebAudioClip} c
   * @param {string} clipId
   * @param {number} gain
   */
  _playWebAudio(c, clipId, gain) {
    const ctx = this._ctx;
    if (!ctx || !c.buffer) return;
    ctx.resume().catch(() => {});

    const maxV = c.maxVoices ?? this._defaultMaxVoices;
    let list = this._waVoices.get(clipId);
    if (!list) {
      list = [];
      this._waVoices.set(clipId, list);
    }
    while (list.length >= maxV) {
      const victim = list.shift();
      if (victim) {
        try {
          victim.source.stop(0);
        } catch {
          //
        }
      }
    }

    const src = ctx.createBufferSource();
    src.buffer = c.buffer;
    const detune = clipDetuneCents(c);
    if (detune !== null) {
      src.detune.value = detune;
    }

    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(ctx.destination);

    const entry = { source: src };
    list.push(entry);

    src.onended = () => {
      const L = this._waVoices.get(clipId);
      if (!L) return;
      const i = L.indexOf(entry);
      if (i >= 0) L.splice(i, 1);
    };

    src.start(0);
  }

  /**
   * @param {HtmlClip} c
   * @param {string} clipId
   * @param {number} gain
   */
  _playHtml(c, clipId, gain) {
    const maxV = c.maxVoices ?? this._defaultMaxVoices;
    let list = this._htmlVoices.get(clipId);
    if (!list) {
      list = [];
      this._htmlVoices.set(clipId, list);
    }
    while (list.length >= maxV) {
      const victim = list.shift();
      victim.pause();
      victim.src = '';
    }

    const a = new Audio(c.src);
    a.volume = gain;
    const cents = clipDetuneCents(c);
    if (cents !== null) {
      a.playbackRate = Math.min(4, Math.max(0.25, centsToPlaybackRate(cents)));
    }
    list.push(a);
    a.addEventListener(
      'ended',
      () => {
        const L = this._htmlVoices.get(clipId);
        if (!L) return;
        const i = L.indexOf(a);
        if (i >= 0) L.splice(i, 1);
      },
      { once: true },
    );
    a.play().catch(() => {
      const L = this._htmlVoices.get(clipId);
      if (!L) return;
      const i = L.indexOf(a);
      if (i >= 0) L.splice(i, 1);
    });
  }
}

/**
 * @typedef {{
 *   mode: 'webaudio',
 *   buffer: AudioBuffer,
 *   volume: number,
 *   bus?: string,
 *   pitchShiftCents?: number,
 *   pitchJitterCents?: [number, number],
 *   maxVoices?: number,
 * }} WebAudioClip
 */

/**
 * @typedef {{
 *   mode: 'html',
 *   src: string,
 *   volume: number,
 *   bus?: string,
 *   pitchShiftCents?: number,
 *   pitchJitterCents?: [number, number],
 *   maxVoices?: number,
 * }} HtmlClip
 */

/**
 * @typedef {{
 *   kind: 'wa',
 *   source: AudioBufferSourceNode,
 *   gain: GainNode,
 *   clipId: string,
 *   clip: WebAudioClip,
 * } | {
 *   kind: 'html',
 *   el: HTMLAudioElement,
 *   clipId: string,
 *   clip: HtmlClip,
 * }} MenuBgmState
 */
