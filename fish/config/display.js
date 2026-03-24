/**
 * Canvas backing-store = world size in pixels. CSS only scales how it’s shown.
 */

/** @typedef {'fit' | 'fill'} FullscreenScaleMode */

export const display = {
  width: 1280,
  height: 720,

  /**
   * Edge-to-edge layout using the viewport (`applyDisplay`); letterboxed to 16:9 via `fullscreenScaleMode`.
   * Runtime value is synced from saved settings in `main.js`.
   */
  fullscreen: false,

  fullscreenScaleMode: /** @type {FullscreenScaleMode} */ ('fit'),
};
