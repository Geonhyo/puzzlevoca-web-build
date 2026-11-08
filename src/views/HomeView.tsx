'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { IconClock } from '@/components/icons';
import { Header, LoginCard, MeRankLine, MiniBoard, ShareButton, StreakCard, topLines } from '@/components/site';
import { api, type PuzzleShape, type Ranking } from '@/lib/api';
import { dateLong, fmtTime } from '@/lib/kst';
import { useApp } from '@/state/app';
import { replay } from '@/shared/game-core';

function RankCard({ initial }: { initial: Ranking | null }) {
  const { me, played, openSheet, result } = useApp();
  const [data, setData] = useState(initial);
  useEffect(() => { api.ranking(4).then(setData).catch(() => {}); }, [me?.today.play?.total, result?.summary.total]); // 3명 + 나
  const mine = me?.today.play ? <MeRankLine me={me} /> : null;
  // 프로토타입: 내 행을 맨 위에 두고, 아래에는 나를 뺀 상위 3명 (실제 순위 그대로)
  const others = (data?.top ?? []).filter(r => !(mine && r.isMe)).slice(0, 3);
  const rows = others.length ? topLines(others) : null;
  return (
    <>
      <section className="s-card s-rankCard">
        <div className="s-between" style={{ marginBottom: 4 }}>
          <h2 className="s-h2">일일 랭킹</h2>
          <Link href="/ranking" className="s-more">전체 보기</Link>
        </div>
        {mine}{rows}
        {!mine && !rows ? <p className="s-note s-empty">오늘의 랭킹이 비어 있어요</p> : null}
      </section>
      {!me && played ? (
        <p className="s-note" style={{ textAlign: 'center' }}><button type="button" className="s-inlineBtn" onClick={() => openSheet('login')}>로그인</button>하면 내 순위도 볼 수 있어요</p>
      ) : null}
    </>
  );
}

export function HomeView({ shape, ranking }: { shape: PuzzleShape | null; ranking: Ranking | null }) {
  const { ready, me, played, result, session, board, puzzle, puzzleError } = useApp();
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => setDate(dateLong()), []);

  const cells = useMemo(() => (board ? board.keys : shape?.cells ?? []), [board, shape]);
  const size = puzzle?.size ?? shape?.size ?? 12;
  const doing = session?.phase === 'play' && session.events.length > 0 ? session : null;
  const doingInfo = useMemo(() => {
    if (!doing || !board) return null;
    const { state } = replay(board, doing.events);
    return { done: Object.keys(state.doneWords).length, sec: Math.floor(doing.activeMs / 1000) };
  }, [doing, board]);
  const unavailable = !shape && (puzzleError || (ready && !puzzle));

  let main: React.ReactNode;
  if (!played) {
    main = (
      <section className="s-card s-stack s-play">
        <MiniBoard size={size} cells={cells} />
        {doingInfo ? <p className="s-note" style={{ textAlign: 'center' }}>풀던 중이에요 · {doingInfo.done}/{board!.words.length} 단어 · {fmtTime(doingInfo.sec)}에서 멈춤</p> : null}
        {unavailable ? <p className="s-note" style={{ textAlign: 'center' }}>오늘의 퍼즐을 준비 중이에요. 잠시 후 다시 들러주세요.</p> : null}
        <div className="s-btns">
          {unavailable ? null : <Link href="/play" className="btn">{doingInfo ? '이어서 풀기' : '시작하기'}</Link>}
        </div>
      </section>
    );
  } else {
    const s = result!.summary;
    main = (
      <section className="s-card s-stack s-play">
        <div className="s-scoreLine"><div className="s-big md">{s.total.toLocaleString()}<small>점</small></div><span className="s-clock"><IconClock />{fmtTime(s.sec)}</span></div>
        <Link href="/result" aria-label="결과 보기" className="s-miniBtn"><MiniBoard size={size} cells={cells} result={s.cells} /></Link>
        <div className="s-btns"><ShareButton /><Link href="/result" className="btn line">결과 보기</Link></div>
      </section>
    );
  }

  return (
    <div className="site" aria-busy={!ready}>
      <Header />
      <main className="s-wrap">
        <div className="s-full">
          <div className="s-title">
            <span className="s-label" suppressHydrationWarning>{date ?? (shape ? dateLong(Date.parse(`${shape.date}T12:00:00+09:00`)) : dateLong())}</span>
            <h1 className="s-h1">{played ? '오늘의 영어 퍼즐 완료!' : '오늘의 영어 퍼즐이 열렸어요'}</h1>
          </div>
        </div>
        <div className="s-col s-dyn">{main}</div>
        <div className="s-col s-dyn">
          {me ? <StreakCard me={me} withNext={played} /> : <LoginCard done={played} />}
          <RankCard initial={ranking} />
        </div>
      </main>
    </div>
  );
}
