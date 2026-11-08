'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatedTierBar, Header, NextRow, rankText, ShareButton, TierBar, tierFrame } from '@/components/site';
import { dateShort, fmtTime } from '@/lib/kst';
import { ratingView } from '@/lib/rating-view';
import { countUp, prefersReducedMotion, TIMING, tierPlay, tierSetStart, type TierKind } from '@/lib/result-anim';
import { useApp } from '@/state/app';
import { flaggedWords } from '@/shared/game-core';

/** 게임을 막 끝냈다는 표시가 이 시간 안에 찍혔을 때만 연출 (새로고침·재진입은 재생하지 않음) */
const CELEBRATE_WINDOW_MS = 10_000;
/** 로그인 유저의 오늘 기록(순위)이 이 시간 안에 안 오면 티어 연출은 건너뛴다 */
const TIER_WAIT_MS = 4_000;

export function ResultView() {
  const { ready, me, result, board, openSheet, celebrate, clearCelebrate, noPopup, setBadgeOverride } = useApp();
  const router = useRouter();
  useEffect(() => { if (ready && !result) router.replace('/'); }, [ready, result, router]);

  // ─── 연출 여부: 화면이 처음 그려질 때 한 번만 정한다 ───
  const [play] = useState(() => celebrate != null && Date.now() - celebrate < CELEBRATE_WINDOW_MS);
  const [reduced] = useState(prefersReducedMotion);
  const animate = play && !reduced;
  // 티어 연출: 로그인했고 배치고사가 끝난(어제 티어가 있는) 사람만. 시작 상태 = 어제(저장된) 티어
  const [tierFrom] = useState(() => (animate && me && me.rating.tier ? { step: { tier: me.rating.tier, div: me.rating.div }, frame: tierFrame({ tier: me.rating.tier, div: me.rating.div, lp: me.rating.lp }) } : null));
  const [tierSkipped, setTierSkipped] = useState(false);
  const t0 = useRef(0);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const popupTimer = useRef<number | null>(null);

  useEffect(() => { if (play) clearCelebrate(); }, [play, clearCelebrate]);

  const schedulePopup = (atMs: number) => {
    if (!play || noPopup) return;
    if (popupTimer.current) clearTimeout(popupTimer.current);
    popupTimer.current = window.setTimeout(() => openSheet('popup'), Math.max(0, atMs - (performance.now() - t0.current)));
  };

  // ─── 점수 카운트업 + 시작 상태 (그리기 전에) ───
  useLayoutEffect(() => {
    t0.current = performance.now();
    if (!play) return;
    if (!animate) { schedulePopup(TIMING.popup.reduced); return () => { if (popupTimer.current) clearTimeout(popupTimer.current); }; }
    const stop = scoreRef.current && result ? countUp(scoreRef.current, result.summary.total) : () => {};
    if (tierFrom && barRef.current) {
      tierSetStart(barRef.current, tierFrom.frame);
      setBadgeOverride(tierFrom.step); // 헤더 배지도 어제 티어로
    } else {
      schedulePopup(TIMING.popup.none);
    }
    return () => {
      stop();
      if (popupTimer.current) clearTimeout(popupTimer.current);
      setBadgeOverride(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 오늘 포인트 반영: 오늘 기록(순위)이 서버에서 오고, 카운트업 + 0.25초가 지나면 ───
  const todayReady = !!(me && result?.fromServer && me.today.play && me.today.position);
  useEffect(() => {
    if (!tierFrom || tierSkipped) return;
    if (!todayReady) {
      const giveUp = window.setTimeout(() => { setTierSkipped(true); setBadgeOverride(null); schedulePopup(0); }, Math.max(0, TIER_WAIT_MS - (performance.now() - t0.current)));
      return () => clearTimeout(giveUp);
    }
    const v = ratingView(me!);
    if (v.placing) { setTierSkipped(true); setBadgeOverride(null); schedulePopup(TIMING.popup.none); return; }
    const kind: TierKind = v.up ? 'up' : v.down ? 'down' : 'same';
    const startIn = Math.max(0, TIMING.tierStart - (performance.now() - t0.current));
    let cancelPlay = () => {};
    const start = window.setTimeout(() => {
      if (!barRef.current) return;
      cancelPlay = tierPlay(barRef.current, kind, tierFrame(v), () => setBadgeOverride(null));
    }, startIn);
    const end = window.setTimeout(() => setBadgeOverride(null), startIn + TIMING.tierDur[kind] + 50);
    // 팝업: 명세 시각(늦게 시작했으면 연출이 끝난 뒤)
    schedulePopup(Math.max(TIMING.popup[kind], performance.now() - t0.current + startIn + TIMING.tierDur[kind] + 50));
    return () => { clearTimeout(start); clearTimeout(end); cancelPlay(); };
  }, [todayReady, tierSkipped]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!result) return <div className="site" aria-busy="true"><Header /></div>;

  const R = result.summary;
  const flagged = board ? flaggedWords(board, R.cells) : [];
  const next = <section className="s-card"><NextRow withBtn bare /></section>;
  const tierBar = !me ? null
    : tierFrom && !tierSkipped ? <AnimatedTierBar me={me} from={tierFrom.frame} barRef={barRef} />
      : <TierBar me={me} />;

  return (
    <div className="site" aria-busy={!ready}>
      <Header />
      <main className="s-wrap s-result">
        <h1 className="s-resTitle s-full">{dateShort()} 결과</h1>
        <div className="s-col">
          <div className="s-grp">
            <section className="s-card s-score">
              <span className="s-label">오늘의 영어 퍼즐</span>
              <div className="s-big"><span ref={scoreRef}>{R.total.toLocaleString()}</span><small>점</small></div>
              <span className="s-pct">{rankText(result.position)}</span>
            </section>
            <section className="s-card s-trio">
              <div><span className="s-label">최대 콤보</span><b>{R.maxCombo}</b></div>
              <div><span className="s-label">시간</span><b>{fmtTime(R.sec)}</b></div>
              <div><span className="s-label">조커 사용</span><b>{R.jokersUsed + R.paidJokers}</b></div>
            </section>
            {me ? tierBar : <button type="button" className="btn line" onClick={() => openSheet('login')}>로그인하고 매일 이어가기</button>}
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
