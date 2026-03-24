import { display as defaultDisplay } from './config/display.js';

/**
 * Sets canvas backing-store size (world resolution) and CSS layout.
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} wrap
 * @param {typeof defaultDisplay} [cfg]
 * @returns {{ dispose: () => void, relayout: () => void }}
 */
export function applyDisplay(canvas, wrap, cfg = defaultDisplay) {
  canvas.width = cfg.width;
  canvas.height = cfg.height;

  function layout() {
    const bg = '#0d1b2a';

    if (cfg.fullscreen) {
      document.body.style.overflow = 'hidden';
      wrap.style.cssText = [
        'position:fixed',
        'inset:0',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'background:' + bg,
        'z-index:0',
      ].join(';');

      if (cfg.fullscreenScaleMode === 'fill') {
        canvas.style.cssText = [
          'display:block',
          'width:100vw',
          'height:100vh',
          'object-fit:fill',
          'border-radius:0',
        ].join(';');
      } else {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const s = Math.min(vw / cfg.width, vh / cfg.height);
        const w = Math.round(cfg.width * s);
        const h = Math.round(cfg.height * s);
        canvas.style.cssText = [
          'display:block',
          'width:' + w + 'px',
          'height:' + h + 'px',
          'border-radius:0',
        ].join(';');
      }
      return;
    }

    document.body.style.overflow = '';
    const pad = 16;
    const sx = (window.innerWidth - pad) / cfg.width;
    const sy = (window.innerHeight - pad) / cfg.height;
    const scale = Math.min(1, sx, sy);
    const cw = Math.round(cfg.width * scale);
    const ch = Math.round(cfg.height * scale);

    wrap.style.cssText = [
      'position:relative',
      'width:' + cw + 'px',
      'height:' + ch + 'px',
      'flex-shrink:0',
    ].join(';');

    canvas.style.cssText = [
      'display:block',
      'width:' + cw + 'px',
      'height:' + ch + 'px',
      'border-radius:8px',
    ].join(';');
  }

  layout();
  window.addEventListener('resize', layout);
  return {
    dispose: () => window.removeEventListener('resize', layout),
    relayout: layout,
  };
}
