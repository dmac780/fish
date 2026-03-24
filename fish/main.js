import { GameLoop } from './engine/GameLoop.js';
import { createInput } from './engine/Input.js';
import { InputManager } from './engine/InputManager.js';
import { applyDisplay } from './applyDisplay.js';
import { display } from './config/display.js';
import { SIM_HZ } from './config/timing.js';
import { SceneManager } from './scenes/SceneManager.js';
import { SplashScene } from './scenes/SplashScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GlossaryScene } from './scenes/GlossaryScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { PlayScene } from './scenes/PlayScene.js';
import { CharacterSelectScene } from './scenes/CharacterSelectScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { CreditsScene } from './scenes/CreditsScene.js';
import { loadGameAssets, getWeaponTexture, getArmuzzleTexture } from './game/assets.js';
import { AudioManager } from './game/AudioManager.js';
import { AUDIO_CLIPS } from './config/audio.js';

 /** @type {HTMLCanvasElement} */
const canvas = document.getElementById('gc');

/** @type {HTMLDivElement} */
const wrap = document.getElementById('game-wrap');

/** @type {HTMLElement} */
const bootLoader = document.getElementById('boot-loader');

/** @type {AudioManager} */
const audio = new AudioManager();

/** @type {InputManager} */
const inputManager = new InputManager({ audio });

inputManager.load();
display.fullscreen = inputManager.fullscreen;

/** @type {ReturnType<typeof applyDisplay>} */
const displayCtl = applyDisplay(canvas, wrap, display);

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext('2d');

/**
 * Relayout the display.
 * @returns {void} 
 */
function relayoutDisplay() {
  display.fullscreen = inputManager.fullscreen;
  displayCtl.relayout();
}

/** @type {ReturnType<typeof createInput>} */
const input = createInput(canvas, {
  getPreventDefaultKeys: () => inputManager.getPreventDefaultKeysList(),
});

/**
 * Set the play HUD visible.
 * @param {boolean} visible
 * @returns {void}
 */
function setPlayHudVisible(visible) {
  const hud  = document.getElementById('hud');
  const wave = document.getElementById('wave-msg');
  const disp = visible ? 'block' : 'none';
  if (hud) {
    hud.style.display = disp;
  }
  if (wave) {
    wave.style.display = disp;
    if (!visible) {
      wave.style.opacity = '0';
    }
  }
}

/** @type {HTMLElement} */
const elFps = document.getElementById('h-fps');
if (elFps) {
  elFps.textContent = `FPS: — · sim ${SIM_HZ}Hz`;
}

/** @type {number} */
let _fpsFrames = 0;

/** @type {number} */
let _fpsT0 = performance.now();

/**
 * Sync the FPS overlay.
 * @returns {void}
 */
function syncFpsOverlay() {
  if (!elFps) return;
  elFps.style.display = inputManager.showFps ? 'block' : 'none';
}

/**
 * Tick the FPS meter.
 * @returns {void}
 */
function tickFpsMeter() {
  if (!elFps || !inputManager.showFps) return;
  _fpsFrames++;
  const t = performance.now();
  const dt = t - _fpsT0;
  if (dt < 400) return;
  const fps = Math.round((_fpsFrames * 1000) / dt);
  elFps.textContent = `FPS: ${fps} · sim ${SIM_HZ}Hz`;
  _fpsFrames = 0;
  _fpsT0 = t;
}

/** @type {Record<string, unknown>} */
const deps = { canvas, wrap, input, inputManager, setPlayHudVisible, audio, relayoutDisplay };

/** @type {SceneManager} */
const scenes = new SceneManager(deps);

scenes.register('splash', SplashScene);
scenes.register('menu', MenuScene);
scenes.register('glossary', GlossaryScene);
scenes.register('settings', SettingsScene);
scenes.register('charSelect', CharacterSelectScene);
scenes.register('play', PlayScene);
scenes.register('gameOver', GameOverScene);
scenes.register('credits', CreditsScene);

/** @type {GameLoop} */
const loop = new GameLoop({
  update(dt) {
    scenes.update(dt);
  },
  render() {
    syncFpsOverlay();
    tickFpsMeter();
    scenes.render(ctx);
  },
});

document.addEventListener('keydown', (e) => {
  scenes.onKeyDown(e);
});

canvas.addEventListener('mousedown', (e) => {
  input.syncMouseFromEvent(e);
  scenes.onMouseDown(e);
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

canvas.addEventListener(
  'wheel',
  (e) => {
    scenes.onWheel(e);
  },
  { passive: false },
);

window.addEventListener('blur', () => {
  scenes.onWindowBlur();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') scenes.onWindowBlur();
});

/**
 * Load the game assets and audio clips.
 * @returns {Promise<void>}
 */
Promise.all([loadGameAssets(), audio.loadAll(AUDIO_CLIPS)])
  .then(() => {
    if (!getWeaponTexture('ar')) console.warn('fish/assets/weapons/ar.png not loaded; gun uses placeholder.');
    if (!getArmuzzleTexture()) console.warn('fish/assets/muzzle/armuzzle.png not loaded; muzzle flash disabled.');
  })
  .finally(() => {
    scenes.switchTo('splash');
    loop.start();
    if (bootLoader) bootLoader.remove();
  });
