/**
 * After `rotate(aim)`, apply `scale(1,-1)` when true so the rifle art stays right-side up
 * (sights on top). Matches the sign used for muzzle `perp`, not movement `facing`.
 */
export function gunMirrorYForAim(aimAngle) {
  return Math.cos(aimAngle) < 0;
}

/** Multiply `muzzle.perp` by this so spawn matches the mirrored gun sprite. */
export function gunAimPerpSign(aimAngle) {
  return gunMirrorYForAim(aimAngle) ? -1 : 1;
}

/**
 * @param {number} px
 * @param {number} py
 * @param {number} angle
 * @param {number} along
 * @param {number} perp “gun up” offset (see weapons.js)
 */
export function muzzleWorld(px, py, angle, along, perp) {
  const fx = Math.cos(angle);
  const fy = Math.sin(angle);
  const rx = Math.sin(angle);
  const ry = -Math.cos(angle);
  return {
    x: px + fx * along + rx * perp,
    y: py + fy * along + ry * perp,
  };
}

/**
 * Aim so the shot line from the muzzle passes through (tx, ty) (e.g. cursor).
 * `along` / `perpMag` are already × unitScale, same as `muzzleWorld` in gameplay.
 */
export function aimAngleMuzzleToTarget(px, py, tx, ty, along, perpMag, seedAngle) {
  let angle = Number.isFinite(seedAngle)
    ? seedAngle
    : Math.atan2(ty - py, tx - px);
  for (let i = 0; i < 4; i++) {
    const perp = perpMag * gunAimPerpSign(angle);
    const m = muzzleWorld(px, py, angle, along, perp);
    angle = Math.atan2(ty - m.y, tx - m.x);
  }
  return angle;
}
