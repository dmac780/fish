import { SIM_HZ } from '../../config/timing.js';

/**
 * King Boot: rubber boot boss — roams corners / center, slow aimed orbs in volleys + pauses,
 * periodic faster spiral around self, and a full radial burst after visiting all four corners once.
 * Sprite front faces −X (left); `facingMode: 'mirror'` in def.
 * @param {import('../../config/bosses.js').BossDef} def
 * @param {number} W
 * @param {number} H
 * @param {number} u
 */
export function createKingBootRuntime(def, W, H, u) {
  const cy = H * def.centerYFrac;
  return {
    logicKey: 'kingBoot',
    def,
    hp: def.hp,
    maxHp: def.hp,
    x: W / 2,
    y: -def.size * u * 1.15,
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
    phase: /** @type {'enter' | 'combat'} */ ('enter'),
    centerX: W / 2,
    centerY: cy,
    /** @type {{ x: number, y: number, kind: 'corner' | 'center', cornerId?: number }} */
    moveTarget: { x: W / 2, y: cy, kind: 'center' },
    cornerSeen: /** @type {boolean[]} */ ([false, false, false, false]),
    orbSub: /** @type {'fire' | 'pause'} */ ('fire'),
    orbEmitCd: 0,
    orbPauseLeft: 0,
    orbsFiredInVolley: 0,
    spiralActive: false,
    spiralCd: def.spiral.firstDelayTicks,
    spiralAngle: 0,
    spiralAccumRad: 0,
    spiralEmitCd: 0,
    /** +1 or −1; picked when a spiral burst starts */
    spiralDir: 1,
  };
}

/**
 * @param {number} W
 * @param {number} H
 * @param {number} u
 * @param {number} cy
 * @returns {{ x: number, y: number, kind: 'corner' | 'center', cornerId?: number }}
 */
function pickRoamTarget(W, H, u, cy) {
  const margin = Math.max(52 * u, W * 0.09);
  if (Math.random() < 0.26) {
    return {
      x: W / 2 + (Math.random() - 0.5) * W * 0.14,
      y: cy + (Math.random() - 0.5) * H * 0.1,
      kind: 'center',
    };
  }
  const corners = [
    { x: margin, y: margin, id: 0 },
    { x: W - margin, y: margin, id: 1 },
    { x: margin, y: H - margin, id: 2 },
    { x: W - margin, y: H - margin, id: 3 },
  ];
  const c = corners[Math.floor(Math.random() * 4)];
  return { x: c.x, y: c.y, kind: 'corner', cornerId: c.id };
}

/**
 * @param {{
 *   boss: ReturnType<typeof createKingBootRuntime>,
 *   k: number,
 *   u: number,
 *   W: number,
 *   H: number,
 *   p: { x: number, y: number },
 *   enemyBullets: Array<{
 *     x: number,
 *     y: number,
 *     vx: number,
 *     vy: number,
 *     life: number,
 *     damage: number,
 *     r: number,
 *     flavor?: string,
 *   }>,
 * }} ctx
 */
