import { SIM_HZ } from '../config/timing.js';
import { unitScale } from '../config/units.js';
import { player as playerCfg, enemy as enemyCfg, fishTime as fishTimeCfg } from '../config/gameplay.js';
import {
  getCharacter,
  DEFAULT_CHARACTER_ID,
  statToHp,
  statToSpeedMult,
} from '../config/characters.js';
import { getWeapon, DEFAULT_WEAPON_ID, WEAPONS } from '../config/weapons.js';
import { muzzleWorld, gunAimPerpSign, aimAngleMuzzleToTarget } from './weaponMath.js';
import { WAVE_BANNER_SEC } from '../config/scenes.js';
import {
  ENEMY_TYPES,
  WAVE_SPAWN_INTERVAL,
  WAVE_BREAK_DURATION,
} from '../config/enemies.js';
import {
  TURRET_ENEMY_TYPES,
  rollTurretSpawn,
  resolveTurretHoldPosition,
} from '../config/turretEnemies.js';
import {
  OBSTACLE_TYPES,
  rollObstacleSpawn,
} from '../config/obstacleEnemies.js';
import {
  CLAM_CARRIER,
  FAKE_FISH_CARRIER,
  rollItemCarrierSlots,
  rollItemCarrierOnSpawn,
  itemPickupHoldTicks,
  rollCarrierDropItemId,
} from '../config/itemEnemies.js';
import { getItemDef } from '../config/items.js';
import { formatKeyDisplay } from '../config/inputSettings.js';
import { renderWorld } from './render.js';
import { spawnBossForWaveIfNeeded, updateBoss } from './bosses/bossManager.js';
import { gameConfig } from '../config/gameConfig.js';
import { BOSS_DEATH_EXPLOSION } from '../config/vfx.js';

/** Dev-only: obstacle flood mode (requires `gameConfig.devMode`). */
function effectiveOopsAllObstacles() {
  return !!(gameConfig.devMode && gameConfig.oopsAllObstacles);
}
import { playerIdleBubbleIntervalTicks, bossDeathBubbleEmitter } from '../config/bubbleFx.js';
import {
  spawnBubbleBurst,
  stepWorldBubbles,
  pushBossDeathBubbleEmitter,
  stepBossDeathBubbleEmitters,
} from './bubbleFx.js';

/**
 * @typedef {{
 *   score: number,
 *   wave: number,
 *   characterId: string,
 *   playerHp: number,
 *   playerHpMax: number,
 *   weaponId: string,
 *   weaponLabel: string,
 *   runTimeSec: number,
 * }} RunCompletePayload
 */

/**
 * @param {{ x: number, y: number, size: number, obstacleHitHalfW?: number, obstacleHitHalfH?: number, dropHoldAnchorBottom?: boolean }} e
 * @param {number} px
 * @param {number} py
 * @param {number} hitPlayerExtra
 * @param {number} playerHitR
 */
function obstaclePlayerHit(e, px, py, hitPlayerExtra, playerHitR) {
  const hw = e.obstacleHitHalfW;
  const hh = e.obstacleHitHalfH;
  const reach = playerHitR + hitPlayerExtra;
  if (hw != null && hh != null) {
    const qx = Math.max(e.x - hw, Math.min(px, e.x + hw));
    let qy;
    if (e.dropHoldAnchorBottom) {
      const top = e.y - 2 * hh;
      qy = Math.max(top, Math.min(py, e.y));
    } else {
      qy = Math.max(e.y - hh, Math.min(py, e.y + hh));
    }
    return Math.hypot(px - qx, py - qy) < reach;
  }
  return Math.hypot(px - e.x, py - e.y) < e.size + hitPlayerExtra;
}

/**
 * @param {{ x: number, y: number, size: number, obstacleHitHalfW?: number, obstacleHitHalfH?: number, dropHoldAnchorBottom?: boolean }} e
 * @param {number} bx
 * @param {number} by
 * @param {number} hitBulletExtra
 */
