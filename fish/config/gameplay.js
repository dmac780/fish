/**
 * Player / world feel. Weapons live in `weapons.js`. Distances use unit scale 1 (min canvas edge 720px).
 */

export const player = {
  hp: 100,
  hitRadius: 10,
  /** Movement per sim tick (60Hz), scaled by unitScale in game */
  moveSpeed: 8.2,
  /** Keep this far from world edges (× unitScale) */
  edgePadding: 22,
  /** Added to position each tick after WASD (× unitScale × tick blend). +Y = down screen */
  gravityX: 0,
  gravityY: 0,
  /** Idle vertical bob amplitude (design units × unitScale) */
  idleBobAmplitude: 3.2,
  /** Bob phase speed when drifting (radians per sim tick @ 60Hz) */
  waterBobIdleRate: 0.12,
  /** Bob phase creep while moving so idle motion doesn’t jump */
  waterBobMoveDrift: 0.055,
  /** Full-screen red tint when hurt; decays over this many sim ticks @ 60Hz */
  damageFlashTicks: 22,
  /** Peak opacity of the red overlay (0–1) */
  damageFlashAlphaPeak: 0.16,
  /** Screen shake after player hit; decays over this many sim ticks @ 60Hz */
  hitScreenShakeTicks: 14,
  /** Peak shake offset in design units (× unitScale → px); keep small */
  hitScreenShakeMax: 3.2,
  /** Gun kick visual: decay factor per sim tick @ 60Hz (lower = snappier return) */
  gunRecoilDecayPerTick: 0.74,
  /** Cap kick stack in design units (× unitScale) so auto doesn’t crawl off-screen */
  gunRecoilMaxU: 4.2,
  /** If a weapon omits `fire.visualKickU`, use this (design units) */
  gunRecoilDefaultKickU: 2,
};

/**
 * Bullet time (HUD: バレットタイム): hold the bound key (Settings → バレットタイム) with meter to slow hostiles & bullets; run timer unchanged.
 * Set `enabled: false` to turn off.
 */
export const fishTime = {
  enabled: true,
  meterMax: 100,
  /** Base meter per hostile kill; plus score × `fillPerScorePoint` */
  fillBase: 9,
  fillPerScorePoint: 0.07,
  bossKillBonus: 28,
  /** Drains per real second while held */
  drainPerSecond: 24,
  /** Sim-tick multiplier for enemies, obstacles, boss logic, enemy bullets (0.2 = 80% slower than normal) */
  enemySimMul: 0.2,
  /** Sim-tick multiplier for player movement only */
  playerMoveMul: 0.5,
  /** Fire cooldown, reload, gun recoil decay (lower = slower RPM) */
  gunSimMul: 0.45,
  /** Survival playlist `HTMLAudioElement.playbackRate` while active (browser may pitch-shift) */
  bgmPlaybackRate: 0.72,
};

/** Chasers + turrets: hit flash via `globalAlpha` on draw (PNG transparency unchanged) */
export const enemy = {
  hitFlashTicks: 12,
  /** Opacity when hit just landed (eases back to 1); transparent PNG areas stay clear */
  hitFlashMinAlpha: 0.36,
};
