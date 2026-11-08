import type { Me } from './api';
import { PLACEMENT_DAYS, placementTier, settleDay, TIER_META, type Tier } from '@/shared/rating';

export type RatingView =
  | { placing: true; n: number; tier: Tier | null; done: boolean }
  | { placing: false; tier: Tier; div: number; lp: number; delta: number | null; up: boolean; down: boolean; guard: boolean };

/**
 * 화면에 보여줄 티어. 오늘 기록이 있으면 오늘 순위로 정산했을 때의 모습을 미리 보여준다
 * (실제 확정은 자정 정산 — 서버가 같은 settleDay 를 쓴다).
 */
export function ratingView(me: Me): RatingView {
  const r = me.rating;
  const pct = me.today.play && me.today.position ? me.today.position.pct : null;
  if (r.tier == null) {
    const pcts = pct != null ? [...r.placement, pct] : r.placement;
    return { placing: true, n: Math.min(PLACEMENT_DAYS, pcts.length), tier: placementTier(pcts), done: pcts.length >= PLACEMENT_DAYS };
  }
  if (pct == null) return { placing: false, tier: r.tier, div: r.div, lp: r.lp, delta: null, up: false, down: false, guard: false };
  const o = settleDay(r, pct);
  return { placing: false, tier: o.next.tier!, div: o.next.div, lp: o.next.lp, delta: o.delta, up: o.up, down: o.down, guard: o.guard };
}

export const tierCls = (t: Tier | null) => (t ? TIER_META[t].cls : 't-none');
export const tierTextCls = (t: Tier | null) => (t ? TIER_META[t].cls.replace('t-', 'tx-') : 'tx-none');