function obstacleBulletHit(e, bx, by, hitBulletExtra) {
  const hw = e.obstacleHitHalfW;
  const hh = e.obstacleHitHalfH;
  if (hw != null && hh != null) {
    const qx = Math.max(e.x - hw, Math.min(bx, e.x + hw));
    let qy;
    if (e.dropHoldAnchorBottom) {
      const top = e.y - 2 * hh;
      qy = Math.max(top, Math.min(by, e.y));
    } else {
      qy = Math.max(e.y - hh, Math.min(by, e.y + hh));
    }
    return Math.hypot(bx - qx, by - qy) < hitBulletExtra;
  }
  return Math.hypot(bx - e.x, by - e.y) < e.size + hitBulletExtra;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {import('../config/characters.js').CharacterDef} character
 */
function createState(canvas, character) {
  const W = canvas.width;
  const H = canvas.height;
  const u = unitScale(canvas);
  const w0 = getWeapon(DEFAULT_WEAPON_ID);
  const f0 = w0.fire;
  const hp = statToHp(character.hpStat);
  const speed = playerCfg.moveSpeed * statToSpeedMult(character.speedStat) * u;
  return {
    weaponId: DEFAULT_WEAPON_ID,
    characterId: character.id,
    characterAssetKey: character.assetKey,
    player: {
      x: W / 2,
      y: H / 2,
      /** @type {1|-1} */
      facing: 1,
      aimAngle: 0,
      hp,
      speed,
    },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    particles: [],
    muzzleFlashes: [],
    /** @type {Array<{ x: number, y: number, t: number }>} */
    bossDeathFx: [],
    wave: 1,
    score: 0,
    /** Wall-clock-style run time (seconds); advances only in `update` (pauses when scene pauses). */
    runElapsedSec: 0,
    ammo: f0.maxAmmo,
    maxAmmo: f0.maxAmmo,
    reloading: false,
    reloadTimer: 0,
    fireCooldown: 0,
    nextWave: false,
    enemiesLeft: 0,
    invuln: 0,
    damageFlash: 0,
    screenShakeTicks: 0,
    screenShakeX: 0,
    screenShakeY: 0,
    waveSpawnRemaining: 0,
    waveSpawnCooldown: 0,
    waveBreakTimer: 0,
    waveBanner: { wave: /** @type {number | null} */ (null), timeLeft: 0 },
    playerAnchorX: W / 2,
    playerAnchorY: H / 2,
    waterBobPhase: 0,
    dualWieldHand: 0,
    turretsSpawnedThisWave: 0,
    obstaclesSpawnedThisWave: 0,
    /** @type {Array<{ warnElapsed: number, warnDurationTicks: number, warnOpacityCycles: number, warnX: number, y: number, laneX?: number, warnY?: number, def: import('../config/obstacleEnemies.js').ObstacleEnemyDef }>} */
    pendingObstacles: [],
    /** @type {Array<{ itemId: string, x: number, y: number, phase: 'hold' | 'drift', holdTicks: number, vx: number, icBaseY: number, icBobPhase: number, icBobRate: number, icBobAmpU: number, bobTick: number }>} */
    worldPickups: [],
    /** @type {{ id: string, emoji: string, label: string, damageMul?: number, noReload?: boolean, projectileColor?: string, ticksLeft: number, maxTicks: number } | null} */
    activeBuff: null,
    itemCarriersSlotsThisWave: 0,
    itemCarriersSpawnedThisWave: 0,
    boss: null,
    /** Visual gun kick (design units × unitScale); decays each tick, no gameplay effect */
    gunRecoilAlongU: 0,
    /** Counts down while idle; spawns 3 bubbles when ≤ 0 */
    idleBubbleCooldownTicks: playerIdleBubbleIntervalTicks,
    /** @type {Array<{ x: number, y: number, r: number, vx: number, vy: number, life: number, maxLife: number }>} */
    playerBubbles: [],
    /** @type {Array<{ cx: number, cy: number, radiusPx: number, remaining: number, cooldown: number, aliveTicks: number }>} */
    bossDeathBubbleEmitters: [],
    fishTimeMeter: 0,
    /** Mirrors last-frame active state for HUD (glow on meter) */
    fishTimeVisualActive: false,
  };
}

export class FishHellGame {
  /** @returns {number} */
  _playerDamageMultiplier() {
    const b = this.state.activeBuff;
    if (!b) return 1;
    return Number.isFinite(b.damageMul) ? Math.max(1, b.damageMul) : 1;
  }

  /** @returns {boolean} */
  _hasUnlimitedAmmoBuff() {
    return !!this.state.activeBuff?.noReload;
  }

  /**
   * @param {number} scoreValue
   * @param {{ boss?: boolean }} [opts]
   */
  _addFishTimeFromKill(scoreValue, opts) {
    const ft = fishTimeCfg;
    if (!ft?.enabled) return;
    const state = this.state;
    let add = ft.fillBase + scoreValue * (ft.fillPerScorePoint ?? 0);
    if (opts?.boss) add += ft.bossKillBonus ?? 0;
    state.fishTimeMeter = Math.min(ft.meterMax, state.fishTimeMeter + add);
  }

  /**
   * @param {{
   *   canvas: HTMLCanvasElement,
   *   input: {
   *     keys: Record<string, boolean>,
   *     mouse: { x: number, y: number },
   *     pointer: { leftDown: boolean },
   *   },
   *   inputManager: import('../engine/InputManager.js').InputManager,
   *   onHudUpdate: () => void,
   *   onReloadVisible: (visible: boolean) => void,
 *   onGameOver: () => void,
 *   onRunComplete?: (payload: RunCompletePayload) => void,
 *   audio?: import('./AudioManager.js').AudioManager | null,
 * }} opts
 */
  constructor({
    canvas,
    input,
    inputManager,
    onHudUpdate,
    onReloadVisible,
    onGameOver,
    onRunComplete,
    audio = null,
  }) {
    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;
    this.input = input;
    /** @type {import('../engine/InputManager.js').InputManager} */
    this.inputManager = inputManager;
    this.onHudUpdate = onHudUpdate;
    this.onReloadVisible = onReloadVisible;
    this.onGameOver = onGameOver;
    /** @type {((payload: RunCompletePayload) => void) | undefined} */
    this.onRunComplete = onRunComplete;
    /** @type {import('./AudioManager.js').AudioManager | null} */
    this.audio = audio;

    this.started = false;
    this.gameOver = false;
    /** True after final wave cleared; sim frozen, render still shows last frame. */
    this.runVictory = false;
    /**
     * When true, `update` still runs but run time does not advance (e.g. intro fade after char select).
     * Set by `PlayScene` each frame before `update`.
     */
    this.runTimerSuspended = false;
    /** @type {ReturnType<typeof createState>} */
    this.state = createState(canvas, getCharacter(DEFAULT_CHARACTER_ID));
  }

  get width() {
    return this.canvas.width;
  }

  get height() {
    return this.canvas.height;
  }

  /**
   * @param {import('../config/characters.js').CharacterDef} [character]
   */
  beginRun(character = getCharacter(DEFAULT_CHARACTER_ID)) {
    this.started = true;
    this.runVictory = false;
    this.state = createState(this.canvas, character);
    const startWave = gameConfig.devMode
      ? Math.max(1, Math.floor(Number(gameConfig.survivalWaveStart) || 1))
      : 1;
    this.state.wave = startWave;
    this._showWaveBanner(startWave);
    this._beginWaveSpawns();
    this.onHudUpdate();
  }

  /** Sim-time banner; decrements in `update` only (pauses with game). */
  _showWaveBanner(wave, seconds = WAVE_BANNER_SEC) {
    const wb = this.state.waveBanner;
    wb.wave = wave;
    wb.timeLeft = seconds;
  }

  tryShoot() {
    const state = this.state;
    if (state.reloading) {
      const na = getWeapon(state.weaponId).fire.sfxNoAmmo ?? 'no_ammo';
      this.audio?.play(na);
      return;
    }
    this._tryShootOne();
  }

  /**
   * @returns {boolean} true if a bullet was fired
   */
  _tryShootOne() {
    const state = this.state;
    const u = unitScale(this.canvas);
    const unlimitedAmmo = this._hasUnlimitedAmmoBuff();
    if (state.reloading && !unlimitedAmmo) return false;
    if (state.reloading && unlimitedAmmo) {
      state.reloading = false;
      state.reloadTimer = 0;
      this.onReloadVisible(false);
    }
    const w = getWeapon(state.weaponId);
    const f = w.fire;
    const shootSfx = f.sfxShoot ?? 'ak_shot';
    const emptySfx = f.sfxNoAmmo ?? 'no_ammo';
    if (!unlimitedAmmo && state.ammo <= 0) {
      this.audio?.play(emptySfx);
      this.startReload();
      return false;
    }
    if (!unlimitedAmmo) {
      state.ammo--;
      this.onHudUpdate();
    }
    const v = f.bulletSpeed * u;
    const p = state.player;
    const angle = p.aimAngle;
    const along = w.muzzle.along * u;
    const handSign = w.dualWield ? (state.dualWieldHand === 0 ? -1 : 1) : 0;
    const handShift = w.dualWield ? ((w.dualPerp ?? 0) * 0.5) * handSign : 0;
    const localPerp = w.muzzle.perp + handShift;
    const perp = localPerp * u * gunAimPerpSign(angle);
    const { x: gx, y: gy } = muzzleWorld(p.x, p.y, angle, along, perp);
    const mfCfg = w.muzzleFlash;
    let mzx = gx;
    let mzy = gy;
    if (mfCfg && Number.isFinite(mfCfg.perpOffset)) {
      const perpFlash = perp + mfCfg.perpOffset * u * gunAimPerpSign(angle);
      const mw = muzzleWorld(p.x, p.y, angle, along, perpFlash);
      mzx = mw.x;
      mzy = mw.y;
    }
    const n = Math.max(1, Math.floor(f.pelletCount ?? 1));
    const spreadDeg = f.pelletSpreadDeg ?? 0;
    let spreadRad = (spreadDeg * Math.PI) / 180;
    const coneJit = f.pelletSpreadConeJitter ?? 0;
    if (n > 1 && spreadRad > 0 && coneJit > 0) {
      spreadRad *= 1 + (Math.random() * 2 - 1) * coneJit;
    }
    const noiseDeg = f.pelletSpreadNoiseDeg ?? 2.8;
    const noiseRad = (noiseDeg * Math.PI) / 180;
    const baseKb = f.hitKnockback ?? 0;
    const knockEach =
      n <= 1 ? baseKb : baseKb * (f.pelletKnockMul ?? 1 / Math.sqrt(n));
    const hitDamageBase =
      n <= 1 ? (f.bulletDamage ?? 1) : (f.pelletHitDamage ?? 1);
    const hitDamage = hitDamageBase * this._playerDamageMultiplier();
    for (let i = 0; i < n; i++) {
      const a =
        n === 1 || spreadRad <= 0
          ? angle + (Math.random() * 2 - 1) * (noiseRad * 0.35)
          : angle + (Math.random() - 0.5) * spreadRad + (Math.random() * 2 - 1) * noiseRad;
      state.bullets.push({
        x: gx,
        y: gy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: f.bulletLifeTicks,
        hitKnockback: knockEach,
        hitDamage,
      });
    }
    this._spawnMuzzle(mzx, mzy, angle);
    this.audio?.play(shootSfx);
    spawnBubbleBurst(state.playerBubbles, gx, gy, u, 'muzzle');
    const kickBase = f.visualKickU ?? playerCfg.gunRecoilDefaultKickU;
    const kickMul = n > 1 ? 1.06 : 1;
    state.gunRecoilAlongU = Math.min(
      state.gunRecoilAlongU + kickBase * kickMul,
      playerCfg.gunRecoilMaxU,
    );
    if (w.dualWield) state.dualWieldHand = state.dualWieldHand === 0 ? 1 : 0;
    if (!unlimitedAmmo && state.ammo <= 0) this.startReload();
    return true;
  }

  startReload() {
    const state = this.state;
    if (this._hasUnlimitedAmmoBuff()) return;
    if (state.reloading || state.ammo === state.maxAmmo) return;
    state.reloading = true;
    const f = getWeapon(state.weaponId).fire;
    state.reloadTimer = f.reloadTicks;
    this.audio?.play(f.sfxReload ?? 'reload');
    this.onReloadVisible(true);
  }

  /** @param {number} dt */
  update(dt) {
    if (!this.started || this.gameOver || this.runVictory) return;

    const k = dt * SIM_HZ;
    const state = this.state;
    if (!this.runTimerSuspended) state.runElapsedSec += dt;
    if (!state.bossDeathBubbleEmitters) state.bossDeathBubbleEmitters = [];
    const W = this.canvas.width;
    const H = this.canvas.height;
    const u = unitScale(this.canvas);
    const pad = playerCfg.edgePadding * u;
    const margin = 12 * u;
    const hitPlayerExtra = 18 * u;
    const hitBulletExtra = 7 * u;
    const playerHitR = playerCfg.hitRadius * u;
    const p = state.player;
    const godHp = !!(gameConfig.devMode && gameConfig.godMode);
    const keys = this.input.keys;
    const im = this.inputManager;

    const ft = fishTimeCfg;
    const fishTimeActive = !!(
      ft?.enabled &&
      im.isActionDown('bulletTime', keys) &&
      state.fishTimeMeter > 0
    );
    if (fishTimeActive) {
      state.fishTimeMeter = Math.max(0, state.fishTimeMeter - ft.drainPerSecond * dt);
    }
    state.fishTimeVisualActive = fishTimeActive;
    const kE = k * (fishTimeActive ? ft.enemySimMul : 1);
    const kPm = k * (fishTimeActive ? ft.playerMoveMul : 1);
    const kGun = k * (fishTimeActive ? (ft.gunSimMul ?? 1) : 1);
    const wantBgmRate = fishTimeActive && ft.bgmPlaybackRate != null ? ft.bgmPlaybackRate : 1;
    this.audio?.setGameplayBgmPlaybackRate?.(wantBgmRate);

    const wAim = getWeapon(state.weaponId);
    const alongA = wAim.muzzle.along * u;
    const perpA = wAim.muzzle.perp * u;
    p.aimAngle = aimAngleMuzzleToTarget(
      p.x,
      p.y,
      this.input.mouse.x,
      this.input.mouse.y,
      alongA,
      perpA,
      p.aimAngle,
    );

    if (im.isActionDown('moveLeft', keys)) p.facing = -1;
    if (im.isActionDown('moveRight', keys)) p.facing = 1;
    if (!im.isActionDown('moveLeft', keys) && !im.isActionDown('moveRight', keys)) {
      const mx = this.input.mouse.x - p.x;
      if (mx < -3) p.facing = -1;
      else if (mx > 3) p.facing = 1;
    }

    const moving = !!(
      im.isActionDown('moveUp', keys) ||
      im.isActionDown('moveDown', keys) ||
      im.isActionDown('moveLeft', keys) ||
      im.isActionDown('moveRight', keys)
    );
    const bobAmp = playerCfg.idleBobAmplitude * u;

    if (moving) {
      if (im.isActionDown('moveUp', keys)) p.y -= p.speed * kPm;
      if (im.isActionDown('moveDown', keys)) p.y += p.speed * kPm;
      if (im.isActionDown('moveLeft', keys)) p.x -= p.speed * kPm;
      if (im.isActionDown('moveRight', keys)) p.x += p.speed * kPm;
      p.x += playerCfg.gravityX * u * kPm;
      p.y += playerCfg.gravityY * u * kPm;
      state.playerAnchorX = p.x;
      state.playerAnchorY = p.y;
      state.waterBobPhase += playerCfg.waterBobMoveDrift * kPm;
    } else {
      state.playerAnchorX += playerCfg.gravityX * u * kPm;
      state.playerAnchorY += playerCfg.gravityY * u * kPm;
      state.playerAnchorX = Math.max(pad, Math.min(W - pad, state.playerAnchorX));
      state.playerAnchorY = Math.max(
        pad + bobAmp,
        Math.min(H - pad - bobAmp, state.playerAnchorY),
      );
      state.waterBobPhase += playerCfg.waterBobIdleRate * kPm;
      p.x = state.playerAnchorX;
      p.y = state.playerAnchorY + Math.sin(state.waterBobPhase) * bobAmp;
    }

    const fire = getWeapon(state.weaponId).fire;
    state.fireCooldown -= kGun;
    if (state.fireCooldown < 0) state.fireCooldown = 0;
    const shootHeld =
      this.input.pointer.leftDown ||
      this.inputManager.isActionDown('shoot', this.input.keys);
    if (fire.auto && shootHeld) {
      if (state.fireCooldown <= 0) {
        if (this._tryShootOne()) {
          state.fireCooldown = fire.autoCooldownTicks;
        }
      }
    }

    if (state.gunRecoilAlongU > 0.004) {
      state.gunRecoilAlongU *= Math.pow(playerCfg.gunRecoilDecayPerTick, kGun);
    } else {
      state.gunRecoilAlongU = 0;
    }

    p.x = Math.max(pad, Math.min(W - pad, p.x));
    p.y = Math.max(pad, Math.min(H - pad, p.y));
    if (moving) {
      state.playerAnchorX = p.x;
      state.playerAnchorY = p.y;
    } else {
      state.playerAnchorX = p.x;
      state.playerAnchorY = Math.max(
        pad + bobAmp,
        Math.min(H - pad - bobAmp, p.y - Math.sin(state.waterBobPhase) * bobAmp),
      );
    }

    if (moving) {
      state.idleBubbleCooldownTicks = playerIdleBubbleIntervalTicks;
    } else {
      state.idleBubbleCooldownTicks -= k;
      if (state.idleBubbleCooldownTicks <= 0) {
        state.idleBubbleCooldownTicks = playerIdleBubbleIntervalTicks;
        spawnBubbleBurst(state.playerBubbles, p.x, p.y, u, 'idle');
      }
    }

    stepBossDeathBubbleEmitters(state.bossDeathBubbleEmitters, state.playerBubbles, k, u);
    stepWorldBubbles(state.playerBubbles, k);

    if (state.reloading) {
      state.reloadTimer -= kGun;
      if (state.reloadTimer <= 0) {
        state.reloading = false;
        state.ammo = state.maxAmmo;
        this.onReloadVisible(false);
        this.onHudUpdate();
      }
    }

    if (state.invuln > 0) state.invuln -= k;
    if (state.damageFlash > 0) {
      state.damageFlash = Math.max(0, state.damageFlash - k);
    }
    if (state.activeBuff) {
      state.activeBuff.ticksLeft = Math.max(0, state.activeBuff.ticksLeft - k);
      if (state.activeBuff.ticksLeft <= 0) {
        state.activeBuff = null;
        this.onHudUpdate();
      }
    }

    state.bullets = state.bullets.filter((b) => {
      b.x += b.vx * k;
      b.y += b.vy * k;
      b.life -= k;
      return (
        b.life > 0 && b.x > -margin && b.x < W + margin && b.y > -margin && b.y < H + margin
      );
    });

    updateBoss(this, kE);

    state.enemyBullets = state.enemyBullets.filter((eb) => {
      eb.x += eb.vx * kE;
      eb.y += eb.vy * kE;
      eb.life -= kE;
      if (eb.life <= 0) return false;
      if (state.invuln <= 0) {
        const rdx = eb.x - p.x;
        const rdy = eb.y - p.y;
        if (Math.hypot(rdx, rdy) < eb.r + playerHitR) {
          if (!godHp) {
            p.hp -= eb.damage;
          }
          this.audio?.play('meathit');
          state.invuln = 40;
          state.damageFlash = playerCfg.damageFlashTicks;
          state.screenShakeTicks = playerCfg.hitScreenShakeTicks;
          this.onHudUpdate();
          if (!godHp && p.hp <= 0) {
            this._triggerGameOver();
            return false;
          }
          return false;
        }
      }
      return eb.x > -margin && eb.x < W + margin && eb.y > -margin && eb.y < H + margin;
    });

    const drag = Math.pow(0.9, k);
    state.particles = state.particles.filter((pt) => {
      pt.x += pt.vx * k;
      pt.y += pt.vy * k;
      pt.life -= k;
      pt.vx *= drag;
      pt.vy *= drag;
      return pt.life > 0;
    });

    state.muzzleFlashes = state.muzzleFlashes.filter((mf) => {
      mf.life -= k;
      return mf.life > 0;
    });

    const bossFxMaxT = BOSS_DEATH_EXPLOSION.frames * BOSS_DEATH_EXPLOSION.ticksPerFrame;
    state.bossDeathFx = state.bossDeathFx.filter((fx) => {
      fx.t += k;
      return fx.t < bossFxMaxT;
    });

    for (let i = state.pendingObstacles.length - 1; i >= 0; i--) {
      const po = state.pendingObstacles[i];
      po.warnElapsed += kE;
      if (po.warnElapsed >= po.warnDurationTicks) {
        const f = po.def.flavor;
        if (f === 'cross') this._spawnObstacleCrossActive(po, u);
        else if (f === 'drop_hold') this._spawnObstacleDropHoldActive(po, u, H, pad);
        state.pendingObstacles.splice(i, 1);
      }
    }

    const knockDecay = Math.pow(0.86, kE);
    for (const e of state.enemies) {
      if (e.hitFlashTicks > 0) {
        e.hitFlashTicks = Math.max(0, e.hitFlashTicks - kE);
      }
      e.x += e.knockVx * kE;
      e.y += e.knockVy * kE;
      e.knockVx *= knockDecay;
      e.knockVy *= knockDecay;

      if (e.behavior === 'turret') {
        this._updateTurretEnemy(e, kE, p, state, u);
      } else if (e.behavior === 'obstacle' && e.obstacleFlavor === 'cross') {
        e.x += e.obstacleVx * kE;
      } else if (e.behavior === 'obstacle' && e.obstacleFlavor === 'drop_hold') {
        const vyDrop = e.hookVyDrop ?? 0;
        const vyRet = e.hookVyRetract ?? 0;
        const fromBottom = !!e.dropHoldFromBottom;
        if (e.hookPhase === 'drop') {
          if (fromBottom) {
            e.y -= vyDrop * kE;
            if (e.y <= e.hookStopY) {
              e.y = e.hookStopY;
              e.hookPhase = 'hold';
            }
          } else {
            e.y += vyDrop * kE;
            if (e.y >= e.hookStopY) {
              e.y = e.hookStopY;
              e.hookPhase = 'hold';
            }
          }
        } else if (e.hookPhase === 'hold') {
          e.hookHoldTicks -= kE;
          if (e.hookHoldTicks <= 0) e.hookPhase = 'retract';
        } else if (fromBottom) {
          e.y += vyRet * kE;
        } else {
          e.y -= vyRet * kE;
        }
      } else if (e.behavior === 'item_carrier') {
        e.icElapsedTicks += kE;
        const dur = e.icDurationTicks;
        const tt = Math.min(1, e.icElapsedTicks / dur);
        e.x = e.icStartX + (e.icEndX - e.icStartX) * tt;
        e.y =
          e.icBaseY +
          Math.sin(e.icBobPhase + e.icElapsedTicks * e.icBobRate) * e.icBobAmp * u;
      } else {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          e.x += (dx / dist) * e.spd * kE;
          e.y += (dy / dist) * e.spd * kE;
        }
      }

      const contactDmg = e.contactDamage ?? 10;
      if (
        e.behavior !== 'item_carrier' &&
        obstaclePlayerHit(e, p.x, p.y, hitPlayerExtra, playerHitR) &&
        state.invuln <= 0
      ) {
        if (!godHp) {
          p.hp -= contactDmg;
        }
        this.audio?.play('meathit');
        state.invuln = 40;
        state.damageFlash = playerCfg.damageFlashTicks;
        state.screenShakeTicks = playerCfg.hitScreenShakeTicks;
        this.onHudUpdate();
        if (!godHp && p.hp <= 0) {
          this._triggerGameOver();
          return;
        }
      }
    }

    const bossRef = state.boss;
    if (
      bossRef &&
      bossRef.hp > 0 &&
      Math.hypot(p.x - bossRef.x, p.y - bossRef.y) < bossRef.hitR + hitPlayerExtra &&
      state.invuln <= 0
    ) {
      if (!godHp) {
        p.hp -= bossRef.contactDamage ?? 12;
      }
      this.audio?.play('meathit');
      state.invuln = 40;
      state.damageFlash = playerCfg.damageFlashTicks;
      state.screenShakeTicks = playerCfg.hitScreenShakeTicks;
      this.onHudUpdate();
      if (!godHp && p.hp <= 0) {
        this._triggerGameOver();
        return;
      }
    }

    for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
      const b = state.bullets[bi];
      for (const e of state.enemies) {
        if (e.hp <= 0) continue;
        if (!obstacleBulletHit(e, b.x, b.y, hitBulletExtra)) continue;
        if (e.obstacleInvulnerable) {
          state.bullets.splice(bi, 1);
          break;
        }
        e.hp -= b.hitDamage ?? 1;
        e.hitFlashTicks = enemyCfg.hitFlashTicks;
        const kb = b.hitKnockback ?? 0;
        if (kb > 0 && e.behavior !== 'item_carrier') {
          const bv2 = b.vx * b.vx + b.vy * b.vy;
          if (bv2 > 1e-6) {
            const inv = 1 / Math.sqrt(bv2);
            const kbMul = e.knockbackMul ?? 1;
            const imp = kb * u * kbMul;
            e.knockVx += b.vx * inv * imp;
            e.knockVy += b.vy * inv * imp;
          }
        }
        this.audio?.play('enemy_hit');
        this._spawnHit(b.x, b.y);
        state.bullets.splice(bi, 1);
        if (e.hp <= 0) {
          if (e.behavior === 'item_carrier') {
            this._spawnWorldPickupFromCarrier(e, u);
          } else {
            state.score += e.score;
            this._addFishTimeFromKill(e.score);
          }
          state.enemiesLeft--;
          this._spawnHit(e.x, e.y);
          this.onHudUpdate();
        }
        break;
      }
    }

    const bossLive = state.boss;
    if (bossLive && bossLive.hp > 0) {
      for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
        const b = state.bullets[bi];
        if (Math.hypot(b.x - bossLive.x, b.y - bossLive.y) >= bossLive.hitR + hitBulletExtra) {
          continue;
        }
        bossLive.hp -= b.hitDamage ?? 1;
        bossLive.hitFlashTicks = enemyCfg.hitFlashTicks;
        this.audio?.play('enemy_hit');
        this._spawnHit(b.x, b.y);
        state.bullets.splice(bi, 1);
        if (bossLive.hp <= 0) {
          const bx = bossLive.x;
          const by = bossLive.y;
          state.score += bossLive.score;
          this._addFishTimeFromKill(bossLive.score, { boss: true });
          state.enemiesLeft = Math.max(0, state.enemiesLeft - 1);
          state.boss = null;
          state.bossDeathFx.push({ x: bx, y: by, t: 0 });
          const bubbleR = BOSS_DEATH_EXPLOSION.drawH * u * bossDeathBubbleEmitter.radiusMulOfExplosionDrawH;
          pushBossDeathBubbleEmitter(state.bossDeathBubbleEmitters, bx, by, bubbleR);
          this.audio?.play('explosion');
          this._spawnHit(bx, by);
          this.onHudUpdate();
        }
        break;
      }
    }

    state.enemies = state.enemies.filter((e) => {
      if (e.behavior === 'obstacle' && e.obstacleFlavor === 'cross') {
        const exitX = W + e.size * 2 + 72 * u;
        if (e.x > exitX) {
          state.enemiesLeft = Math.max(0, state.enemiesLeft - 1);
          return false;
        }
      }
      if (e.behavior === 'obstacle' && e.obstacleFlavor === 'drop_hold' && e.hookPhase === 'retract') {
        if (e.dropHoldFromBottom) {
          const exitDown = H + e.size * 4 + 80 * u;
          if (e.y > exitDown) {
            state.enemiesLeft = Math.max(0, state.enemiesLeft - 1);
            return false;
          }
        } else {
          const exitUp = -e.size * 4 - 80 * u;
          if (e.y < exitUp) {
            state.enemiesLeft = Math.max(0, state.enemiesLeft - 1);
            return false;
          }
        }
      }
      if (e.behavior === 'item_carrier' && e.hp > 0) {
        const tt = e.icElapsedTicks / e.icDurationTicks;
        if (tt >= 1) {
          state.enemiesLeft = Math.max(0, state.enemiesLeft - 1);
          return false;
        }
      }
      return e.hp > 0;
    });

    const pm = 72 * u;
    for (let i = state.worldPickups.length - 1; i >= 0; i--) {
      const pk = state.worldPickups[i];
      const idef = getItemDef(pk.itemId);
      if (!idef) {
        state.worldPickups.splice(i, 1);
        continue;
      }
      if (pk.phase === 'hold') {
        pk.holdTicks -= k;
        if (pk.holdTicks <= 0) pk.phase = 'drift';
      } else {
        pk.x += pk.vx * k;
        pk.bobTick += k;
        pk.y =
          pk.icBaseY +
          Math.sin(pk.icBobPhase + pk.bobTick * pk.icBobRate) * pk.icBobAmpU;
      }
      const pr = idef.pickRadius * u;
      if (Math.hypot(pk.x - p.x, pk.y - p.y) < pr + playerHitR) {
        if (idef.grantsWeaponId && WEAPONS[idef.grantsWeaponId]) {
          const wid = idef.grantsWeaponId;
          const wf = getWeapon(wid).fire;
          if (state.weaponId === wid) {
            if (state.ammo < state.maxAmmo) {
              state.ammo = state.maxAmmo;
              state.reloading = false;
              state.reloadTimer = 0;
              this.onReloadVisible(false);
            }
          } else {
            state.weaponId = wid;
            state.maxAmmo = wf.maxAmmo;
            state.ammo = wf.maxAmmo;
            state.dualWieldHand = 0;
            state.reloading = false;
            state.reloadTimer = 0;
            this.onReloadVisible(false);
          }
        }
        if (idef.healAmount != null) {
          const cap = statToHp(getCharacter(state.characterId).hpStat);
          p.hp = Math.min(cap, p.hp + idef.healAmount);
        }
        if (idef.buffId) {
          const dur = Math.max(1, Math.floor(idef.buffDurationTicks ?? SIM_HZ * 30));
          state.activeBuff = {
            id: idef.buffId,
            emoji: idef.emoji,
            label: idef.glossary?.label ?? idef.id,
            damageMul: idef.damageMul,
            noReload: !!idef.noReload,
            projectileColor: idef.projectileColor,
            ticksLeft: dur,
            maxTicks: dur,
          };
          if (idef.noReload) {
            state.reloading = false;
            state.reloadTimer = 0;
            state.ammo = state.maxAmmo;
            this.onReloadVisible(false);
          }
        }
        if (idef.collectScore) state.score += idef.collectScore;
        if (idef.sfxId) this.audio?.play(idef.sfxId);
        state.worldPickups.splice(i, 1);
        this.onHudUpdate();
        continue;
      }
      if ((pk.vx > 0 && pk.x > W + pm) || (pk.vx < 0 && pk.x < -pm)) {
        state.worldPickups.splice(i, 1);
      }
    }

    this._updateWaveSpawns(dt);
    this._updateWaveProgress(dt);

    const wb = state.waveBanner;
    if (wb.timeLeft > 0) {
      wb.timeLeft -= dt;
      if (wb.timeLeft < 0) wb.timeLeft = 0;
      if (wb.timeLeft <= 0) wb.wave = null;
    }

    this._stepScreenShake(state, u, k);
  }

  /**
   * @param {ReturnType<typeof createState>} state
   * @param {number} u
   * @param {number} k
   */
  _stepScreenShake(state, u, k) {
    const T = playerCfg.hitScreenShakeTicks;
    if (state.screenShakeTicks > 0) {
      const intensity = state.screenShakeTicks / T;
      const mag = intensity * playerCfg.hitScreenShakeMax * u;
      state.screenShakeX = (Math.random() * 2 - 1) * mag;
      state.screenShakeY = (Math.random() * 2 - 1) * mag;
      state.screenShakeTicks = Math.max(0, state.screenShakeTicks - k);
    } else {
      state.screenShakeX = 0;
      state.screenShakeY = 0;
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    if (!this.started || this.gameOver) return;
    const btKey = this.inputManager.bindings.bulletTime ?? ' ';
    renderWorld(ctx, this.state, {
      bulletTimeKeyDisplay: formatKeyDisplay(btKey),
    });
  }

  /** Starts wave spawns. There is no separate global cap on simultaneous `state.enemies.length` — only per-wave turret/obstacle caps in config + this `count`. */
  _beginWaveSpawns() {
    const state = this.state;
    const w = state.wave;
    /** Extra spawn/kill budget at high waves so more turret/obstacle rolls don’t crowd out chasers. */
    const highWaveExtra = w >= 10 ? Math.floor((w - 10) * 0.85) : 0;
    const count = 4 + w * 2 + highWaveExtra;
    state.enemiesLeft = count;
    state.waveSpawnRemaining = count;
    state.waveSpawnCooldown = WAVE_SPAWN_INTERVAL;
    state.turretsSpawnedThisWave = 0;
    state.obstaclesSpawnedThisWave = 0;
    state.pendingObstacles = [];
    state.itemCarriersSlotsThisWave = rollItemCarrierSlots();
    state.itemCarriersSpawnedThisWave = 0;
    if (!gameConfig.oopsAllClams && !effectiveOopsAllObstacles()) {
      spawnBossForWaveIfNeeded(this);
    }
  }

  /**
   * God Nephropidae enrage: up to `perPulse` shrimp from west/east flanks (`dir` −1 = left, +1 = right).
   * @param {{ x: number, y: number, hitR: number, def: import('../config/bosses.js').BossDef }} boss
   * @param {-1 | 1} dir
   */
  _spawnOneGodEnrageShrimpFromFlank(boss, dir) {
    const state = this.state;
    const u = unitScale(this.canvas);
    const es = boss.def.enrageShrimp;
    const burstU = es?.burstImpulseU ?? 5;
    const t = ENEMY_TYPES[0];
    const padR = boss.hitR + t.size * u * 0.82;
    const yJ = (dir < 0 ? -5 : 5) * u;
    const x = boss.x + dir * padR;
    const y = boss.y + yJ;
    const burst = burstU * u;
    state.enemies.push({
      x,
      y,
      behavior: 'chaser',
      hp: t.hp,
      maxHp: t.hp,
      spd: t.spd * u * (1 + state.wave * 0.04) * 1.05,
      size: t.size * u,
      emoji: t.emoji ?? '',
      spriteKey: t.spriteKey,
      spriteFront: t.spriteFront,
      facingMode: t.facingMode ?? 'rotate',
      visualScale: t.visualScale ?? 1,
      score: t.score,
      knockbackMul: 1,
      knockVx: dir * burst,
      knockVy: 0,
      contactDamage: 9,
    });
    state.enemiesLeft += 1;
  }

  /**
   * Third vent: below the boss, kicked downward.
   * @param {{ x: number, y: number, hitR: number, def: import('../config/bosses.js').BossDef }} boss
   */
  _spawnOneGodEnrageShrimpFromSouth(boss) {
    const state = this.state;
    const u = unitScale(this.canvas);
    const es = boss.def.enrageShrimp;
    const burstU = es?.burstImpulseU ?? 5;
    const t = ENEMY_TYPES[0];
    const padR = boss.hitR + t.size * u * 0.82;
    const x = boss.x + (Math.random() * 2 - 1) * 6 * u;
    const y = boss.y + padR;
    const burst = burstU * u;
    state.enemies.push({
      x,
      y,
      behavior: 'chaser',
      hp: t.hp,
      maxHp: t.hp,
      spd: t.spd * u * (1 + state.wave * 0.04) * 1.05,
      size: t.size * u,
      emoji: t.emoji ?? '',
      spriteKey: t.spriteKey,
      spriteFront: t.spriteFront,
      facingMode: t.facingMode ?? 'rotate',
      visualScale: t.visualScale ?? 1,
      score: t.score,
      knockbackMul: 1,
      knockVx: 0,
      knockVy: burst,
      contactDamage: 9,
    });
    state.enemiesLeft += 1;
  }

  /**
   * One enrage pulse: up to `perPulse` shrimp (left, right, south), respecting `room`.
   * @returns {number} how many were spawned
   */
  _spawnGodEnrageShrimpPulseFromBoss(boss, room) {
    const es = boss.def.enrageShrimp;
    const per = Math.min(Math.max(1, es?.perPulse ?? 3), 8);
    const want = Math.min(per, Math.max(0, Math.floor(room)));
    if (want <= 0) return 0;
    if (want === 1) {
      const r = boss.enrageShrimpSpawned % 3;
      if (r === 0) this._spawnOneGodEnrageShrimpFromFlank(boss, -1);
      else if (r === 1) this._spawnOneGodEnrageShrimpFromFlank(boss, 1);
      else this._spawnOneGodEnrageShrimpFromSouth(boss);
      return 1;
    }
    if (want === 2) {
      this._spawnOneGodEnrageShrimpFromFlank(boss, -1);
      this._spawnOneGodEnrageShrimpFromFlank(boss, 1);
      return 2;
    }
    this._spawnOneGodEnrageShrimpFromFlank(boss, -1);
    this._spawnOneGodEnrageShrimpFromFlank(boss, 1);
    this._spawnOneGodEnrageShrimpFromSouth(boss);
    return 3;
  }

  _spawnEnemy() {
    const state = this.state;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const u = unitScale(this.canvas);
    if (gameConfig.oopsAllClams) {
      this._spawnItemCarrierAt(CLAM_CARRIER, W, H, u);
      return;
    }
    if (effectiveOopsAllObstacles()) {
      this._pushRandomObstaclePending(W, H, u);
      return;
    }
    const m = 36 * u;
    const side = Math.floor(Math.random() * 4);
    let x;
    let y;
    if (side === 0) {
      x = Math.random() * W;
      y = -m;
    } else if (side === 1) {
      x = W + m;
      y = Math.random() * H;
    } else if (side === 2) {
      x = Math.random() * W;
      y = H + m;
    } else {
      x = -m;
      y = Math.random() * H;
    }
    if (rollTurretSpawn(state.wave)) {
      const def = TURRET_ENEMY_TYPES[Math.floor(Math.random() * TURRET_ENEMY_TYPES.length)];
      const slot = state.turretsSpawnedThisWave;
      state.turretsSpawnedThisWave++;
      this._spawnTurretAt(def, x, y, u, slot);
      return;
    }

    if (rollObstacleSpawn(state.wave)) {
      const def = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
      const edgePad = playerCfg.edgePadding * u * 1.25;
      state.obstaclesSpawnedThisWave++;
      if (def.flavor === 'cross') {
        const y = edgePad + Math.random() * Math.max(48 * u, H - edgePad * 2);
        state.pendingObstacles.push({
          warnElapsed: 0,
          warnDurationTicks: def.warnDurationTicks,
          warnOpacityCycles: def.warnOpacityCycles,
          warnX: 26 * u,
          y,
          def,
        });
      } else {
        const margin = 48 * u;
        const laneX = margin + Math.random() * Math.max(24 * u, W - margin * 2);
        const dh = /** @type {import('../config/obstacleEnemies.js').ObstacleDropHoldDef} */ (def);
        const fromBottom = !!dh.dropHoldFromBottom;
        const warnY = fromBottom ? H - 22 * u : 20 * u;
        state.pendingObstacles.push({
          warnElapsed: 0,
          warnDurationTicks: def.warnDurationTicks,
          warnOpacityCycles: def.warnOpacityCycles,
          warnX: laneX,
          laneX,
          warnY,
          y: warnY,
          def,
        });
      }
      return;
    }

    if (
      state.itemCarriersSpawnedThisWave < state.itemCarriersSlotsThisWave &&
      rollItemCarrierOnSpawn()
    ) {
      const idef = Math.random() < 0.5 ? CLAM_CARRIER : FAKE_FISH_CARRIER;
      this._spawnItemCarrierAt(idef, W, H, u);
      state.itemCarriersSpawnedThisWave++;
      return;
    }

    const typePool =
      state.wave <= 2
        ? [0, 0, 0, 1]
        : state.wave <= 4
          ? [0, 1, 1, 2, 3]
          : state.wave <= 8
            ? [0, 1, 1, 2, 2, 3, 3, 4]
            : [0, 1, 2, 2, 3, 3, 4, 4];
    const t = ENEMY_TYPES[typePool[Math.floor(Math.random() * typePool.length)]];
    state.enemies.push({
      x,
      y,
      behavior: 'chaser',
      hp: t.hp,
      maxHp: t.hp,
      spd: t.spd * u * (1 + state.wave * 0.04),
      size: t.size * u,
      emoji: t.emoji ?? '',
      spriteKey: t.spriteKey,
      spriteFront: t.spriteFront,
      facingMode: t.facingMode ?? 'rotate',
      visualScale: t.visualScale ?? 1,
      score: t.score,
      knockbackMul: 1,
      knockVx: 0,
      knockVy: 0,
    });
  }

  /**
   * @param {import('../config/itemEnemies.js').ItemEnemyDef} def
   * @param {number} W
   * @param {number} H
   * @param {number} u
   */
  _spawnItemCarrierAt(def, W, H, u) {
    const state = this.state;
    const pad = playerCfg.edgePadding * u;
    const fromLeft = Math.random() < 0.5;
    const margin = Math.max(def.size * u * 2.2, 52 * u);
    const baseY = pad + Math.random() * Math.max(28 * u, H - pad * 2);
    const startX = fromLeft ? -margin : W + margin;
    const endX = fromLeft ? W + margin : -margin;
    const dur = def.travelSeconds * SIM_HZ;
    const bobPhase = Math.random() * Math.PI * 2;
    state.enemies.push({
      x: startX,
      y: baseY + Math.sin(bobPhase) * def.bobAmp * u,
      behavior: 'item_carrier',
      itemDropId: def.dropItemId,
      itemCarrierDropConsumableIds: def.dropConsumableIds,
      itemCarrierDropWeaponItemIds: def.dropWeaponItemIds,
      itemCarrierDropWeaponChance: def.dropWeaponChance,
      icStartX: startX,
      icEndX: endX,
      icDurationTicks: dur,
      icElapsedTicks: 0,
      icBaseY: baseY,
      icBobPhase: bobPhase,
      icBobRate: def.bobRate,
      icBobAmp: def.bobAmp,
      hp: def.hp,
      maxHp: def.hp,
      spd: 0,
      size: def.size * u,
      emoji: '',
      spriteKey: def.spriteKey,
      spriteFront: def.spriteFront,
      facingMode: def.facingMode ?? 'mirror',
      visualScale: def.visualScale ?? 1,
      score: def.score,
      knockbackMul: 0,
      knockVx: 0,
      knockVy: 0,
      contactDamage: 0,
    });
  }

  /**
   * @param {object} e
   * @param {number} u
   */
  _spawnWorldPickupFromCarrier(e, u) {
    const state = this.state;
    const dur = e.icDurationTicks;
    const vx = dur > 0 ? (e.icEndX - e.icStartX) / dur : 0;
    const itemId = rollCarrierDropItemId({
      dropItemId: e.itemDropId,
      dropConsumableIds: e.itemCarrierDropConsumableIds,
      dropWeaponItemIds: e.itemCarrierDropWeaponItemIds,
      dropWeaponChance: e.itemCarrierDropWeaponChance,
    });
    state.worldPickups.push({
      itemId,
      x: e.x,
      y: e.y,
      phase: 'hold',
      holdTicks: itemPickupHoldTicks(),
      vx,
      icBaseY: e.icBaseY,
      icBobPhase: e.icBobPhase,
      icBobRate: e.icBobRate,
      icBobAmpU: e.icBobAmp * u,
      bobTick: e.icElapsedTicks,
    });
  }

  /**
   * @param {import('../config/turretEnemies.js').TurretEnemyTypeDef} def
   * @param {number} x
   * @param {number} y
   * @param {number} u
   * @param {number} idleSlot index this wave — staggers bob phase / rate vs other turrets
   */
  _spawnTurretAt(def, x, y, u, idleSlot = 0) {
    const state = this.state;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const hold = resolveTurretHoldPosition(W, H, def.holdAnchor, def.holdFrac);
    state.enemies.push({
      x,
      y,
      behavior: 'turret',
      hp: def.hp,
      maxHp: def.hp,
      spd: def.approachSpd * u * (1 + state.wave * 0.03),
      size: def.size * u,
      emoji: def.emoji ?? '',
      spriteKey: def.spriteKey,
      spriteFront: def.spriteFront,
      facingMode: def.facingMode ?? 'mirror',
      visualScale: def.visualScale ?? 1,
      score: def.score,
      knockbackMul: def.knockbackMul ?? 1,
      knockVx: 0,
      knockVy: 0,
      holdX: hold.x,
      holdY: hold.y,
      turretPhase: /** @type {'approach' | 'hold'} */ ('approach'),
      attackCfg: def.attack,
      turretCycleT: 0,
      /** @type {Set<number>} */
      turretBurstFired: new Set(),
      turretAttackPrimed: false,
      turretIntroDelay: 0,
      turretIdlePhase:
        idleSlot * 2.399963229728653 +
        Math.random() * 0.85 +
        (idleSlot % 2) * 0.4,
      turretIdleAmp: (def.idleBobAmp ?? 3) * (0.88 + Math.random() * 0.24),
      turretIdleRate: (def.idleBobRate ?? 0.1) * (0.9 + Math.random() * 0.22),
      turretBobY: 0,
    });
  }

  /**
   * @param {object} e
   * @param {number} k
   * @param {{ x: number, y: number }} p
   * @param {ReturnType<typeof createState>} state
   * @param {number} u
   */
  _updateTurretEnemy(e, k, p, state, u) {
    e.turretIdlePhase = (e.turretIdlePhase ?? 0) + (e.turretIdleRate ?? 0.1) * k;
    e.turretBobY = Math.sin(e.turretIdlePhase) * (e.turretIdleAmp ?? 3) * u;

    const snap = 4 * u;
    if (e.turretPhase === 'approach') {
      const dhx = e.holdX - e.x;
      const dhy = e.holdY - e.y;
      const dlen = Math.hypot(dhx, dhy);
      if (dlen <= snap) {
        e.x = e.holdX;
        e.y = e.holdY;
        e.turretPhase = 'hold';
        const intro = e.attackCfg.firstDelayTicks ?? 0;
        e.turretIntroDelay = intro;
        e.turretAttackPrimed = intro <= 0;
        e.turretCycleT = 0;
        e.turretBurstFired.clear();
      } else {
        e.x += (dhx / dlen) * e.spd * k;
        e.y += (dhy / dlen) * e.spd * k;
      }
      return;
    }

    {
      const rx = e.holdX - e.x;
      const ry = e.holdY - e.y;
      const rlen = Math.hypot(rx, ry);
      const rsnap = 2 * u;
      if (rlen > rsnap) {
        const step = e.spd * k;
        const mv = Math.min(step, rlen);
        e.x += (rx / rlen) * mv;
        e.y += (ry / rlen) * mv;
      } else if (rlen > 0.25 * u) {
        e.x = e.holdX;
        e.y = e.holdY;
      }
    }

    const ac = e.attackCfg;
    const c = ac.cycleTicks;
    if (!e.turretAttackPrimed) {
      e.turretIntroDelay -= k;
      if (e.turretIntroDelay <= 0) {
        e.turretAttackPrimed = true;
        e.turretCycleT = 0;
        e.turretBurstFired.clear();
      }
      return;
    }

    e.turretCycleT += k;
    while (e.turretCycleT >= c) {
      e.turretCycleT -= c;
      e.turretBurstFired.clear();
      ac.bursts.forEach((burst, bi) => {
        if (burst.atTick === 0) {
          this._fireTurretBurst(e, burst, p, state, u);
          e.turretBurstFired.add(bi);
        }
      });
    }
    ac.bursts.forEach((burst, bi) => {
      if (!e.turretBurstFired.has(bi) && e.turretCycleT >= burst.atTick) {
        this._fireTurretBurst(e, burst, p, state, u);
        e.turretBurstFired.add(bi);
      }
    });
  }

  /**
   * @param {{ warnElapsed: number, warnDurationTicks: number, warnOpacityCycles: number, warnX: number, y: number, def: import('../config/obstacleEnemies.js').ObstacleEnemyDef }} po
   * @param {number} u
   */
  /**
   * @param {number} W
   * @param {number} H
   * @param {number} u
   */
  _pushRandomObstaclePending(W, H, u) {
    const state = this.state;
    const def = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
    const edgePad = playerCfg.edgePadding * u * 1.25;
    if (def.flavor === 'cross') {
      const y = edgePad + Math.random() * Math.max(48 * u, H - edgePad * 2);
      state.pendingObstacles.push({
        warnElapsed: 0,
        warnDurationTicks: def.warnDurationTicks,
        warnOpacityCycles: def.warnOpacityCycles,
        warnX: 26 * u,
        y,
        def,
      });
      return;
    }
    const margin = 48 * u;
    const laneX = margin + Math.random() * Math.max(24 * u, W - margin * 2);
    const dh = /** @type {import('../config/obstacleEnemies.js').ObstacleDropHoldDef} */ (def);
    const fromBottom = !!dh.dropHoldFromBottom;
    const warnY = fromBottom ? H - 22 * u : 20 * u;
    state.pendingObstacles.push({
      warnElapsed: 0,
      warnDurationTicks: def.warnDurationTicks,
      warnOpacityCycles: def.warnOpacityCycles,
      warnX: laneX,
      laneX,
      warnY,
      y: warnY,
      def,
    });
  }

  _spawnObstacleCrossActive(po, u) {
    const state = this.state;
    const d = po.def;
    const off = d.size * u * 2.4;
    state.enemies.push({
      x: -off,
      y: po.y,
      behavior: 'obstacle',
      obstacleFlavor: 'cross',
      obstacleVx: d.crossSpeed * u * (1 + state.wave * 0.025),
      hp: 1,
      maxHp: 1,
      size: d.size * u,
      emoji: '',
      spriteKey: d.spriteKey,
      spriteFront: d.spriteFront,
      fixedTravelMirror: d.fixedTravelMirror,
      visualScale: d.visualScale ?? 1,
      score: d.score,
      knockbackMul: 0,
      knockVx: 0,
      knockVy: 0,
      contactDamage: d.contactDamage,
      obstacleInvulnerable: !!d.obstacleInvulnerable,
    });
  }

  /**
   * @param {{ warnX: number, laneX?: number, def: import('../config/obstacleEnemies.js').ObstacleEnemyDef }} po
   * @param {number} u
   * @param {number} H
   * @param {number} pad
   */
  _spawnObstacleDropHoldActive(po, u, H, pad) {
    const state = this.state;
    const d = /** @type {import('../config/obstacleEnemies.js').ObstacleDropHoldDef} */ (po.def);
    const laneX = po.laneX ?? po.warnX;
    const fromBottom = !!d.dropHoldFromBottom;
    let stopY;
    let startY;
    if (fromBottom) {
      if (d.dropHoldAnchorBottom) {
        /**
         * `e.y` = sprite bottom (see `render.js` bottom-anchored draw). Rise = startY → stopY (Y decreases).
         * stopY ∈ [yMostRisen, yMaxStopY]: random hold height between full rise and a minimum that satisfies
         * both (1) min fraction of anchor travel and (2) min fraction of drawn sprite height on-screen.
         */
        const clipU = d.coralBottomClipU ?? 4;
        const minTravelFrac = Math.min(1, Math.max(0, d.coralRiseMinTravelFrac ?? 0.5));
        const visFrac = Math.min(1, Math.max(0.05, d.coralMinVisibleSpriteFrac ?? 0.5));
        const visScale = d.visualScale ?? 1;
        const drawH = d.size * u * 1.4 * visScale;
        startY = H + d.size * u * 2.45;
        const yMostRisen = H + clipU * u;
        const maxRise = startY - yMostRisen;
        const yCapTravel = startY - minTravelFrac * maxRise;
        const yCapVis = H + (1 - visFrac) * drawH;
        let yMaxStopY = Math.min(yCapTravel, yCapVis);
        if (yMaxStopY < yMostRisen) yMaxStopY = yMostRisen;
        const span = yMaxStopY - yMostRisen;
        stopY = span > 2 * u ? yMostRisen + Math.random() * span : yMostRisen;
      } else {
        const minStop = H * 0.5 + pad * 1.05;
        const maxStop = H * 0.9 - pad;
        const span = Math.max(36 * u, maxStop - minStop);
        stopY = minStop + Math.random() * span;
        startY = H + d.size * u * 2.4;
      }
    } else {
      const minStop = H * 0.2 + pad;
      const maxStop = H * 0.72 - pad;
      const span = Math.max(36 * u, maxStop - minStop);
      stopY = minStop + Math.random() * span;
      startY = -d.size * u * 2.4;
    }
    state.enemies.push({
      x: laneX,
      y: startY,
      behavior: 'obstacle',
      obstacleFlavor: 'drop_hold',
      hookPhase: /** @type {'drop' | 'hold' | 'retract'} */ ('drop'),
      hookStopY: stopY,
      hookHoldTicks: d.holdTicks,
      hookVyDrop: d.dropSpeed * u * (1 + state.wave * 0.02),
      hookVyRetract: d.retractSpeed * u * (1 + state.wave * 0.02),
      dropHoldFromBottom: fromBottom,
      dropHoldAnchorBottom: !!d.dropHoldAnchorBottom,
      hp: 1,
      maxHp: 1,
      size: d.size * u,
      obstacleHitHalfW: d.hitHalfW * u,
      obstacleHitHalfH: d.hitHalfH * u,
      emoji: '',
      spriteKey: d.spriteKey,
      spriteFront: d.spriteFront,
      visualScale: d.visualScale ?? 1,
      score: d.score,
      knockbackMul: 0,
      knockVx: 0,
      knockVy: 0,
      contactDamage: d.contactDamage,
      obstacleInvulnerable: !!d.obstacleInvulnerable,
    });
  }

  /**
   * @param {object} e
   * @param {import('../config/turretEnemies.js').TurretAttackBurst} burst
   * @param {{ x: number, y: number }} p
   * @param {ReturnType<typeof createState>} state
   * @param {number} u
   */
  _fireTurretBurst(e, burst, p, state, u) {
    const ac = e.attackCfg;
    const base =
      burst.aimMode === 'radial' ? 0 : Math.atan2(p.y - e.y, p.x - e.x);
    const v0 = ac.projectileSpeed * u;
    for (const deg of burst.spreadDeg) {
      const a =
        burst.aimMode === 'radial'
          ? (deg * Math.PI) / 180
          : base + (deg * Math.PI) / 180;
      const vx = Math.cos(a) * v0;
      const vy = Math.sin(a) * v0;
      state.enemyBullets.push({
        x: e.x,
        y: e.y + (e.turretBobY ?? 0),
        vx,
        vy,
        life: ac.projectileLifeTicks,
        damage: ac.projectileDamage,
        r: ac.projectileSize * u,
      });
    }
  }

  _spawnMuzzle(x, y, angle) {
    const state = this.state;
    const w = getWeapon(state.weaponId);
    const mf = w.muzzleFlash;
    if (!mf) return;
    state.muzzleFlashes.push({
      x,
      y,
      angle,
      weaponId: state.weaponId,
      frame: Math.floor(Math.random() * mf.frames),
      life: mf.lifeTicks,
      maxLife: mf.lifeTicks,
    });
    // Shoot sparks: particle path kept for hits (`_spawnHit`); disabled here on purpose.
  }

  _spawnHit(x, y) {
    const state = this.state;
    const u = unitScale(this.canvas);
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (1.2 + Math.random() * 3.5) * u;
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 14 + Math.random() * 10,
        color: '#ff4444',
        size: (2.5 + Math.random() * 3.5) * u,
      });
    }
  }

  /** @param {number} dt */
  _updateWaveSpawns(dt) {
    if (this.gameOver) return;
    const state = this.state;
    if (state.waveSpawnRemaining <= 0) return;

    state.waveSpawnCooldown -= dt;
    while (state.waveSpawnCooldown <= 0 && state.waveSpawnRemaining > 0) {
      this._spawnEnemy();
      state.waveSpawnRemaining--;
      state.waveSpawnCooldown += WAVE_SPAWN_INTERVAL;
    }
  }

  /** @param {number} dt */
  _updateWaveProgress(dt) {
    const state = this.state;
    if (state.waveBreakTimer > 0) {
      state.waveBreakTimer -= dt;
      if (state.waveBreakTimer <= 0) {
        state.waveBreakTimer = 0;
        const finalW = Math.max(1, Math.floor(Number(gameConfig.finalSurvivalWave) || 1));
        if (state.wave >= finalW) {
          state.nextWave = false;
          this._triggerRunComplete();
        } else {
          state.wave++;
          state.nextWave = false;
          this._showWaveBanner(state.wave);
          this._beginWaveSpawns();
          this.onHudUpdate();
        }
      }
      return;
    }

    if (
      state.enemiesLeft <= 0 &&
      state.enemies.length === 0 &&
      !state.boss &&
      state.pendingObstacles.length === 0 &&
      state.waveSpawnRemaining <= 0 &&
      !state.nextWave
    ) {
      state.nextWave = true;
      state.waveBreakTimer = WAVE_BREAK_DURATION;
    }
  }

  _triggerGameOver() {
    this.audio?.setGameplayBgmPlaybackRate?.(1);
    this.gameOver = true;
    this.onGameOver();
  }

  _triggerRunComplete() {
    if (this.runVictory) return;
    this.audio?.setGameplayBgmPlaybackRate?.(1);
    this.runVictory = true;
    const state = this.state;
    const ch = getCharacter(state.characterId);
    const maxHp = statToHp(ch.hpStat);
    /** @type {RunCompletePayload} */
    const payload = {
      score: state.score,
      wave: state.wave,
      characterId: state.characterId,
      playerHp: Math.max(0, state.player.hp),
      playerHpMax: maxHp,
      weaponId: state.weaponId,
      weaponLabel: getWeapon(state.weaponId).label,
      runTimeSec: state.runElapsedSec,
    };
    this.onRunComplete?.(payload);
    this.onHudUpdate();
  }
}
