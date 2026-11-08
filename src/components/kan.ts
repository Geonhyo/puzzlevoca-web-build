/**
 * 칸 친구들 전신 렌더러 (프로토타입 그대로, viewBox 0 0 100 120). view: front | q (3/4) | side | back
 * 일러스트 고유 색은 그림 데이터라 디자인 토큰이 아닌 여기에 둔다.
 * 아바타는 정면 상반신을 원 안에 담는다 (avatarSvg).
 */
type View = 'front' | 'q' | 'side' | 'back';
type Expr = 'base' | 'happy' | 'sleepy' | 'wow' | 'small';
interface Geo { hx: number; hw: number; tx: number; tw: number; legs: [number, number][]; cx: number; eyeL?: number | null; eyeR?: number; arms: [number, number][]; farArm?: [number, number] }
interface Kan {
  name: string; desc: string;
  col: { head: string; body: string; leg: string; legDark?: string; dark: string; arm?: string };
  face: (view: View, g: Geo, ex: Expr) => string;
  ears?: (view: View, g: Geo, layer: 'under' | 'over') => string;
  top?: (view: View, g: Geo) => string;
  behind?: (view: View, g: Geo) => string;
  belly?: (view: View, g: Geo) => string;
  backHead?: (g: Geo) => string;
  backBody?: (g: Geo) => string;
}

