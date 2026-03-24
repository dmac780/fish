import { SIM_HZ } from '../../config/timing.js';

/**
 * Octorobo pattern: descend to center → two spiral volleys (gap 2s) → strafe + slow aimed bursts → return → repeat.
 * @param {import('../../config/bosses.js').BossDef} def
 */

/**
 * @param {import('../../config/bosses.js').BossDef} def
 * @param {number} W
 * @param {number} H
 * @param {number} u
 */
export function createOctoroboRuntime(def, W, H, u) {
  const cy = H * def.centerYFrac;
  return {
    logicKey: 'octorobo',
    def,
    hp: def.hp,
    maxHp: def.hp,
    x: W / 2,
    y: -def.size * u * 1.2,
    hitR: def.size * u,
    spriteKey: def.spriteKey,
    spriteFront: def.spriteFront,
    facingMode: def.facingMode,
    emoji: def.emoji,
    visualScale: def.visualScale,
    knockbackMul: def.knockbackMul,
    knockVx: 0,
    knockVy: 0,
    score: def.score,
    contactDamage: def.contactDamage,
    hitFlashTicks: 0,
    enraged: false,
    enrageCommitted: false,
    enrageWarningTicks: 0,
    phase: /** @type {'enter' | 'spiral_v1' | 'spiral_gap' | 'spiral_v2' | 'strafe' | 'return_center'} */ (
      'enter'
    ),
    centerX: W / 2,
    centerY: cy,
    spiralAngle: 0,
    spiralAccumRad: 0,
    spiralEmitCd: 0,
    strafeTargetX: W / 2,
    strafeShotCd: 0,
    phaseGapLeft: 0,
    /** Radians; vertical sway while idle at center (spiral + gap). */
    idleBobPhase: 0,
  };
}

/** Sim-ticks per full up/down sway (~1.55s at 60Hz sim). */
const OCTO_IDLE_BOB_PERIOD_TICKS = SIM_HZ * 1.55;
/** Peak offset in `u` from hover anchor; keep small so boss HP bar doesn’t flip above/below each cycle. */
const OCTO_IDLE_BOB_AMP_U = 3.2;
/** Nudge hover anchor downward (screen +Y) so bar stays off the top HUD flip threshold. */
const OCTO_IDLE_ANCHOR_BIAS_U = 2.5;

/**
 * @param {ReturnType<typeof createOctoroboRuntime>} boss
 * @param {number} k
 * @param {number} u
 * @param {number} cx
 * @param {number} anchorY combat hover center (includes downward bias)
 */
function applyOctoroboCenterSway(boss, k, u, cx, anchorY) {
  boss.idleBobPhase += ((Math.PI * 2) / OCTO_IDLE_BOB_PERIOD_TICKS) * k;
  boss.x = cx;
  boss.y = anchorY + Math.sin(boss.idleBobPhase) * OCTO_IDLE_BOB_AMP_U * u;
}

/**
 * @param {{
 *   boss: ReturnType<typeof createOctoroboRuntime>,
 *   k: number,
 *   u: number,
 *   W: number,
 *   H: number,
 *   p: { x: number, y: number },
 *   enemyBullets: Array<{ x: number, y: number, vx: number, vy: number, life: number, damage: number, r: number }>,
 * }} ctx
 */
