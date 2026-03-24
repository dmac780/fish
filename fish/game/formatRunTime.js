/**
 * @param {number} sec
 * @returns {string} e.g. "0:42", "9:05", "1:03:02"
 */
export function formatRunTime(sec) {
  const t = Math.max(0, Number(sec) || 0);
  const s = Math.floor(t);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  return `${m}:${String(r).padStart(2, '0')}`;
}
