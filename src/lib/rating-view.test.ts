import { describe, expect, it } from 'vitest';
import type { Me } from './api';
import { fmtTime, kstDate, untilMidnight } from './kst';
import { ratingView } from './rating-view';

const me = (rating: Me['rating'], pct: number | null): Me => ({
  user: { loginId: 'a', email: null, notifyEnabled: false, avatar: 0, createdAt: '' },
  rating,
  stats: { streakDays: 0, learnedWords: 0, playedCount: 0, avgScore: null, bestScore: null, week: [] },
  season: null,
  badges: [],
  today: { date: '2026-11-08', puzzleId: 1, play: pct == null ? null : ({ total: 1 } as Me['today']['play']), position: pct == null ? null : { rank: 1, total: 10, pct } },
});

describe('ratingView', () => {
  it('배치고사 중: 오늘 순위까지 넣어 예상 티어', () => {
    const v = ratingView(me({ tier: null, div: 3, lp: 0, exp: 50, placement: [20, 30] }, 10));
    expect(v).toMatchObject({ placing: true, n: 3, tier: 'gold', done: true });
  });
  it('정규: 오늘 기록이 없으면 변화 없음, 있으면 미리 반영', () => {
    const base = { tier: 'gold' as const, div: 3, lp: 62, exp: 30, placement: [] };
    expect(ratingView(me(base, null))).toMatchObject({ placing: false, lp: 62, delta: null });
    // raw = 6 + (30 - 5) * 0.9 = 28.5 → +29
    expect(ratingView(me(base, 5))).toMatchObject({ lp: 91, delta: 29, up: false });
    expect(ratingView(me({ ...base, lp: 80 }, 5))).toMatchObject({ tier: 'gold', div: 2, lp: 9, up: true });
  });
});

describe('kst', () => {
  it('KST 날짜와 자정까지 남은 시간', () => {
    expect(kstDate(Date.parse('2026-11-08T15:30:00Z'))).toBe('2026-11-09');
    expect(untilMidnight(Date.parse('2026-11-08T14:59:00Z'))).toBe('00:01:00');
    expect(fmtTime(125)).toBe('2:05');
  });
});
