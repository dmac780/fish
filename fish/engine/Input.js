/**
 * Keyboard + mouse in game (canvas) space. Call dispose() when tearing down.
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   preventDefaultKeys?: string[],
 *   getPreventDefaultKeys?: () => string[],
 * }} [options]
 */
export function createInput(canvas, options = {}) {
  const keys = Object.create(null);
  const mouse = { x: 0, y: 0 };
  const pointer = { leftDown: false };

  function syncMouse(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    mouse.x = (clientX - r.left) * sx;
    mouse.y = (clientY - r.top) * sy;
  }

  function onMouseMove(e) {
    syncMouse(e.clientX, e.clientY);
  }

  function onMouseDown(e) {
    if (e.button === 0) pointer.leftDown = true;
    syncMouse(e.clientX, e.clientY);
  }

  function onMouseUp(e) {
    if (e.button === 0) pointer.leftDown = false;
  }

  /** Clear left button when released anywhere (canvas aim can leave the element while still holding). */
  function onWindowMouseUp(e) {
    if (e.button === 0) pointer.leftDown = false;
  }

  function releasePointer() {
    pointer.leftDown = false;
  }

  function preventList() {
    if (typeof options.getPreventDefaultKeys === 'function') {
      return options.getPreventDefaultKeys();
    }
    return options.preventDefaultKeys ?? ['w', 'a', 's', 'd', 'r', ' '];
  }

  function onKeyDown(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
    keys[k] = true;
    const pl = preventList();
    if (pl.includes(k)) e.preventDefault();
  }

  function onKeyUp(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
    keys[k] = false;
  }

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mouseup', onWindowMouseUp);
  window.addEventListener('blur', releasePointer);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  return {
    keys,
    mouse,
    pointer,
    clearPointer() {
      pointer.leftDown = false;
    },
    syncMouseFromEvent(e) {
      syncMouse(e.clientX, e.clientY);
    },
    dispose() {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mouseup', onWindowMouseUp);
      window.removeEventListener('blur', releasePointer);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    },
  };
}
