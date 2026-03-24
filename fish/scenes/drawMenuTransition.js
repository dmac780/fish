import { MENU_SCENE_TRANSITION_SEC } from '../config/scenes.js';

/**
 * Black overlay: fade in on scene enter, fade out before leaving.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} enterFadeT seconds since enter (overlay clears as this approaches duration)
 * @param {number} leaveFadeT seconds in leave phase (0 = not leaving); ramps to black
 */
export function drawMenuSceneTransitionOverlay(ctx, enterFadeT, leaveFadeT) {
  const T = MENU_SCENE_TRANSITION_SEC;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  let alpha = 0;
  if (leaveFadeT > 0) {
    alpha = Math.min(1, leaveFadeT / T);
  } else if (enterFadeT < T) {
    alpha = 1 - Math.min(1, Math.max(0, enterFadeT) / T);
  }
  if (alpha <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export { MENU_SCENE_TRANSITION_SEC };
