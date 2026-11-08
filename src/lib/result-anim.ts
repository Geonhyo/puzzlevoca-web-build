/**
 * 결과 화면 연출 (게임을 막 끝냈을 때 한 번): 점수 카운트업 → 티어 바에 오늘 포인트 반영.
 * React 가 다시 그려도 중간 상태가 덮이지 않도록, 연출용 티어 바는 처음 값으로 한 번만 그리고 여기서 DOM 을 직접 움직인다.
 */

export const prefersReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export type TierKind = 'up' | 'down' | 'same';
export interface TierFrame { label: string; next: string; pct: number }

/** 결과 화면이 그려진 시점 기준 (ms) */
export const TIMING = {
  countUp: 900,
  tierStart: 900 + 250,
  tierDur: { up: 800 + 600, down: 600 + 600, same: 700 } as Record<TierKind, number>,
  popup: { up: 2600, down: 2400, same: 2150, none: 1200, reduced: 450 },
};

const EASE_FILL = 'cubic-bezier(.4,.1,.3,1)';
const EASE_OUT = 'cubic-bezier(.2,.7,.3,1)';
const EASE_POP = 'cubic-bezier(.3,1.8,.5,1)';

/** 0 → to 를 easeOutCubic 으로. 천 단위 콤마 유지. 취소 함수를 돌려준다. */
export function countUp(el: HTMLElement, to: number, ms = TIMING.countUp) {
  let raf = 0;
  const t0 = performance.now();
  el.textContent = '0';
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(to * (1 - (1 - p) ** 3)).toLocaleString();
    if (p < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

function parts(root: HTMLElement) {
  const cur = root.querySelector<HTMLElement>('.lbl b'), next = root.querySelector<HTMLElement>('.lbl span');
  const fill = root.querySelector<HTMLElement>('.fill'), dot = root.querySelector<HTMLElement>('.dot'), foot = root.querySelector<HTMLElement>('.foot');
  return cur && next && fill && dot && foot ? { cur, next, fill, dot, foot } : null;
}

/** 오늘 반영 전(어제) 상태를 transition 없이 넣고, 리플로우 뒤 transition 을 다시 켠다 */
export function tierSetStart(root: HTMLElement, from: TierFrame) {
  const p = parts(root);
  if (!p) return;
  for (const e of [p.fill, p.dot, p.foot]) e.style.transition = 'none';
  p.fill.style.width = `${from.pct}%`;
  p.dot.style.left = `${from.pct}%`;
  p.cur.textContent = from.label;
  p.next.textContent = from.next;
  p.foot.style.opacity = '0';
  void p.fill.offsetWidth;
  for (const e of [p.fill, p.dot, p.foot]) e.style.transition = '';
}

/** 오늘 포인트 반영. onSwitch: 라벨이 새 티어로 바뀌는 순간(헤더 배지도 이때). 취소 함수를 돌려준다. */
export function tierPlay(root: HTMLElement, kind: TierKind, to: TierFrame, onSwitch: () => void) {
  const p = parts(root);
  const timers: number[] = [];
  if (!p) return () => {};
  const { cur, next, fill, dot, foot } = p;
  const alive = () => root.isConnected;
  const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(() => { if (alive()) fn(); }, ms));
  const move = (pct: number, s: number, ease: string) => {
    fill.style.transition = `width ${s}s ${ease}`;
    dot.style.transition = `left ${s}s ${ease}`;
    fill.style.width = `${pct}%`;
    dot.style.left = `${pct}%`;
  };
  const jump = (pct: number) => {
    fill.style.transition = 'none';
    dot.style.transition = 'none';
    fill.style.width = `${pct}%`;
    dot.style.left = `${pct}%`;
    void fill.offsetWidth;
  };
  const fadeFoot = () => { foot.style.transition = 'opacity .4s ease'; foot.style.opacity = '1'; };
  const switchLabels = () => { cur.textContent = to.label; next.textContent = to.next; onSwitch(); };
  const popLabel = () => {
    cur.style.display = 'inline-block';
    cur.style.transformOrigin = 'left center';
    cur.style.transition = 'none';
    cur.style.transform = 'scale(1.35)';
    cur.style.color = 'var(--color-brand)';
    void cur.offsetWidth;
    cur.style.transition = `transform .4s ${EASE_POP}`;
    cur.style.transform = 'scale(1)';
  };

  if (kind === 'up') {
    move(100, 0.8, EASE_FILL);
    at(800, () => { jump(0); switchLabels(); popLabel(); move(to.pct, 0.6, EASE_OUT); fadeFoot(); });
  } else if (kind === 'down') {
    move(0, 0.6, EASE_FILL);
    at(600, () => { jump(100); switchLabels(); move(to.pct, 0.6, EASE_OUT); fadeFoot(); });
  } else {
    fadeFoot();
    move(to.pct, 0.7, EASE_OUT);
  }
  at(TIMING.tierDur[kind] + 50, () => { fill.style.transition = ''; dot.style.transition = ''; });
  return () => timers.forEach(t => clearTimeout(t));
}