export function updateOctorobo(ctx) {
  const { boss, k, u, W, H, p, enemyBullets } = ctx;
  const def = boss.def;
  const sp = def.spiral;
  const st = def.strafe;

  if (boss.hitFlashTicks > 0) boss.hitFlashTicks = Math.max(0, boss.hitFlashTicks - k);

  if (!boss.enrageCommitted && boss.hp / boss.maxHp <= def.enrageHpFraction) {
    boss.enrageCommitted = true;
    boss.enrageWarningTicks = Math.ceil(SIM_HZ * def.enrageWarningSeconds);
  }
  if (boss.enrageWarningTicks > 0) {
    boss.enrageWarningTicks -= k;
    if (boss.enrageWarningTicks <= 0) boss.enraged = true;
  }

  const speedMul = boss.enraged ? def.enrageSpeedMul : 1;
  const emitMul = boss.enraged ? def.enrageSpeedMul : 1;

  /**
   * @param {number} angle
   * @param {number} speed
   * @param {number} life
   * @param {number} damage
   * @param {number} size
   */
  function fireDirected(angle, speed, life, damage, size) {
    const v0 = speed * u;
    enemyBullets.push({
      x: boss.x,
      y: boss.y,
      vx: Math.cos(angle) * v0,
      vy: Math.sin(angle) * v0,
      life,
      damage,
      r: size * u,
    });
  }

  /**
   * @param {number} intervalTicks
   * @param {number} angleStepRad
   */
  function tickSpiral(intervalTicks, angleStepRad) {
    const effInterval = Math.max(1, intervalTicks / emitMul);
    boss.spiralEmitCd -= k;
    while (boss.spiralEmitCd <= 0 && boss.phase.startsWith('spiral_v')) {
      boss.spiralEmitCd += effInterval;
      const cap = sp.rotations * Math.PI * 2;
      if (boss.spiralAccumRad >= cap) return true;
      const a = boss.spiralAngle;
      boss.spiralAngle += angleStepRad;
      boss.spiralAccumRad += angleStepRad;
      fireDirected(a, sp.bulletSpeed, sp.bulletLifeTicks, sp.bulletDamage, sp.bulletSize);
      if (boss.spiralAccumRad >= cap) return true;
    }
    return false;
  }

  const snap = 6 * u;
  const cx = boss.centerX;
  const cy = boss.centerY;
  const anchorY = cy + OCTO_IDLE_ANCHOR_BIAS_U * u;

  if (boss.phase === 'enter') {
    const dx = cx - boss.x;
    const dy = anchorY - boss.y;
    const d = Math.hypot(dx, dy);
    const step = def.approachSpeed * u * speedMul * k;
    if (d <= Math.max(snap, step)) {
      boss.x = cx;
      boss.y = anchorY;
      boss.phase = 'spiral_v1';
      boss.spiralAngle = -Math.PI / 2;
      boss.spiralAccumRad = 0;
      boss.spiralEmitCd = 0;
    } else {
      boss.x += (dx / d) * step;
      boss.y += (dy / d) * step;
    }
    return;
  }

  if (boss.phase === 'spiral_v1') {
    applyOctoroboCenterSway(boss, k, u, cx, anchorY);
    const done = tickSpiral(sp.volley1EmitIntervalTicks, sp.volley1AngleStepRad);
    if (done) {
      boss.phase = 'spiral_gap';
      boss.phaseGapLeft = sp.gapBetweenVolleysTicks;
    }
    return;
  }

  if (boss.phase === 'spiral_gap') {
    applyOctoroboCenterSway(boss, k, u, cx, anchorY);
    boss.phaseGapLeft -= k;
    if (boss.phaseGapLeft <= 0) {
      boss.phase = 'spiral_v2';
      boss.spiralAccumRad = 0;
      boss.spiralEmitCd = 0;
    }
    return;
  }

  if (boss.phase === 'spiral_v2') {
    applyOctoroboCenterSway(boss, k, u, cx, anchorY);
    const done = tickSpiral(sp.volley2EmitIntervalTicks, sp.volley2AngleStepRad);
    if (done) {
      boss.phase = 'strafe';
      const left = Math.random() < 0.5;
      const margin = Math.max(48 * u, W * 0.1);
      boss.strafeTargetX = left ? margin + Math.random() * (W * 0.22) : W - margin - Math.random() * (W * 0.22);
      boss.strafeTargetY = anchorY;
      boss.strafeShotCd = 30;
    }
    return;
  }

  if (boss.phase === 'strafe') {
    const tx = boss.strafeTargetX;
    const ty = boss.strafeTargetY;
    let dx = tx - boss.x;
    let dy = ty - boss.y;
    let d = Math.hypot(dx, dy);
    const step = def.combatMoveSpeed * u * speedMul * k;
    if (d > snap) {
      boss.x += (dx / d) * step;
      boss.y += (dy / d) * step;
    }
    dx = tx - boss.x;
    dy = ty - boss.y;
    d = Math.hypot(dx, dy);
    const effShotCd = st.shotIntervalTicks / emitMul;
    boss.strafeShotCd -= k;
    while (boss.strafeShotCd <= 0) {
      boss.strafeShotCd += effShotCd;
      const base = Math.atan2(p.y - boss.y, p.x - boss.x);
      for (const deg of st.spreadDeg) {
        const a = base + (deg * Math.PI) / 180;
        fireDirected(a, st.bulletSpeed, st.bulletLifeTicks, st.bulletDamage, st.bulletSize);
      }
    }
    if (d <= snap * 1.25) {
      boss.phase = 'return_center';
    }
    return;
  }

  if (boss.phase === 'return_center') {
    const dx = cx - boss.x;
    const dy = anchorY - boss.y;
    const d = Math.hypot(dx, dy);
    const step = def.combatMoveSpeed * u * speedMul * k;
    if (d <= snap) {
      boss.x = cx;
      boss.y = anchorY;
      boss.phase = 'spiral_v1';
      boss.spiralAngle = -Math.PI / 2;
      boss.spiralAccumRad = 0;
      boss.spiralEmitCd = 0;
    } else {
      boss.x += (dx / d) * step;
      boss.y += (dy / d) * step;
    }
  }
}
