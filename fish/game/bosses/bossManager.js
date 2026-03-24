import { getBossDefForWave } from '../../config/bosses.js';
import { unitScale } from '../../config/units.js';
import { createOctoroboRuntime, updateOctorobo } from './octorobo.js';
import { createKingBootRuntime, updateKingBoot } from './kingBoot.js';
import {
  createGodNephropidaeRuntime,
  updateGodNephropidae,
} from './godNephropidae.js';

/**
 * @param {import('../FishHellGame.js').FishHellGame} game
 */
export function spawnBossForWaveIfNeeded(game) {
  const state = game.state;
  const def = getBossDefForWave(state.wave);
  if (!def) return;

  const W = game.canvas.width;
  const H = game.canvas.height;
  const u = unitScale(game.canvas);

  state.enemiesLeft += 1;
  if (def.logicKey === 'octorobo') {
    state.boss = createOctoroboRuntime(def, W, H, u);
  } else if (def.logicKey === 'kingBoot') {
    state.boss = createKingBootRuntime(def, W, H, u);
  } else if (def.logicKey === 'godNephropidae') {
    state.boss = createGodNephropidaeRuntime(def, W, H, u);
  }
}

/**
 * @param {import('../FishHellGame.js').FishHellGame} game
 * @param {number} k tick blend (dt * SIM_HZ)
 */
export function updateBoss(game, k) {
  const state = game.state;
  const b = state.boss;
  if (!b) return;

  const W = game.canvas.width;
  const H = game.canvas.height;
  const u = unitScale(game.canvas);
  const p = state.player;

  b.knockVx = 0;
  b.knockVy = 0;

  if (b.logicKey === 'octorobo') {
    updateOctorobo({
      boss: b,
      k,
      u,
      W,
      H,
      p,
      enemyBullets: state.enemyBullets,
    });
  } else if (b.logicKey === 'kingBoot') {
    updateKingBoot({
      boss: b,
      k,
      u,
      W,
      H,
      p,
      enemyBullets: state.enemyBullets,
    });
  } else if (b.logicKey === 'godNephropidae') {
    updateGodNephropidae({
      boss: b,
      k,
      u,
      W,
      H,
      p,
      enemyBullets: state.enemyBullets,
      onSpawnEnrageShrimpPulse: (room) => game._spawnGodEnrageShrimpPulseFromBoss(b, room),
    });
  }
}
