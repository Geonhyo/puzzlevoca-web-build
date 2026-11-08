'use client';
import { useEffect, useState } from 'react';
import { Header, MeRankLine, topLines } from '@/components/site';
import { api, type Ranking } from '@/lib/api';
import { dateShort } from '@/lib/kst';
import { useApp } from '@/state/app';

export function RankingView({ initial }: { initial: Ranking | null }) {
  const { ready, me, openSheet } = useApp();
  const [data, setData] = useState(initial);
  useEffect(() => { api.ranking(101).then(setData).catch(() => {}); }, [me?.today.play?.total]); // 100명 + 나
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => setDate(dateShort()), []);

  const mine = me?.today.play ? <section className="s-card s-myRank"><MeRankLine me={me} extra="" /></section> : null;
  // 프로토타입: 내 순위는 위 카드에, 목록에는 나를 뺀 사람들만 (실제 순위 그대로). 나만 풀었으면 내 카드만.
  const others = (data?.top ?? []).filter(r => !(mine && r.isMe)).slice(0, 100);
  return (
    <div className="site" aria-busy={!ready}>
      <Header />
      <main className="s-wrap one">
        <div className="s-col">
          <div className="s-between">
            <h1 className="s-h1" style={{ margin: '4px 2px 0' }}>일일 랭킹</h1>
            <span className="s-chipDate" suppressHydrationWarning>{date ?? (data ? dateShort(Date.parse(`${data.puzzle.date}T12:00:00+09:00`)) : dateShort())}</span>
          </div>
          <div className="s-dyn" style={{ display: 'contents' }}>{mine}</div>
          {others.length ? (
            <section className="s-card s-rankList">{topLines(others)}</section>
          ) : mine ? null : (
            <section className="s-card s-stack s-emptyCard">
              <p className="s-note" style={{ fontSize: 14 }}>오늘의 랭킹이 비어 있어요</p>
            </section>
          )}
          {ready && !me ? (
            <p className="s-note" style={{ textAlign: 'center' }}><button type="button" className="s-inlineBtn" onClick={() => openSheet('login')}>로그인</button>하면 내 순위도 볼 수 있어요</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
