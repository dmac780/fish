/**
 * Screen / world VFX using horizontal sprite strips (same idea as weapon muzzle sheets).
 */

/** Boss death: `fish/assets/vfx/dmac_explosion1.png` — 17 × 70×90 inside 1190×90 */
export const BOSS_DEATH_EXPLOSION = {
  textureKey: 'dmac_explosion1',
  frames: 17,
  frameW: 70,
  frameH: 90,
  /** Sim ticks per frame @ 60Hz */
  ticksPerFrame: 3,
  /** On-screen height (design units × unitScale); width follows aspect */
  drawH: 172,
};