export function updateKingBoot(ctx) {
  const { boss, k, u, W, H, p, enemyBullets } = ctx;
  const def = boss.def;
  const orbs = def.orbs;
  const rad = def.radial;
  const sp = def.spiral;

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

  function fireRadialBurst() {
    const n = rad.count;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      fireDirected(a, rad.bulletSpeed, rad.bulletLifeTicks, rad.bulletDamage, rad.bulletSize);
    }
  }

  const snap = 8 * u;
  const cx = boss.centerX;
  const cy = boss.centerY;

  if (boss.phase === 'enter') {
    const dx = cx - boss.x;
    const dy = cy - boss.y;
    const d = Math.hypot(dx, dy);
    const step = def.approachSpeed * u * speedMul * k;
    if (d <= Math.max(snap, step)) {
      boss.x = cx;
      boss.y = cy;
      boss.phase = 'combat';
      boss.moveTarget = pickRoamTarget(W, H, u, cy);
      boss.orbSub = 'fire';
      boss.orbEmitCd = 0;
      boss.orbsFiredInVolley = 0;
      boss.orbPauseLeft = 0;
      boss.spiralActive = false;
      boss.spiralCd = sp.firstDelayTicks;
      boss.spiralAngle = 0;
      boss.spiralAccumRad = 0;
      boss.spiralEmitCd = 0;
      boss.spiralDir = 1;
    } else {
      boss.x += (dx / d) * step;
      boss.y += (dy / d) * step;
    }
    return;
  }

  const tx = boss.moveTarget.x;
  const ty = boss.moveTarget.y;
  let mdx = tx - boss.x;
  let mdy = ty - boss.y;
  let md = Math.hypot(mdx, mdy);
  const moveStep = def.combatMoveSpeed * u * speedMul * k;
  if (md > snap) {
    boss.x += (mdx / md) * moveStep;
    boss.y += (mdy / md) * moveStep;
  }
  mdx = tx - boss.x;
  mdy = ty - boss.y;
  md = Math.hypot(mdx, mdy);

  if (md <= snap * 1.2) {
    boss.x = tx;
    boss.y = ty;
    if (boss.moveTarget.kind === 'corner' && boss.moveTarget.cornerId !== undefined) {
      const cid = boss.moveTarget.cornerId;
      boss.cornerSeen[cid] = true;
      if (boss.cornerSeen.every(Boolean)) {
        fireRadialBurst();
        boss.cornerSeen = [false, false, false, false];
      }
    }
    boss.moveTarget = pickRoamTarget(W, H, u, cy);
  }

  const effEmit = Math.max(1, orbs.emitIntervalTicks / emitMul);
  const effPause = Math.max(1, orbs.pauseTicks / emitMul);
  const effSpiralEmit = Math.max(1, sp.emitIntervalTicks / emitMul);
  const effSpiralBetween = Math.max(1, sp.betweenTicks / emitMul);
  const spiralCap = sp.rotations * Math.PI * 2;

  if (boss.spiralActive) {
    boss.spiralEmitCd -= k;
    while (boss.spiralEmitCd <= 0 && boss.spiralActive) {
      boss.spiralEmitCd += effSpiralEmit;
      if (boss.spiralAccumRad >= spiralCap) {
        boss.spiralActive = false;
        boss.spiralCd = effSpiralBetween;
        break;
      }
      const a = boss.spiralAngle;
      const step = sp.angleStepRad * boss.spiralDir;
      boss.spiralAngle += step;
      boss.spiralAccumRad += Math.abs(step);
      fireDirected(
        a,
        sp.bulletSpeed,
        sp.bulletLifeTicks,
        sp.bulletDamage,
        sp.bulletSize,
      );
      if (boss.spiralAccumRad >= spiralCap) {
        boss.spiralActive = false;
        boss.spiralCd = effSpiralBetween;
        break;
      }
    }
  } else {
    boss.spiralCd -= k;
    if (boss.spiralCd <= 0) {
      boss.spiralActive = true;
      boss.spiralAngle = 0;
      boss.spiralAccumRad = 0;
      boss.spiralEmitCd = 0;
      boss.spiralDir = Math.random() < 0.5 ? 1 : -1;
    }
  }

  if (!boss.spiralActive) {
    if (boss.orbSub === 'pause') {
      boss.orbPauseLeft -= k;
      if (boss.orbPauseLeft <= 0) {
        boss.orbSub = 'fire';
        boss.orbsFiredInVolley = 0;
        boss.orbEmitCd = 0;
      }
    } else {
      boss.orbEmitCd -= k;
      while (boss.orbEmitCd <= 0) {
        boss.orbEmitCd += effEmit;
        const base = Math.atan2(p.y - boss.y, p.x - boss.x);
        const sd = orbs.spreadDeg;
        const si = boss.orbsFiredInVolley;
        const degOff =
          Array.isArray(sd) && sd.length > 0 ? sd[si % sd.length] : 0;
        fireDirected(
          base + (degOff * Math.PI) / 180,
          orbs.bulletSpeed,
          orbs.bulletLifeTicks,
          orbs.bulletDamage,
          orbs.bulletSize,
        );
        boss.orbsFiredInVolley += 1;
        if (boss.orbsFiredInVolley >= orbs.volleyCount) {
          boss.orbSub = 'pause';
          boss.orbPauseLeft = effPause;
          break;
        }
      }
    }
  }
}
