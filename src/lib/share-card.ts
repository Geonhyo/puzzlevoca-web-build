/** 결과 공유 카드: 항상 1080×1350 (4:5). 색은 디자인 토큰, 로고는 로고 패스를 그대로 그린다. */
import { LOGO_GLYPHS, LOGO_TILES } from '@/components/logo-paths';
import { SITE_URL, TAGLINE } from './config';
import { dateLong, fmtTime } from './kst';
import { cssVar } from './tokens';
import type { Summary } from '@/shared/game-core';

export async function drawShareCard(opts: { summary: Summary; size: number; cells: string[]; loginId: string | null }) {
  const fontE = cssVar('--font-urbanist') || 'sans-serif';
  const fontK = cssVar('--font-noto-kr') || 'sans-serif';
  try {
    await Promise.all([`800 120px ${fontE}`, `700 40px ${fontK}`, `800 40px ${fontK}`, `600 30px ${fontK}`].map(f => document.fonts.load(f)));
  } catch { /* 글꼴 없이도 그린다 */ }
  const FK = `${fontK}, sans-serif`, FE = `${fontE}, ${fontK}, sans-serif`;
  const t = (n: string) => cssVar(n);
  const C = {
    bg: t('--color-share-bg'), head: t('--color-share-head'), sub: t('--color-share-sub'), pill: t('--color-share-pill'), ring: t('--color-share-ring'),
    combo: t('--color-share-combo'), miss: t('--color-share-miss'), joker: t('--color-share-joker'),
    card: t('--color-card'), ink: t('--color-ink'), ink2: t('--color-ink-2'), ink3: t('--color-ink-3'),
  };
  const R = opts.summary, W = 1080, H = 1350, N = opts.size;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  };
  // 바탕: 브랜드 파랑 + 은은한 고리 두 개
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = C.ring; g.lineWidth = 60;
  g.beginPath(); g.arc(980, 90, 210, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(60, 1330, 170, 0, Math.PI * 2); g.stroke();
  // 로고
  g.save(); g.translate(72, 56); g.scale(1.2, 1.2);
  g.save(); g.translate(0, 14.8); g.scale(0.6, 0.6);
  for (const tile of LOGO_TILES) { g.fillStyle = tile.on ? C.head : C.pill; rr(tile.c * 26, tile.r * 26, 22, 22, 6); g.fill(); }
  g.restore(); g.translate(-29.6, 0); g.fillStyle = C.head; LOGO_GLYPHS.forEach(x => g.fill(new Path2D(x.d))); g.restore();
  g.fillStyle = C.sub; g.font = `600 30px ${FK}`; g.fillText(dateLong(), 72, 178);
  if (opts.loginId) {
    g.font = `700 30px ${FE}`;
    const tw = g.measureText(opts.loginId).width + 48;
    g.fillStyle = C.pill; rr(W - 72 - tw, 84, tw, 60, 30); g.fill();
    g.fillStyle = C.head; g.textAlign = 'center'; g.fillText(opts.loginId, W - 72 - tw / 2, 125); g.textAlign = 'left';
  }
  // 흰 카드 + 점수
  g.fillStyle = C.card; rr(56, 222, W - 112, 1010, 56); g.fill();
  g.fillStyle = C.ink; g.font = `800 124px ${FE}`;
  const sc = R.total.toLocaleString(); g.fillText(sc, 108, 362);
  const sw = g.measureText(sc).width; g.font = `800 44px ${FK}`; g.fillText('점', 118 + sw, 360);
  const stat = (label: string, val: string, y: number) => {
    g.textAlign = 'right'; g.font = `800 40px ${FE}`; g.fillStyle = C.ink; g.fillText(val, 964, y);
    const vw = g.measureText(val).width; g.fillStyle = C.ink3; g.fillText(label, 964 - vw - 16, y);
  };
  stat('TIME', fmtTime(R.sec), 312); stat('COMBO', String(R.maxCombo), 364);
  g.textAlign = 'left';
  // 판: 단어는 숨기고 어떻게 풀었는지만
  const set = new Set(opts.cells), missed = new Set(R.cells.missed);
  const size = 54, gap = 6, gw = N * size + (N - 1) * gap, ox = (W - gw) / 2, oy = 418;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const k = `${r},${c}`;
    if (!set.has(k)) continue;
    const lk = R.cells.locked[k];
    g.fillStyle = lk === 'j' || lk === 'p' ? C.joker : missed.has(k) ? C.miss : C.combo;
    rr(ox + c * (size + gap), oy + r * (size + gap), size, size, 12); g.fill();
  }
  // 범례
  const leg: [string, string][] = [[C.combo, 'combo'], [C.miss, 'miss'], [C.joker, 'joker']];
  g.font = `700 28px ${FE}`;
  const widths = leg.map(l => 34 + g.measureText(l[1]).width);
  let lx = (W - (widths.reduce((a, b) => a + b, 0) + 40 * (leg.length - 1))) / 2;
  leg.forEach((l, i) => { g.fillStyle = l[0]; rr(lx, 1162, 22, 22, 6); g.fill(); g.fillStyle = C.ink2; g.fillText(l[1], lx + 34, 1183); lx += widths[i] + 40; });
  // 아래
  g.fillStyle = C.head; g.font = `500 32px ${FK}`; g.fillText(TAGLINE, 72, 1296);
  g.fillStyle = C.sub; g.font = `600 26px ${FE}`; g.textAlign = 'right'; g.fillText(SITE_URL.replace(/^https?:\/\//, ''), W - 72, 1296); g.textAlign = 'left';
  return cv;
}

export const shareText = (s: Summary) => `퍼즐보카 · ${s.total.toLocaleString()}점 · ${fmtTime(s.sec)}\n${TAGLINE} 👉 ${SITE_URL}`;
