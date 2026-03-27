import { FishHellGame } from '../game/FishHellGame.js';
import { getWeapon } from '../config/weapons.js';
import { getCharacter } from '../config/characters.js';
import {
  MENU_SCENE_TRANSITION_SEC,
  MENU_BGM_FADE_OUT_SEC,
  VICTORY_TO_CREDITS_FADE_SEC,
} from '../config/scenes.js';
import { 
  drawPauseMenu, 
  computePauseMenuLayout, 
  pauseMenuHitTest 
} from './drawPauseMenu.js';
import { playUiClick, playUiSecondaryClick } from './uiClickSound.js';
import { formatRunTime } from '../game/formatRunTime.js';
import { drawCrosshair } from '../game/render.js';

export class PlayScene {
  /**
   * @param {import('./SceneManager.js').SceneManager} manager
   * @param {Record<string, unknown>} deps
   */
  constructor(manager, deps) {
    this.manager = manager;
    this.deps = deps;
    /** @type {FishHellGame | null} */
    this.game = null;
    this.paused = false;
    /** @type {boolean} */
    this._pauseConfirmMenu = false;
    /** @type {number} seconds of black overlay fading out after char select */
    this._introFadeT = 0;
    /** @type {number | null} seconds elapsed for victory fade-out to credits */
    this._victoryFadeT = null;
    /** @type {import('./CreditsScene.js').CreditsRunPayload | null} */
    this._victoryData = null;
    /** Seconds since `PlayScene.enter` for delayed survival BGM (after hub fade-out). */
    this._gameplayBgmDelayAcc = 0;
    this._gameplayBgmStarted = false;
    /** Mirrors pause / victory so we do not spam pause/resume on `AudioManager`. */
    this._gameplayBgmSuspended = false;
  }

  /**
   * @param {{ characterId?: string, fromCharSelect?: boolean } | undefined} data
   */
  enter(data) {
    const d = this.deps;
    const character = getCharacter(
      data?.characterId && typeof data.characterId === 'string' ? data.characterId : undefined,
    );
    /** @type {HTMLCanvasElement} */ (d.canvas);
    /** @type {ReturnType<import('../engine/Input.js').createInput>} */ (d.input).clearPointer();

    this.paused = false;
    this._pauseConfirmMenu = false;
    this._victoryFadeT = null;
    this._victoryData = null;
    this._gameplayBgmDelayAcc = 0;
    this._gameplayBgmStarted = false;
    this._gameplayBgmSuspended = false;
    /** HUD moved to canvas pills; keep old DOM HUD hidden. */
    /** @type {(v: boolean) => void} */ (d.setPlayHudVisible)(false);

    this.game = new FishHellGame({
      canvas: /** @type {HTMLCanvasElement} */ (d.canvas),
      input: /** @type {any} */ (d.input),
      inputManager: /** @type {import('../engine/InputManager.js').InputManager} */ (d.inputManager),
      audio: /** @type {import('../game/AudioManager.js').AudioManager | null | undefined} */ (d.audio) ?? null,
      onHudUpdate: () => {
        const g = this.game;
        if (!g) return;
        const s = g.state;
        document.getElementById('h-hp').textContent = 'HP: ' + Math.max(0, s.player.hp);
        const wl = getWeapon(s.weaponId).label;
        document.getElementById('h-ammo').textContent =
          'Ammo: ' + s.ammo + '/' + s.maxAmmo + ' · ' + wl;
        document.getElementById('h-wave').textContent = 'Wave: ' + s.wave;
        document.getElementById('h-score').textContent =
          'Score: ' + s.score + '  ·  Time: ' + formatRunTime(s.runElapsedSec ?? 0);
      },
      onReloadVisible: (visible) => {
        document.getElementById('h-reload').style.display = visible ? 'block' : 'none';
      },
      onGameOver: () => {
        const g = this.game;
        if (!g) return;
        this.manager.switchTo('gameOver', {
          score: g.state.score,
          wave: g.state.wave,
        });
      },
      onRunComplete: (payload) => {
        this.paused = true;
        this._victoryFadeT = 0;
        this._victoryData = payload;
      },
    });

    this.game.beginRun(character);
    this.game.onHudUpdate();
    this._syncWaveDom();
    this._introFadeT = data?.fromCharSelect ? MENU_SCENE_TRANSITION_SEC : 0;
    /** @type {import('../game/AudioManager.js').AudioManager | null | undefined} */
    const au = /** @type {any} */ (d.audio);
    au?.fadeOutMenuBgm?.(MENU_BGM_FADE_OUT_SEC);
  }

