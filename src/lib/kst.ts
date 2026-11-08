/** 서비스 시간은 KST (퍼즐은 자정에 바뀐다) */
const OFFSET = 9 * 3600e3;
const kst = (ms = Date.now()) => new Date(ms + OFFSET);
export const kstDate = (ms = Date.now()) => kst(ms).toISOString().slice(0, 10);
export const dateLong = (ms = Date.now()) => { const d = kst(ms); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${'일월화수목금토'[d.getUTCDay()]}요일`; };
export const dateShort = (ms = Date.now()) => { const d = kst(ms); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`; };
/** 월요일 = 0 */
export const weekdayIdx = (ms = Date.now()) => (kst(ms).getUTCDay() + 6) % 7;
export function untilMidnight(ms = Date.now()) {
  const d = kst(ms), s = 86400 - (d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds());
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => String(v).padStart(2, '0')).join(':');
}
export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
