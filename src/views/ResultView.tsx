'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Header, NextRow, rankText, ShareButton, TierBar } from '@/components/site';
import { dateShort, fmtTime } from '@/lib/kst';
import { useApp } from '@/state/app';
import { flaggedWords } from '@/shared/game-core';

export function ResultView() {
  const { ready, me, result, board, openSheet } = useApp();
  const router = useRouter();
  useEffect(() => { if (ready && !result) router.replace('/'); }, [ready, result, router]);
  if (!result) return <div className="site" aria-busy="true"><Header /></div>;

  const R = result.summary;
  const flagged = board ? flaggedWords(board, R.cells) : [];
  const next = <section className="s-card"><NextRow withBtn bare /></section>;

  return (
    <div className="site" aria-busy={!ready}>
      <Header />
      <main className="s-wrap s-result">
        <h1 className="s-resTitle s-full">{dateShort()} 결과</h1>
        <div className="s-col">
          <div className="s-grp">
            <section className="s-card s-score">
              <span className="s-label">오늘의 영어 퍼즐</span>
              <div className="s-big">{R.total.toLocaleString()}<small>점</small></div>
              <span className="s-pct">{rankText(result.position)}</span>
            </section>
            <section className="s-card s-trio">
              <div><span className="s-label">최대 콤보</span><b>{R.maxCombo}</b></div>
              <div><span className="s-label">시간</span><b>{fmtTime(R.sec)}</b></div>
              <div><span className="s-label">조커 사용</span><b>{R.jokersUsed + R.paidJokers}</b></div>
            </section>
            {me ? <TierBar me={me} /> : <button type="button" className="btn line" onClick={() => openSheet('login')}>로그인하고 매일 이어가기</button>}
            <ShareButton />
          </div>
          <div className="s-pcOnly">{next}</div>
        </div>
        <div className="s-col">
          <div className="s-sec">
            <h2 className="s-h3">오답노트</h2>
            <div className="panel">
              {flagged.length ? flagged.map(({ word: w, miss, joker }) => (
                <div className="word" key={w.index}>
                  <span className="w">{w.answer}</span><span className="k">{w.meaningKo}</span>
                  {miss ? <span className="tg">미스</span> : null}{joker ? <span className="tg j">조커</span> : null}
                  <div className="e">{w.exampleEn.split('___').flatMap((part, i, a) => (i < a.length - 1 ? [part, <b key={i}>{w.answer.toLowerCase()}</b>] : [part]))}</div>
                </div>
              )) : <div className="row">미스도 조커도 없었어요</div>}
            </div>
          </div>
          <div className="s-sec">
            <h2 className="s-h3">점수 내역</h2>
            <div className="panel">
              <div className="row">글자 점수<span className="v">+{R.base.toLocaleString()}</span></div>
              <div className="row">단어 완성 보너스<span className="v">+{R.wordBonus}</span></div>
              <div className="row">시간 보너스<span className="v">+{R.timeBonus}</span></div>
              {R.misses ? <div className="row">미스 {R.misses}회<span className="v">−{R.missPenalty}</span></div> : null}
              {R.paidJokers ? <div className="row">추가 조커 {R.paidJokers}회<span className="v">−{R.jokerPenalty}</span></div> : null}
              <div className="row total">합계<span className="v">{R.total.toLocaleString()}</span></div>
            </div>
          </div>
          <div className="s-mOnly">{next}</div>
        </div>
      </main>
    </div>
  );
}