const INK = '#4a3631';
const S = `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;
const p = (d: string, f = 'none', extra = '') => `<path d="${d}" fill="${f}" ${S} ${extra}/>`;
const e = (cx: number, cy: number, rx: number, ry: number, f: string, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${S} ${extra}/>`;
const rr = (x: number, y: number, w: number, h: number, r: number, f: string, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}" ${S} ${extra}/>`;
const dot = (cx: number, cy: number, rx = 1.9, ry = 2.4) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${INK}"/><circle cx="${cx + 0.7}" cy="${cy - 0.9}" r=".7" fill="#fff"/>`;
const cheek = (pts: [number, number][]) => `<g filter="url(#blur)" fill="#ff9fae" opacity=".7">${pts.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.6" ry="2.4"/>`).join('')}</g>`;
const line = (d: string, w = 1.5, c = INK) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

const G: Record<View, Geo> = {
  front: { hx: 24, hw: 52, tx: 33, tw: 34, legs: [[36, 0], [53, 0]], cx: 50, eyeL: 39, eyeR: 61, arms: [[31, -1], [69, 1]] },
  q: { hx: 25, hw: 50, tx: 35, tw: 32, legs: [[39, -1.5], [53, 0]], cx: 57, eyeL: 48, eyeR: 66, arms: [[71, 1]], farArm: [34, -1] },
  side: { hx: 31, hw: 40, tx: 38, tw: 26, legs: [[41, -1.5], [49, 0]], cx: 64, eyeL: null, eyeR: 62, arms: [[51, 1]] },
  back: { hx: 24, hw: 52, tx: 33, tw: 34, legs: [[36, 0], [53, 0]], cx: 50, arms: [[31, -1], [69, 1]] },
};
const legsSvg = (g: Geo, c: string, dark: string) => g.legs.map(([x, far]) => rr(x, 85 + far, 11, 13, 5.5, far ? dark : c)).join('');
const armsSvg = (g: Geo, c: string) => g.arms.map(([x, s]) => e(x, 75, 4.6, 7, c, `transform="rotate(${s * 22} ${x} 75)"`)).join('');

function figure(ch: Kan, view: View, expr: Expr = 'base') {
  const g = G[view], c = ch.col;
  let back = '', mid = '', front = '';
  if (g.farArm) back += e(g.farArm[0], 75, 4, 6.5, c.dark, `transform="rotate(-22 ${g.farArm[0]} 75)"`);
  back += ch.behind ? ch.behind(view, g) : '';
  mid += legsSvg(g, c.leg, c.legDark || c.leg);
  mid += rr(g.tx, 58, g.tw, 33, 13, c.body);
  if (ch.belly && view !== 'back') mid += ch.belly(view, g);
  if (ch.backBody && view === 'back') mid += ch.backBody(g);
  mid += armsSvg(g, c.arm || c.body);
  mid += ch.ears ? ch.ears(view, g, 'under') : '';
  mid += rr(g.hx, 20, g.hw, 44, 15, c.head);
  if (view === 'q') mid += line(`M${g.hx + 8} 23c-2.5 12-2.5 26 0 38`, 1.2, 'rgba(74,54,49,.35)');
  front += ch.ears ? ch.ears(view, g, 'over') : '';
  if (view !== 'back') front += ch.face(view, g, expr);
  else front += ch.backHead ? ch.backHead(g) : '';
  front += ch.top ? ch.top(view, g) : '';
  return `<g filter="url(#rough)">${back}${mid}${front}</g>`;
}
const defs = `<defs><filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".3" numOctaves="1" seed="5"/><feDisplacementMap in="SourceGraphic" scale=".9"/></filter><filter id="blur"><feGaussianBlur stdDeviation="1"/></filter></defs>`;

const eyesStd = (g: Pick<Geo, 'eyeL' | 'eyeR'>, _view: View, ex: Expr) => {
  const xs = [g.eyeL, g.eyeR].filter((x): x is number => typeof x === 'number');
  if (ex === 'happy') return xs.map(x => line(`M${x - 2.6} 44q2.6-3 5.2 0`, 1.8)).join('');
  if (ex === 'sleepy') return xs.map(x => line(`M${x - 2.6} 43.5q2.6 2.4 5.2 0`, 1.6)).join('');
  if (ex === 'wow') return xs.map(x => `<circle cx="${x}" cy="43" r="3.2" fill="${INK}"/><circle cx="${x + 1}" cy="41.8" r="1.1" fill="#fff"/>`).join('');
  return xs.map(x => dot(x, 43)).join('');
};
const cheeks = (g: Geo, view: View) => cheek(view === 'side' ? [[57, 50]] : view === 'q' ? [[g.eyeL! - 4, 50], [g.eyeR! + 4, 50]] : [[g.eyeL! - 5, 50], [g.eyeR! + 5, 50]]);

export const KAN: Record<string, Kan> = {
  bbi: {
    name: '삐칸', desc: '부지런쟁이', col: { head: '#fff0a8', body: '#fff0a8', leg: '#ffc685', legDark: '#f2ad63', dark: '#f3dc86', arm: '#fff0a8' },
    face(view, g, ex) {
      const bx = view === 'side' ? 70 : g.cx;
      const beak = view === 'side' ? p('M70 47l6.5 2.2-6.5 2.4z', '#ffc685')
        : ex === 'wow' ? p(`M${bx - 3.4} 48.5l3.4-2 3.4 2-3.4 4.2z`, '#ffc685') + line(`M${bx - 3} 49.6h6`, 1.1)
          : p(`M${bx - 3.4} 49l3.4-2.2 3.4 2.2-3.4 2.2z`, '#ffc685');
      return eyesStd(g, view, ex) + cheeks(g, view) + beak + (ex === 'happy' ? line('M78 30l3-2M80 35l3.5-.2M77 25l1.5-3', 1.3) : '');
    },
    top(view, g) { // 머리 위 알껍데기
      const x0 = g.hx + 4, w = g.hw - 8, n = view === 'side' ? 4 : 6, st = w / n;
      let d = `M${x0} 25`;
      for (let i = 0; i < n; i++) d += `l${st / 2} ${i % 2 ? -4.5 : -6}l${st / 2} ${i % 2 ? 4 : 5}`;
      d += `V28q-${w / 2} 4-${w} 0z`;
      return p(d, '#fffdf6');
    },
    behind(view) { return view === 'back' || view === 'side' ? p(`M${view === 'side' ? 37 : 47} 86l-3 4 4-.6 1 3.6 2-3.6`, '#fff0a8') : ''; },
    belly() { return ''; },
  },
  nyang: {
    name: '냥칸', desc: '낮잠 장인', col: { head: '#fbf1e4', body: '#fbf1e4', leg: '#fbf1e4', legDark: '#efe0cc', dark: '#efe0cc' },
    ears(view, g, layer) {
      if (layer !== 'under') return '';
      const L = g.hx + 4, R = g.hx + g.hw - 4;
      if (view === 'side') return p(`M${g.hx + 12} 24l3-13 9 10z`, '#fbf1e4') + p(`M${g.hx + 15} 21l1.5-6 4 4.5z`, '#f6c9cf', 'stroke-width="0"');
      return p(`M${L} 26l1.5-14 9.5 9z`, '#fbf1e4') + p(`M${R} 26l-1.5-14-9.5 9z`, '#fbf1e4');
    },
    face(view, g, ex) {
      const nx = view === 'side' ? 70.5 : g.cx;
      const st = view === 'side' ? '' : line(`M${g.cx - 4} 25l1.5 3.4M${g.cx} 24.2v3.6M${g.cx + 4} 25l-1.5 3.4`, 2, '#e39b5b');
      const wh = view === 'front' ? line('M17 47l7 .8M76 47.8l7-.8', 1.2) : view === 'q' ? line('M76 48l7-.8', 1.2) : line('M70 50l8 .5', 1.2);
      return eyesStd(g, view, ex === 'base' ? 'sleepy' : ex) + cheeks(g, view) + st + `<ellipse cx="${nx}" cy="48.3" rx="1.6" ry="1.1" fill="#f0889a"/>` + line(`M${nx - 2.4} 50.2q1.2 1.4 2.4 0q1.2 1.4 2.4 0`, 1.3) + wh;
    },
    backHead() { return line('M45 26l1.5 3.5M50 25v3.8M55 26l-1.5 3.5M44 33l2 3M56 33l-2 3', 2, '#e39b5b'); },
    behind(view) {
      if (view === 'front') return p('M66 86c10 0 12-9 9-13', 'none', 'stroke-width="3.6" stroke="#4a3631"') + line('M66 86c10 0 12-9 9-13', 2, '#fbf1e4');
      const x = view === 'back' ? 50 : 38;
      return p(`M${x} 84c-10 2-14-6-9-12`, 'none', 'stroke-width="4.6"') + line(`M${x} 84c-10 2-14-6-9-12`, 2.6, '#fbf1e4');
    },
  },
  to: {
    name: '토칸', desc: '수다쟁이', col: { head: '#fffaf5', body: '#fffaf5', leg: '#fffaf5', legDark: '#f1e8e2', dark: '#f1e8e2' },
    ears(view, g, layer) {
      if (layer !== 'under') return '';
      if (view === 'side') return p('M40 24c-6-9-6-18-2-19s7 9 7 19z', '#fcd9dd');
      const L = g.hx + 12, R = g.hx + g.hw - 14;
      return p(`M${L - 4} 24c-3-9-2-18 2-18.5s6 9 5 18.5z`, '#fcd9dd') + p(`M${R} 24c1-7 6-11 12-10c3.5 1 2.5 5.5-2 6.5c-3.5 1-7 2-7 3.5`, '#fcd9dd');
    },
    face(view, g, ex) {
      const mx = view === 'side' ? 68 : g.cx;
      return eyesStd(g, view, ex === 'base' ? 'wow' : ex) + cheeks(g, view) + line(`M${mx - 3} 49q3 2.4 6 0`, 1.5) + (view === 'side' ? '' : rr(mx - 1.4, 50.2, 2.8, 2.6, 0.6, '#fff', 'stroke-width="1"'));
    },
    behind(view) { return view === 'back' ? e(50, 82, 5.5, 5, '#fffaf5') : view === 'side' ? e(37, 80, 4.5, 4.2, '#fffaf5') : ''; },
  },
  gom: {
    name: '곰칸', desc: '든든한 맏형', col: { head: '#e3c2a2', body: '#e3c2a2', leg: '#d6b08c', legDark: '#c99f7a', dark: '#d1ab88' },
    ears(view, g, layer) {
      if (layer !== 'under') return '';
      if (view === 'side') return e(44, 22, 6, 6, '#e3c2a2') + '<circle cx="44" cy="22" r="2.8" fill="#fbeedd"/>';
      return e(g.hx + 4, 23, 6.5, 6.5, '#e3c2a2') + e(g.hx + g.hw - 4, 23, 6.5, 6.5, '#e3c2a2') + `<circle cx="${g.hx + 4}" cy="23" r="3" fill="#fbeedd"/><circle cx="${g.hx + g.hw - 4}" cy="23" r="3" fill="#fbeedd"/>`;
    },
    face(view, g, ex) {
      const mx = view === 'side' ? 69 : g.cx;
      const muz = view === 'side' ? p('M64 44c6 0 10 2 10 6s-5 5-10 4z', '#fbeedd') : e(mx, 50, 7.5, 5.5, '#fbeedd', 'stroke-width="1.2"');
      const brow = view === 'side' ? line('M58 38.5l4 .4', 1.2) : line(`M${g.eyeL! - 2.5} 38.5l4-.5M${g.eyeR! - 1.5} 38l4 .5`, 1.2);
      return eyesStd(g, view, ex === 'base' ? 'small' : ex).replace(/rx="1.9" ry="2.4"/g, 'rx="1.6" ry="1.8"') + brow + muz + `<ellipse cx="${view === 'side' ? 73 : mx}" cy="48" rx="2.2" ry="1.6" fill="${INK}"/>` + (view === 'side' ? '' : line(`M${mx} 49.5v1.8M${mx - 2.2} 52.2q2.2 1 4.4 0`, 1.2)) + cheeks(g, view);
    },
    belly(view, g) { return view === 'side' ? '' : e(g.tx + g.tw / 2 + (view === 'q' ? 2 : 0), 79, 10, 9, '#fbeedd', 'stroke-width="1.2"'); },
    behind(view) { return view === 'back' ? e(50, 83, 4.5, 4, '#d6b08c') : view === 'side' ? e(37, 81, 4, 3.6, '#d6b08c') : ''; },
  },
  meong: {
    name: '멍칸', desc: '응원단장', col: { head: '#fffaf5', body: '#fffaf5', leg: '#fffaf5', legDark: '#f1e8e2', dark: '#f1e8e2' },
    ears(view, g, layer) {
      if (layer !== 'over') return '';
      if (view === 'side') return p('M44 24c-6 1-8 11-5 15 2 2.5 5 1 5.5-2', '#d9b38e');
      if (view === 'back') return p('M25 25c-5 0-7 9-4 13.5 2 2.6 5 1 5.5-2', '#d9b38e') + p('M75 25c5 0 7 9 4 13.5-2 2.6-5 1-5.5-2', '#d9b38e');
      const L = g.hx + 1.5, R = g.hx + g.hw - 1.5;
      return p(`M${L} 25c-5 0-7 9-4 13.5 2 2.6 5 1 5.5-2`, '#d9b38e') + (view === 'q' ? '' : p(`M${R} 25c5 0 7 9 4 13.5-2 2.6-5 1-5.5-2`, '#d9b38e'));
    },
    face(view, g, ex) {
      const mx = view === 'side' ? 70 : g.cx;
      const patch = view === 'side' ? '' : `<ellipse cx="${g.eyeR}" cy="42.5" rx="5.6" ry="5" fill="#f3e2cb"/>`;
      return patch + eyesStd(g, view, ex) + cheeks(g, view) + `<ellipse cx="${mx}" cy="47.6" rx="2" ry="1.4" fill="${INK}"/>` + line(`M${mx - 3} 50q1.5 1.6 3 0q1.5 1.6 3 0`, 1.3) + (ex === 'sleepy' ? '' : p(`M${mx - 0.6} 51c0 3 2.6 3 2.6 0`, '#f0889a', 'stroke-width="1.1"'));
    },
    backHead() { return '<ellipse cx="58" cy="34" rx="7" ry="5.5" fill="#f3e2cb"/>'; },
    behind(view) {
      const x = view === 'side' ? 37 : 50, y = view === 'front' || view === 'q' ? 0 : 1;
      return y ? p(`M${x} 80c-4-4-4-10-1-12`, 'none', 'stroke-width="5"') + line(`M${x} 80c-4-4-4-10-1-12`, 3, '#fffaf5') + line(`M${x - 8} 68l-2.5-2M${x - 9} 73h-3`, 1.2) : '';
    },
  },
  peng: {
    name: '펭칸', desc: '단어 수집가', col: { head: '#b9c6ea', body: '#b9c6ea', leg: '#ffd07a', legDark: '#f2bd62', dark: '#a6b4dc', arm: '#b9c6ea' },
    face(view, g, ex) {
      if (view === 'side') return p('M56 30c8-2 14 4 14 14s-6 16-14 16z', '#fffaf2', 'stroke-width="0"') + dot(62, 42, 1.4, 1.6) + e(62, 42, 4.2, 4.2, 'none', 'stroke-width="1.1"') + p('M70 46l6 2-6 2.2z', '#ffd07a');
      const cx = g.cx;
      const mask = p(`M${cx} 29c-5-2.5-13 0-13 8.5 0 7.5 6 13 13 13s13-5.5 13-13c0-8.5-8-11-13-8.5z`, '#fffaf2', 'stroke-width="0"');
      const gl = [g.eyeL! + 1, g.eyeR! - 1].map(x => e(x, 42, 4.3, 4.3, 'none', 'stroke-width="1.1"')).join('') + line(`M${g.eyeL! + 5.3} 42h${g.eyeR! - g.eyeL! - 10.6}`, 1.1);
      const ey = ex === 'base' ? [g.eyeL! + 1, g.eyeR! - 1].map(x => `<circle cx="${x}" cy="42" r="1.3" fill="${INK}"/>`).join('') : eyesStd({ eyeL: g.eyeL! + 1, eyeR: g.eyeR! - 1 }, view, ex);
      return mask + ey + gl + p(`M${cx - 2.2} 47h4.4l-2.2 2.6z`, '#ffd07a') + cheeks(g, view);
    },
    top(view, g) { return view === 'back' ? '' : p(`M${g.tx - 2} 60c6 3 ${g.tw - 4} 3 ${g.tw + 4} 0l-1 4.5c-6 2.5-${g.tw - 6} 2.5-${g.tw + 2} 0z`, '#f6a2a2'); },
    belly(view, g) { return view === 'side' ? p('M58 66c4 4 4 18 0 22', '#fffaf2', 'stroke-width="0"') : e(g.tx + g.tw / 2 + (view === 'q' ? 3 : 0), 78, 10, 11, '#fffaf2', 'stroke-width="0"'); },
    backHead() { return p('M27 60c6 4 40 4 46 0l-1 4.5c-7 2.5-37 2.5-44 0z', '#f6a2a2') + p('M64 62l4 10 4-2-3-8', '#f6a2a2'); },
  },
};

/** 아바타 번호(DB avatar 0~5) 순서 */
export const KAN_ORDER = ['bbi', 'nyang', 'to', 'gom', 'meong', 'peng'] as const;
export const AVA_BG: Record<string, string> = { bbi: '#e1efe0', nyang: '#f6e9df', to: '#fbe3e3', gom: '#e2ecf3', meong: '#f7ecd2', peng: '#e6e4f2' };

/** 아바타: 정면 상반신을 원 안에 (uid 로 필터/클립 id 를 페이지 안에서 겹치지 않게) */
export function avatarInner(index: number, uid: string) {
  const key = KAN_ORDER[index] ?? KAN_ORDER[0];
  const fig = figure(KAN[key], 'front').replace(/url\(#(rough|blur)\)/g, `url(#$1${uid})`);
  return `${defs.replace(/id="(rough|blur)"/g, `id="$1${uid}"`)}<clipPath id="c${uid}"><circle cx="50" cy="46" r="41"/></clipPath><circle cx="50" cy="46" r="41" fill="${AVA_BG[key]}"/><g clip-path="url(#c${uid})">${fig}</g>`;
}