  exit() {
    this.manager.showCursor();
    this.game = null;
    this.paused = false;
    this._pauseConfirmMenu = false;
    this._victoryFadeT = null;
    this._victoryData = null;
    this._gameplayBgmDelayAcc = 0;
    this._gameplayBgmStarted = false;
    this._gameplayBgmSuspended = false;
    /** @type {any} */ (this.deps.audio)?.stopGameplayBgm?.();
    /** @type {(v: boolean) => void} */ (this.deps.setPlayHudVisible)(false);
    const el = document.getElementById('wave-msg');
    if (el) el.style.opacity = '0';
  }

  /** @param {number} dt */
  update(dt) {
    if (!this.game || this.game.gameOver) return;
    if (this._introFadeT > 0) {
      this._introFadeT = Math.max(0, this._introFadeT - dt);
    }

    if (!this._gameplayBgmStarted && !this.game.runVictory && this._victoryFadeT == null) {
      this._gameplayBgmDelayAcc += dt;
    }

    if (this._victoryFadeT != null) {
      this._victoryFadeT += dt;
      if (this._victoryFadeT >= VICTORY_TO_CREDITS_FADE_SEC) {
        const payload = this._victoryData;
        this._victoryFadeT = null;
        this._victoryData = null;
        if (payload) this.manager.switchTo('credits', payload);
      }
      this._syncWaveDom();
      this._syncGameplayBgmSuspend();
      return;
    }

    if (this.paused) {
      this._syncWaveDom();
      this._syncGameplayBgmSuspend();
      return;
    }

    this.game.runTimerSuspended = this._introFadeT > 0;
    this.game.update(dt);

    const au = /** @type {import('../game/AudioManager.js').AudioManager | null | undefined} */ (
      this.deps.audio
    );
    if (
      !this._gameplayBgmStarted &&
      this._gameplayBgmDelayAcc >= MENU_BGM_FADE_OUT_SEC &&
      !this.game.runVictory &&
      this._victoryFadeT == null
    ) {
      au?.startGameplayBgm?.();
      this._gameplayBgmStarted = true;
    }

    this._syncWaveDom();
    this._syncGameplayBgmSuspend();
  }

