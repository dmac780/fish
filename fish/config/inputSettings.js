/** localStorage key for volume + bindings */
export const INPUT_SETTINGS_STORAGE_KEY = 'fishgun.inputSettings.v1';

/**
 * @typedef {keyof typeof defaultInputBindings} InputActionId
 */

/** One key per action (lowercase; arrows as `arrowup`, etc.). */
/** Sentinel: primary fire is left mouse; shown as “L-Click” in settings (rebind to a key to add keyboard fire). */
export const MOUSE_LEFT_SHOOT_BINDING = 'mouseleft';

export const defaultInputBindings = {
  moveUp: 'w',
  moveDown: 's',
  moveLeft: 'a',
  moveRight: 'd',
  shoot: MOUSE_LEFT_SHOOT_BINDING,
  reload: 'r',
  /** Slow-mo while meter held (default Space) */
  bulletTime: ' ',
};

/** UI / persistence order */
export const INPUT_ACTION_ORDER = /** @type {const} */ ([
  'moveUp',
  'moveDown',
  'moveLeft',
  'moveRight',
  'shoot',
  'reload',
  'bulletTime',
]);

/** Japanese + romaji labels for the settings screen */
export const inputActionLabels = {
  moveUp: { jp: '前進', romaji: 'FORWARD' },
  moveDown: { jp: '後退', romaji: 'BACK' },
  moveLeft: { jp: '左', romaji: 'LEFT' },
  moveRight: { jp: '右', romaji: 'RIGHT' },
  shoot: { jp: '射撃', romaji: 'SHOOT' },
  reload: { jp: 'リロード', romaji: 'RELOAD' },
  bulletTime: { jp: 'バレットタイム', romaji: 'BULLET TIME' },
};

/**
 * @param {KeyboardEvent} e
 * @returns {string}
 */
export function normalizeKeyEvent(e) {
  const k = e.key;
  if (k === ' ') return ' ';
  return k.length === 1 ? k.toLowerCase() : k.toLowerCase();
}

/**
 * @param {string} k stored key id
 * @returns {string} short label for drawing
 */
export function formatKeyDisplay(k) {
  const m = {
    ' ': 'Space',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    enter: 'Enter',
    shift: 'Shift',
    control: 'Ctrl',
    alt: 'Alt',
    tab: 'Tab',
    backspace: 'Bksp',
    escape: 'Esc',
  };
  if (m[k]) return m[k];
  if (k === MOUSE_LEFT_SHOOT_BINDING) return 'L-Click';
  if (k.length === 1) return k.toUpperCase();
  return k;
}
