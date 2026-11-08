'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar } from './Avatar';
import { IconBell, IconCheck, IconChev, IconClose, IconHelp, IconRank, IconShare } from './icons';
import { Logo } from './Logo';
import type { Me, Position, RankRow } from '@/lib/api';
import { TAGLINE } from '@/lib/config';
import { untilMidnight, weekdayIdx } from '@/lib/kst';
import { ratingView, tierCls } from '@/lib/rating-view';
import { useApp } from '@/state/app';
import type { CellResult } from '@/shared/game-core';
import { ladder, nextStep, TIER_META, tierLabel, tierShort, type Tier } from '@/shared/rating';

/* ─── 상단 바 ─── */
function TierBadge({ me }: { me: Me }) {
  const { badgeOverride } = useApp();
  if (badgeOverride) return <span className={`s-tb ${tierCls(badgeOverride.tier)}`}>{tierShort(badgeOverride)}</span>;
  const v = ratingView(me);
  if (v.placing) return <span className="s-tb t-none">?</span>;
  return <span className={`s-tb ${tierCls(v.tier)}`}>{tierShort(v)}</span>;
}

export function Header() {
  const { me, ready, openSheet } = useApp();
  const path = usePathname();
  const pill = me ? (
    <Link href="/profile" className="s-ava" aria-label="프로필"><Avatar index={me.user.avatar} size={36} /><TierBadge me={me} /></Link>
  ) : (
    <button type="button" className="s-pill" onClick={() => openSheet('login')} style={ready ? undefined : { visibility: 'hidden' }}>로그인</button>
  );
  const back = path !== '/' ? <Link href="/" className="s-back" aria-label="닫기"><IconClose /></Link> : null;
  const brand = <Link href="/" className="s-brand" aria-label="퍼즐보카 홈"><Logo /></Link>;
  return (
    <>
      <p className="s-band">{TAGLINE}</p>
      <header className="s-appbar">
        <div className="s-abRow">
          <div className="s-abL">{back}{brand}</div>
          <div className="s-abR">
            <Link href="/ranking" className="s-ib" aria-label="일일 랭킹"><IconRank /></Link>
            <button type="button" className="s-ib" aria-label="도움말" onClick={() => openSheet('help')}><IconHelp /></button>
            {pill}
          </div>
        </div>
      </header>
      <nav className="s-nav" aria-label="주 메뉴">
        <div className="s-navIn">
          <div className="s-abL">{back}{brand}</div>
          <span className="s-navTag">{TAGLINE}</span>
          <div className="s-links">
            <Link href="/ranking" className="s-link">일일 랭킹</Link>
            <button type="button" className="s-link" onClick={() => openSheet('help')}>도움말</button>
            <Link href="/ranking" className="s-ib s-navIco" aria-label="일일 랭킹"><IconRank /></Link>
            <button type="button" className="s-ib s-navIco" aria-label="도움말" onClick={() => openSheet('help')}><IconHelp /></button>
            {pill}
          </div>
        </div>
      </nav>
    </>
  );
}

/* ─── 미니 보드: 단어는 숨기고 칸 모양(과 결과 색)만 ─── */
export function MiniBoard({ size, cells, result }: { size: number; cells: string[]; result?: CellResult | null }) {
  const set = new Set(cells);
  const missed = new Set(result?.missed ?? []);
  const items = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const k = `${r},${c}`;
    if (!set.has(k)) { items.push(<i key={k} />); continue; }
    const lk = result?.locked[k];
    items.push(<i key={k} className={!result ? 'on' : lk === 'j' || lk === 'p' ? 'jk' : missed.has(k) ? 'ms' : 'ok'} />);
  }
  return <div className="s-mini" style={{ ['--n' as string]: size }} role="img" aria-label={result ? '오늘 내 결과 판, 단어는 숨김' : '오늘 퍼즐 판 모양'}>{items}</div>;
}

