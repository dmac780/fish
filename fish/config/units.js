/**
 * World space = canvas backing pixels (canvas.width × canvas.height).
 * `unit` scales visuals/physics so a 720px min edge = 1.0 (design reference).
 */
export function unitScale(canvas) {
  return Math.min(canvas.width, canvas.height) / 720;
}
