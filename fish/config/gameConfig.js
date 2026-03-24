/**
 * Global game toggles. Import from `FishHellGame` / scenes as needed.
 */

export const gameConfig = {

  /**
   * Clearing this wave ends the run (credits); there is no wave N+1.
   * Must be ≥ 1.
   */
  finalSurvivalWave: 30,


  /**
   * When true, survival uses `survivalWaveStart` as the first wave.
   * When false, always start at wave 1.
   */
  devMode: false,

  /**
   * Starting wave in survival when `devMode` is true (integer ≥ 1).
   * Ignored when `devMode` is false (always wave 1).
   */
  survivalWaveStart: 1,

  /**
   * When true, show hitboxes on the screen.
   */
  showHitboxes: false,

  /**
   * When true *and* `devMode` is true, player HP is never reduced and you cannot die to damage.
   * If `devMode` is false, this is ignored
   */
  godMode: false,

  /**
   * When true, all enemies are replaced with clams for item testing.
   */
  oopsAllClams: false,

  /**
   * When true *and* `devMode` is true, wave spawns are only random obstacles (eel / hook / coral).
   * Boss spawns are skipped (same idea as `oopsAllClams`). Ignored when `devMode` is false.
   */
  oopsAllObstacles: false,
};