/* ─── 다음 퍼즐까지 ─── */
export function Countdown({ className = 's-count' }: { className?: string }) {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    setT(untilMidnight());
    const id = setInterval(() => setT(untilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);
  return <div className={className} suppressHydrationWarning>{t ?? untilMidnight()}</div>;
}

export function NotifyButton() {
  const { me, openSheet, updateMe } = useApp();
  if (me?.user.notifyEnabled) return <span className="btn sm line s-auto" style={{ gap: 6, color: 'var(--color-brand-dark)' }}><IconCheck />알림 켜짐</span>;
  const on = () => {
    if (!me) openSheet('login', 'notify');
    else if (me.user.email) updateMe({ notifyEnabled: true }).catch(() => {});
    else openSheet('notify');
  };
  return <button type="button" className="btn sm line s-auto" style={{ gap: 6 }} onClick={on}><IconBell />알림 받기</button>;
}

export function NextRow({ withBtn, bare }: { withBtn: boolean; bare?: boolean }) {
  return (
    <div className={`s-between${bare ? '' : ' s-next'}`}>
      <div><span className="s-label">다음 퍼즐까지</span><Countdown /></div>
      {withBtn ? <NotifyButton /> : null}
    </div>
  );
}

/* ─── 연속 학습 ─── */
export function StreakCard({ me, withNext }: { me: Me; withNext: boolean }) {
  const ti = weekdayIdx();
  return (
    <section className="s-card s-stack">
      <div className="s-stk">
        <div className="s-stTop"><span><b>{me.stats.streakDays}일</b> 연속</span><span>누적 단어 <b>{me.stats.learnedWords}개</b></span></div>
        <div className="s-week" aria-label="이번 주 학습 기록">
          {'월화수목금토일'.split('').map((d, i) => {
            const done = me.stats.week[i];
            return <div key={d} className={`${done ? 'd' : ''}${i === ti ? ' t' : ''}`}><span>{d}</span><i>{done ? <IconCheck /> : null}</i></div>;
          })}
        </div>
      </div>
      {withNext ? <NextRow withBtn /> : null}
    </section>
  );
}

export function LoginCard({ done }: { done: boolean }) {
  const { openSheet } = useApp();
  return (
    <section className="s-card s-stack" style={{ gap: 14 }}>
      <div className="s-lc">
        <div className="s-lcText">
          <h2 className="s-h2">{TAGLINE}</h2>
          <p className="s-note">{done ? '로그인하면 오늘부터 연속 학습이 쌓이고 순위에도 올라가요.' : '매일 조금씩 풀다 보면 모르던 단어가 어느새 내 것이 돼요.'}</p>
        </div>
        <button type="button" className="s-goLink" onClick={() => openSheet('login')}>로그인하고 매일 이어가기<IconChev /></button>
      </div>
      {done ? <NextRow withBtn={false} /> : null}
    </section>
  );
}

/* ─── 랭킹 행 ─── */
const tierText = (t: Tier | null, div: number) => (t ? tierLabel({ tier: t, div }) : '배치 중');

export function RankLine({ no, id, score, tier, div, extra }: { no: number; id: string; score: number; tier: Tier | null; div: number; extra?: string }) {
  return (
    <div className={`s-rank ${extra ?? ''}`}>
      <span className="no">{no}</span>
      <div className="id"><span>{id}</span><span className={`s-tier ${tierCls(tier)}`}>{tierText(tier, div)}</span></div>
      <div className="sc">{score.toLocaleString()}</div>
    </div>
  );
}

export function MeRankLine({ me, extra = 'me' }: { me: Me; extra?: string }) {
  const play = me.today.play!;
  const v = ratingView(me);
  const pos = me.today.position;
  return <RankLine no={pos?.rank ?? 1} id={me.user.loginId} score={play.total} tier={v.placing ? null : v.tier} div={v.placing ? 3 : v.div} extra={extra} />;
}

export const topLines = (rows: RankRow[]) =>
  rows.map((x, i) => <RankLine key={`${x.loginId}${i}`} no={x.rank} id={x.loginId} score={x.score} tier={x.tier} div={x.div} extra={x.rank <= 3 ? `m${x.rank}` : ''} />);

/* ─── 티어 진행 막대 ─── */
export function TierBar({ me, big }: { me: Me; big?: boolean }) {
  const v = ratingView(me);
  if (v.placing) {
    const t = v.tier ? <b className={tierCls(v.tier).replace('t-', 'tx-')}>{TIER_META[v.tier].label}{v.done ? ' 3' : ''}</b> : <b>—</b>;
    return (
      <div className="s-tbar" aria-label="배치고사 진행도">
        <div className="lbl"><b>{v.done ? '배치 완료' : `배치고사 ${v.n}/3일`}</b><span>{big ? '' : <>{v.done ? '시작 티어' : '예상 티어'} {t}</>}</span></div>
        <div className="s-place">{[0, 1, 2].map(i => <i key={i} className={i < v.n ? 'on' : ''} />)}</div>
        <div className="foot"><span>{v.done && v.tier ? `${TIER_META[v.tier].label} 3부터 시작해요` : v.n ? `${3 - v.n}일 더 풀면 티어가 정해져요` : '3일 동안 풀면 티어가 정해져요'}</span></div>
      </div>
    );
  }
  const f = tierFrame(v);
  return (
    <div className="s-tbar" aria-label="티어 진행도">
      <div className="lbl"><b>{f.label}</b><span>{f.next}</span></div>
      <div className="s-track"><span className="fill" style={{ width: `${f.pct}%` }} /><span className="dot" style={{ left: `${f.pct}%` }} /></div>
      <div className="foot"><TierFoot v={v} /></div>
    </div>
  );
}

/** 티어 바 위쪽(현재·다음 단계)과 채움 % */
export function tierFrame(s: { tier: Tier; div: number; lp: number }) {
  const nx = nextStep(s);
  return { label: tierLabel(s), next: nx ? tierLabel(nx) : '', pct: Math.max(0, Math.min(100, s.lp)) };
}

/** 티어 바 아래 줄: 오늘 변화 + 누적 포인트 */
function TierFoot({ v }: { v: Extract<ReturnType<typeof ratingView>, { placing: false }> }) {
  const nx = nextStep(v);
  const d = v.delta == null
    ? <span>오늘 풀면 반영돼요</span>
    : <span>오늘 <span className={v.delta >= 0 ? 's-up' : 's-dn'}>{v.delta > 0 ? '+' : v.delta < 0 ? '−' : '±'}{Math.abs(v.delta)}</span>{v.up ? ' · 승급!' : v.down ? ' · 강등' : v.guard ? ' · 강등 보호' : ''}</span>;
  return <>{d}<span className="s-pts">{ladder(v).toLocaleString()}{nx ? ` / ${(ladder(v) - v.lp + 100).toLocaleString()}` : ''}</span></>;
}

/**
 * 결과 연출용 티어 바: 위쪽과 채움은 처음(어제) 값으로 한 번만 그리고, 이후는 lib/result-anim 이 직접 움직인다.
 * 아래 줄은 오늘 값이 오면 그려지되, 연출이 페이드인할 때까지 보이지 않는다.
 */
export function AnimatedTierBar({ me, from, barRef }: { me: Me; from: { label: string; next: string; pct: number }; barRef: React.Ref<HTMLDivElement> }) {
  const [start] = useState(from);
  const v = ratingView(me);
  return (
    <div className="s-tbar" aria-label="티어 진행도" ref={barRef}>
      <div className="lbl"><b>{start.label}</b><span>{start.next}</span></div>
      <div className="s-track"><span className="fill" style={{ width: `${start.pct}%` }} /><span className="dot" style={{ left: `${start.pct}%` }} /></div>
      <div className="foot" style={{ opacity: 0 }}>{v.placing ? null : <TierFoot v={v} />}</div>
    </div>
  );
}

export function TierBig({ me }: { me: Me }) {
  const v = ratingView(me);
  if (v.placing) {
    return (
      <>
        <div className="s-tierSub">배치고사 중 · 예상 티어</div>
        <div className={`s-tierBig ${v.tier ? tierCls(v.tier).replace('t-', 'tx-') : 'tx-none'}`}>{v.tier ? TIER_META[v.tier].label : '아직 몰라요'}</div>
      </>
    );
  }
  return <div className={`s-tierBig ${tierCls(v.tier).replace('t-', 'tx-')}`}>{tierLabel(v)}</div>;
}

export function ShareButton() {
  const { openSheet } = useApp();
  return <button type="button" className="btn" onClick={() => openSheet('share')}><IconShare />친구들에게 공유하기</button>;
}

export const rankText = (p: Position | null) => (!p ? '' : p.total >= 30 ? `상위 ${p.pct}%` : `${p.total}명 중 ${p.rank}등`);