  _syncGameplayBgmSuspend() {
    const au = /** @type {import('../game/AudioManager.js').AudioManager | null | undefined} */ (
      this.deps.audio
    );
    if (!this.game || !this._gameplayBgmStarted) return;
    const suspendBgm = this.paused || this._victoryFadeT != null || !!this.game.runVictory;
    if (suspendBgm) {
      // `game.update` is skipped while paused; reset fish-time BGM speed so pitch isn’t stuck low.
      au?.setGameplayBgmPlaybackRate?.(1);
    }
    if (suspendBgm !== this._gameplayBgmSuspended) {
      this._gameplayBgmSuspended = suspendBgm;
      if (suspendBgm) au?.pauseGameplayBgm?.();
      else au?.resumeGameplayBgm?.();
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    if (!this.game) return;
    this.game.render(ctx);
    
    const shouldShowCrosshair = !this.paused && this._victoryFadeT == null && this._introFadeT === 0;
    if (shouldShowCrosshair) {
      this.manager.hideCursor();
      const input = /** @type {{ mouse: { x: number, y: number } }} */ (this.deps.input);
      drawCrosshair(ctx, input.mouse.x, input.mouse.y);
    } else {
      this.manager.showCursor();
    }
    
    if (this._introFadeT > 0) {
      const { width: W, height: H } = ctx.canvas;
      const d = MENU_SCENE_TRANSITION_SEC;
      const a = d > 0 ? this._introFadeT / d : 0;
      ctx.fillStyle = `rgba(5, 8, 18, ${a})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (this._victoryFadeT != null && VICTORY_TO_CREDITS_FADE_SEC > 0) {
      const { width: W, height: H } = ctx.canvas;
      const a = Math.min(1, this._victoryFadeT / VICTORY_TO_CREDITS_FADE_SEC);
      ctx.fillStyle = `rgba(5, 8, 18, ${a})`;
      ctx.fillRect(0, 0, W, H);
    } else if (this.paused) {
      const im = /** @type {import('../engine/InputManager.js').InputManager} */ (this.deps.inputManager);
      drawPauseMenu(ctx, {
        sfxStep: im.sfxStep,
        musicStep: im.musicStep,
        muted: im.muted,
        confirmMenu: this._pauseConfirmMenu,
      });
    }
    this._syncWaveDom();
  }

  _syncWaveDom() {
    const el = document.getElementById('wave-msg');
    if (el) el.style.opacity = '0';
  }

  _quitToMainMenu() {
    this._pauseConfirmMenu = false;
    this.paused = false;
    this.manager.switchTo('menu');
  }

  /** @param {KeyboardEvent} e */
  onKeyDown(e) {
    if (e.repeat) return;
    if (!this.game || this.game.gameOver) return;
    if (this._victoryFadeT != null) return;

    if (this.paused) {
      if (this._pauseConfirmMenu) {
        if (e.code === 'Escape' || e.key.toLowerCase() === 'n') {
          playUiSecondaryClick(this.deps);
          this._pauseConfirmMenu = false;
          return;
        }
        if (e.key.toLowerCase() === 'y' || e.code === 'Enter') {
          playUiClick(this.deps);
          this._quitToMainMenu();
          return;
        }
        return;
      }
      if (e.code === 'Escape') {
        playUiClick(this.deps);
        this.paused = false;
        return;
      }
      return;
    }

    if (e.code === 'Escape') {
      this.paused = true;
      /** @type {any} */ (this.deps.input).clearPointer();
      return;
    }

    const im = /** @type {import('../engine/InputManager.js').InputManager} */ (this.deps.inputManager);
    if (im.matchesActionKey('reload', e)) this.game.startReload();
    const auto = getWeapon(this.game.state.weaponId).fire.auto;
    if (im.matchesActionKey('shoot', e) && !auto) this.game.tryShoot();
  }

  /** @param {MouseEvent} e */
  onMouseDown(e) {
    if (!this.game || this.game.gameOver) return;
    if (this._victoryFadeT != null) return;

    if (this.paused) {
      if (e.button !== 0) return;
      const canvas = /** @type {HTMLCanvasElement} */ (this.deps.canvas);
      const input = /** @type {{ mouse: { x: number, y: number } }} */ (this.deps.input);
      const im = /** @type {import('../engine/InputManager.js').InputManager} */ (this.deps.inputManager);
      const lay = computePauseMenuLayout(canvas);
      const hit = pauseMenuHitTest(lay, input.mouse.x, input.mouse.y, this._pauseConfirmMenu);
      if (!hit) return;

      const secondaryPauseHit =
        hit.kind === 'confirmNo' ||
        hit.kind === 'sfxStep' ||
        hit.kind === 'sfxBump' ||
        hit.kind === 'musicStep' ||
        hit.kind === 'musicBump' ||
        hit.kind === 'mute';
      if (secondaryPauseHit) playUiSecondaryClick(this.deps);
      else playUiClick(this.deps);

      if (this._pauseConfirmMenu) {
        if (hit.kind === 'confirmYes') this._quitToMainMenu();
        else if (hit.kind === 'confirmNo') this._pauseConfirmMenu = false;
        return;
      }

      if (hit.kind === 'resume') {
        this.paused = false;
        return;
      }
      if (hit.kind === 'sfxStep') im.setSfxStep(hit.step);
      else if (hit.kind === 'sfxBump') im.bumpSfx(hit.delta);
      else if (hit.kind === 'musicStep') im.setMusicStep(hit.step);
      else if (hit.kind === 'musicBump') im.bumpMusic(hit.delta);
      else if (hit.kind === 'mute') im.toggleMuted();
      else if (hit.kind === 'mainMenu') this._pauseConfirmMenu = true;
      return;
    }

    const auto = getWeapon(this.game.state.weaponId).fire.auto;
    if (e.button === 0 && !auto) this.game.tryShoot();
  }

  /** Tab / window focus lost — same as pressing Esc to pause. */
  onWindowBlur() {
    if (!this.game || this.game.gameOver) return;
    if (this._victoryFadeT != null || this.game.runVictory) return;
    if (this.paused) return;
    this.paused = true;
    /** @type {any} */ (this.deps.input).clearPointer();
  }
}
