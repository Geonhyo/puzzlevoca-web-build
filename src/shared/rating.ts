/**
 * 티어 / MMR 규칙 (순수 함수).
 * 서버는 매일 정산 때 settleDay 로 확정하고, 웹은 같은 함수로 "오늘 반영될 변화"를 미리 보여준다.
 * web/src/shared 와 server/src/shared 에 똑같이 있어야 한다 (`pnpm check:shared`).
 */

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';

export const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'];

export const TIER_META: Record<Tier, { label: string; short: string; cls: string }> = {
  bronze: { label: '브론즈', short: 'B', cls: 't-brz' },
  silver: { label: '실버', short: 'S', cls: 't-sil' },
  gold: { label: '골드', short: 'G', cls: 't-gold' },
  platinum: { label: '플래티넘', short: 'P', cls: 't-plt' },
  diamond: { label: '다이아', short: 'D', cls: 't-dia' },
  master: { label: '마스터', short: 'M', cls: 't-mst' },
};

/** 상위 % 로 티어를 정하는 기준. 목표 분포 1/4/12/23/30/30 */
const PCT_CUT: [number, Tier][] = [[1, 'master'], [5, 'diamond'], [17, 'platinum'], [40, 'gold'], [70, 'silver'], [100, 'bronze']];
const GAIN: Record<Tier, number> = { bronze: 1.3, silver: 1.15, gold: 1, platinum: 0.85, diamond: 0.7, master: 0.6 };
const LOSS: Record<Tier, number> = { bronze: 0, silver: 0.8, gold: 1, platinum: 1.15, diamond: 1.3, master: 1.4 };

export const PLACEMENT_DAYS = 3;
const PLACEMENT_MAX: Tier = 'platinum'; // 배치로는 플래티넘까지만

export interface RatingState {
  tier: Tier | null; // null = 배치고사 중
  div: number; // 1~3 (1이 높음)
  lp: number; // 0~99 (마스터는 상한 없음)
  exp: number; // 기대 상위 % (MMR)
  placement: number[]; // 배치고사 날의 상위 %
}

export interface Step {
  tier: Tier;
  div: number;
}

export const tierIdx = (t: Tier) => TIERS.indexOf(t);
export const tierOfPct = (p: number): Tier => (PCT_CUT.find(c => p <= c[0]) ?? PCT_CUT[PCT_CUT.length - 1])[1];
export const tierLabel = (s: Step) => (s.tier === 'master' ? TIER_META.master.label : `${TIER_META[s.tier].label} ${s.div}`);
export const tierShort = (s: Step) => (s.tier === 'master' ? 'M' : `${TIER_META[s.tier].short}${s.div}`);

export const nextStep = (r: Step): Step | null =>
  r.tier === 'master' ? null : r.div > 1 ? { tier: r.tier, div: r.div - 1 } : { tier: TIERS[tierIdx(r.tier) + 1], div: 3 };

export const prevStep = (r: Step): Step | null =>
  r.tier === 'master'
    ? { tier: 'diamond', div: 1 }
    : r.div < 3
      ? { tier: r.tier, div: r.div + 1 }
      : r.tier === 'bronze'
        ? null
        : { tier: TIERS[tierIdx(r.tier) - 1], div: 1 };

/** 하루 순위 → 상위 % (1~100) */
export const rankPct = (rank: number, total: number) => (total > 0 ? Math.min(100, Math.max(1, Math.round((rank / total) * 100))) : 100);

/** 누적 포인트 (진행 막대 오른쪽 숫자) */
export const ladder = (s: Step & { lp: number }) => (s.tier === 'master' ? 15 : tierIdx(s.tier) * 3 + 3 - s.div) * 100 + s.lp;

export function placementTier(pcts: number[]): Tier | null {
  if (!pcts.length) return null;
  let t = tierOfPct(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  if (tierIdx(t) > tierIdx(PLACEMENT_MAX)) t = PLACEMENT_MAX;
  return t;
}

export interface DayOutcome {
  next: RatingState;
  delta: number | null; // 배치고사 중이면 null
  up: boolean;
  down: boolean;
  guard: boolean; // 강등 보호 (LP 가 0 아래로 내려갔지만 강등은 안 됨)
  placed: boolean; // 이날로 배치고사가 끝남
}

/** 하루치 결과(상위 %)를 반영한다. */
export function settleDay(r: RatingState, pct: number): DayOutcome {
  if (r.tier == null) {
    const placement = [...r.placement, pct];
    if (placement.length < PLACEMENT_DAYS) {
      return { next: { ...r, placement }, delta: null, up: false, down: false, guard: false, placed: false };
    }
    const avg = placement.reduce((a, b) => a + b, 0) / placement.length;
    return {
      next: { tier: placementTier(placement), div: 3, lp: 0, exp: Math.round(avg), placement },
      delta: null, up: false, down: false, guard: false, placed: true,
    };
  }
  const tier = r.tier;
  const raw = 6 + (r.exp - pct) * 0.9;
  const delta = (raw >= 0 ? Math.min(40, Math.round(raw * GAIN[tier])) : Math.max(-20, Math.round(raw * LOSS[tier]))) || 0; // -0 → 0
  const next: RatingState = { ...r, lp: r.lp + delta, exp: Math.round(r.exp + (pct - r.exp) * 0.2) };
  let up = false, down = false, guard = false;
  const ns = nextStep({ tier, div: r.div });
  if (next.lp >= 100 && ns) {
    next.tier = ns.tier; next.div = ns.div; next.lp -= 100; up = true;
  } else if (next.lp < 0) {
    const ps = prevStep({ tier, div: r.div });
    if (r.lp === 0 && ps) { next.tier = ps.tier; next.div = ps.div; next.lp = 75; down = true; }
    else { next.lp = 0; guard = true; }
  }
  return { next, delta, up, down, guard, placed: false };
}

export const initialRating = (): RatingState => ({ tier: null, div: 3, lp: 0, exp: 50, placement: [] });

/** 정렬된 점수 목록에서의 순위 = 나보다 점수가 높은 사람 수 + 1 */
export const rankOf = (score: number, scores: number[]) => scores.filter(s => s > score).length + 1;
