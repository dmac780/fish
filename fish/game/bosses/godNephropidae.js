import { SIM_HZ } from '../../config/timing.js';

/**
 * God Nephropidae (final boss pattern): descends to center hover → big aimed violet orb →
 * horizontal L/R wave volleys → slow radial → fast offset radial → brief gap → repeat.
 * Enrage adds a capped stream of shrimp erupting from the boss (see `def.enrageShrimp`).
 * @param {import('../../config/bosses.js').BossDef} def
 * @param {number} W
 * @param {number} H
 * @param {number} u
 */
export function createGodNephropidaeRuntime(def, W, H, u) {
  const cy = H * def.centerYFrac;
  return {
    logicKey: 'godNephropidae',
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
    movePhase: /** @type {'enter' | 'hover'} */ ('enter'),
    centerX: W / 2,
    centerY: cy,
    /** @type {'big_red' | 'side_wave' | 'radial_pause' | 'cycle_gap'} */
    atkPhase: 'big_red',
    sideWaveIndex: 0,
    atkCd: 0,
    radialPauseLeft: 0,
    gapLeft: 0,
    enrageShrimpSpawned: 0,
    enrageShrimpEmitCd: 0,
    /** 0…period−1 for `spriteOscillateFacing` draw mirror */
    spriteFacingPhase: 0,
  };
}

/**
 * @param {{
 *   boss: ReturnType<typeof createGodNephropidaeRuntime>,
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
 *   onSpawnEnrageShrimpPulse: (room: number) => number,
 * }} ctx
 */
export function updateGodNephropidae(ctx) {
  const { boss, k, u, W, H, p, enemyBullets, onSpawnEnrageShrimpPulse } = ctx;
  const def = boss.def;
  const br = def.bigRed;
  const sw = def.sideWave;
  const rs = def.radialSlow;
  const rf = def.radialFast;

  if (boss.hitFlashTicks > 0) boss.hitFlashTicks = Math.max(0, boss.hitFlashTicks - k);

  if (def.spriteOscillateFacing) {
    const period = Math.max(8, def.spriteOscillateFacingPeriodTicks ?? 240);
    boss.spriteFacingPhase = ((boss.spriteFacingPhase ?? 0) + k) % period;
  }

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
   * @param {string} [flavor]
   */
  function fireDirected(angle, speed, life, damage, size, flavor) {
    const v0 = speed * u;
    const b = {
      x: boss.x,
      y: boss.y,
      vx: Math.cos(angle) * v0,
      vy: Math.sin(angle) * v0,
      life,
      damage,
      r: size * u,
    };
    if (flavor) b.flavor = flavor;
    enemyBullets.push(b);
  }

  /**
   * @param {typeof rs} cfg
   * @param {number} angleOffsetRad
   */
  function fireRadial(cfg, angleOffsetRad) {
    const n = cfg.count;
    for (let i = 0; i < n; i++) {
      const a = angleOffsetRad + (i / n) * Math.PI * 2;
      fireDirected(a, cfg.bulletSpeed, cfg.bulletLifeTicks, cfg.bulletDamage, cfg.bulletSize, cfg.flavor);
    }
  }

  const snap = 7 * u;
  const cx = boss.centerX;
  const cy = boss.centerY;

  if (boss.movePhase === 'enter') {
    const dx = cx - boss.x;
    const dy = cy - boss.y;
    const d = Math.hypot(dx, dy);
    const step = def.approachSpeed * u * speedMul * k;
    if (d <= Math.max(snap, step)) {
      boss.x = cx;
      boss.y = cy;
      boss.movePhase = 'hover';
      boss.atkPhase = 'big_red';
      boss.atkCd = 0;
      boss.sideWaveIndex = 0;
    } else {
      boss.x += (dx / d) * step;
      boss.y += (dy / d) * step;
    }
    return;
  }

  const es = def.enrageShrimp;
  if (
    es &&
    boss.enraged &&
    boss.hp > 0 &&
    boss.enrageShrimpSpawned < es.maxSpawn
  ) {
    const baseIv = es.pulseIntervalTicks ?? 120;
    const effPulseIv = Math.max(60, baseIv / emitMul);
    boss.enrageShrimpEmitCd -= k;
    if (boss.enrageShrimpEmitCd <= 0) {
      boss.enrageShrimpEmitCd += effPulseIv;
      const room = es.maxSpawn - boss.enrageShrimpSpawned;
      boss.enrageShrimpSpawned += onSpawnEnrageShrimpPulse(room);
    }
  }

  const effSideInterval = Math.max(2, sw.emitIntervalTicks / emitMul);
  const effRadialGap = Math.max(2, def.betweenRadialTicks / emitMul);
  const effCycleGap = Math.max(4, def.cycleGapTicks / emitMul);

  if (boss.atkPhase === 'big_red') {
    const aim = Math.atan2(p.y - boss.y, p.x - boss.x);
    fireDirected(
      aim,
      br.bulletSpeed,
      br.bulletLifeTicks,
      br.bulletDamage,
      br.bulletSize,
      'godRed',
    );
    boss.atkPhase = 'side_wave';
    boss.sideWaveIndex = 0;
    boss.atkCd = effSideInterval;
    return;
  }

  if (boss.atkPhase === 'side_wave') {
    boss.atkCd -= k;
    while (boss.atkCd <= 0 && boss.atkPhase === 'side_wave') {
      boss.atkCd += effSideInterval;
      const spread = sw.laneSpreadRad;
      const lanes = sw.lanesPerWave;
      const mid = (lanes - 1) / 2;
      for (let lane = 0; lane < lanes; lane++) {
        const off = (lane - mid) * spread;
        fireDirected(
          Math.PI + off,
          sw.bulletSpeed,
          sw.bulletLifeTicks,
          sw.bulletDamage,
          sw.bulletSize,
          sw.flavor,
        );
        fireDirected(
          off,
          sw.bulletSpeed,
          sw.bulletLifeTicks,
          sw.bulletDamage,
          sw.bulletSize,
          sw.flavor,
        );
      }
      boss.sideWaveIndex += 1;
      if (boss.sideWaveIndex >= sw.waveCount) {
        fireRadial(rs, 0);
        boss.atkPhase = 'radial_pause';
        boss.radialPauseLeft = effRadialGap;
        break;
      }
    }
    return;
  }

  if (boss.atkPhase === 'radial_pause') {
    boss.radialPauseLeft -= k;
    if (boss.radialPauseLeft <= 0) {
      fireRadial(rf, rf.angleOffsetRad);
      boss.atkPhase = 'cycle_gap';
      boss.gapLeft = effCycleGap;
    }
    return;
  }

  if (boss.atkPhase === 'cycle_gap') {
    boss.gapLeft -= k;
    if (boss.gapLeft <= 0) {
      boss.atkPhase = 'big_red';
    }
  }
}
