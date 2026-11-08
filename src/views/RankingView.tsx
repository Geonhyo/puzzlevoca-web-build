'use client';
import { useEffect, useState } from 'react';
import { IconShare } from '@/components/icons';
import { Header, MeRankLine, topLines } from '@/components/site';
import { api, type Ranking } from '@/lib/api';
import { dateShort } from '@/lib/kst';
import { useApp } from '@/state/app';

export function RankingView({ initial }: { initial: Ranking | null }) {
  const { ready, me, openSheet } = useApp();
  const [data, setData] = useState(initial);
  useEffect(() => { api.ranking(10).then(setData).catch(() => {}); }, [me?.today.play?.total]);
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => setDate(dateShort()), []);

  const mine = me?.today.play ? <section className="s-card s-myRank"><MeRankLine me={me} extra="" /></section> : null;
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
          {data?.top.length ? (
            <section className="s-card s-rankList">{topLines(data.top)}</section>
          ) : (
            <section className="s-card s-stack s-emptyCard">
              <p className="s-note" style={{ fontSize: 14 }}>{mine ? '아직 오늘은 나만 풀었어요' : '오늘의 랭킹이 비어 있어요'}</p>
              {mine ? <button type="button" className="btn sm line s-auto" style={{ gap: 6, padding: '0 20px' }} onClick={() => openSheet('share')}><IconShare />공유하기</button> : null}
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
