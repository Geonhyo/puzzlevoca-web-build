'use client';
/**
 * 게임 화면 (목업의 게임 로직을 그대로 옮김).
 * 판정·점수는 shared/game-core 가 하고, 입력 기록(events)은 저장돼서 완료 시 서버가 다시 계산한다.
 */
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HelpRules } from '@/components/HelpRules';
import { IconJester, IconPause } from '@/components/icons';
import { api } from '@/lib/api';
import { fmtTime } from '@/lib/kst';
import { cssVar } from '@/lib/tokens';
import { useApp, type Session } from '@/state/app';
import {
  applyJoker, applyPlace, isComplete, liveScore, paidCost, replay, summarize,
  type Board, type BoardWord, type CompletedWord, type CoreState, type Dir, type GameEvent,
} from '@/shared/game-core';

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/* ─── 화면 모드: 휴대폰·세로 태블릿은 위아래로, 가로 화면은 판을 왼쪽에 ─── */
function useLayoutMode() {
  const [m, setM] = useState<{ mode: 'm' | 'd'; short: boolean }>({ mode: 'm', short: false });
  useLayoutEffect(() => {
    const f = () => {
      const W = window.innerWidth, H = window.innerHeight;
      const mode = W < 600 || H >= W * 0.95 ? 'm' : 'd';
      setM({ mode, short: mode === 'm' && H < 760 });
    };
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return m;
}

/* ─── 애니메이션 (Web Animations API — React 가 관리하는 className 을 건드리지 않음) ─── */
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function play(el: Element | null | undefined, kind: 'pop' | 'miss' | 'press' | 'nope') {
  if (!el || reduced() || !(el as HTMLElement).animate) return;
  const red = cssVar('--color-danger'), white = cssVar('--color-on-dark'), pressed = cssVar('--color-pressed');
  const K: Record<typeof kind, [Keyframe[], KeyframeAnimationOptions]> = {
    pop: [[{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.2,1.4,.4,1)' }],
    miss: [[{ transform: 'none' }, { transform: 'translateX(-3px)', backgroundColor: red, color: white, offset: 0.2 }, { transform: 'translateX(3px)', backgroundColor: red, color: white, offset: 0.6 }, { transform: 'none' }], { duration: 400, easing: 'ease' }],
    press: [[{ transform: 'scale(1)' }, { transform: 'scale(.9)', backgroundColor: pressed, offset: 0.45 }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease' }],
    nope: [[{ transform: 'none' }, { transform: 'translateX(-2px)', offset: 0.25 }, { transform: 'translateX(2px)', offset: 0.75 }, { transform: 'none' }], { duration: 300, easing: 'ease' }],
  };
  (el as HTMLElement).animate(...K[kind]);
}

interface Float { id: number; x: number; y: number; text: string; bad: boolean; combo: number }
interface WordPop { id: number; word: string; bonus: number }

export function GameView() {
  const { ready, puzzle, board, session, played, newSession } = useApp();
  const router = useRouter();
  const [init, setInit] = useState<Session | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (played) { router.replace('/result'); return; }
    if (!puzzle || !board) { router.replace('/'); return; }
    if (!init) setInit(session?.phase === 'play' && session.puzzleId === puzzle.id ? session : newSession());
  }, [ready, played, puzzle, board, session, init, newSession, router]);

  if (!init || !board) {
    return <div className="stage"><div className="app L-m"><div className="gameLoading">퍼즐을 불러오는 중이에요</div></div></div>;
  }
  return <Game key={init.puzzleId} board={board} initial={init} />;
}

function Game({ board, initial }: { board: Board; initial: Session }) {
  const { saveSession, finish, markCelebrate } = useApp();
  const router = useRouter();
  const { mode, short } = useLayoutMode();
  const N = board.size;

  // ─── 변하는 값은 ref 에, 그리고 rerender() 로 화면 갱신 ───
  const core = useRef<CoreState>(null as unknown as CoreState);
  const sess = useRef<Session>(initial);
  if (!core.current) core.current = replay(board, initial.events).state;
  const ui = useRef<{ sel: string | null; dir: Dir; joker: boolean; phase: 'play' | 'done' }>({ sel: initial.selCell, dir: initial.dir, joker: false, phase: 'play' });
  const clock = useRef<{ base: number; runStart: number | null }>({ base: initial.activeMs, runStart: null });
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick(t => t + 1), []);
  const [paused, setPaused] = useState(false);
  const [rules, setRules] = useState(false);
  const [floats, setFloats] = useState<Float[]>([]);
  const [pops, setPops] = useState<WordPop[]>([]);
  const fid = useRef(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLElement>(null);
  const cellEls = useRef<Record<string, HTMLButtonElement | null>>({});
  const keyEls = useRef<Record<string, HTMLButtonElement | null>>({});
  const [cs, setCs] = useState({ cw: 24, gap: 3 });

  const elapsed = () => clock.current.base + (clock.current.runStart != null ? Date.now() - clock.current.runStart : 0);
  const persist = useCallback(() => {
    sess.current = { ...sess.current, activeMs: clock.current.base + (clock.current.runStart != null ? Date.now() - clock.current.runStart : 0), selCell: ui.current.sel, dir: ui.current.dir };
    saveSession(sess.current);
  }, [saveSession]);

  // ─── 단어 이동 ───
  const activeWord = (): BoardWord | null => {
    const { sel, dir } = ui.current;
    if (!sel) return null;
    const i = board.cells[sel].words[dir];
    return i == null ? null : board.words[i];
  };
  const selectNext = (from: BoardWord | null) => {
    const order = board.order, s = core.current;
    const start = from ? order.indexOf(from.index) : -1;
    for (let k = 1; k <= order.length; k++) {
      const w = board.words[order[(start + k) % order.length]];
      const free = w.cells.find(c => !s.locked[c]);
      if (free) { ui.current.dir = w.dir; ui.current.sel = free; return; }
    }
    ui.current.sel = null;
  };
  const advance = (key: string) => {
    const aw = activeWord();
    if (!aw) { ui.current.sel = null; return; }
    const idx = aw.cells.indexOf(key);
    for (let k = 1; k <= aw.cells.length; k++) {
      const nk = aw.cells[(idx + k) % aw.cells.length];
      if (!core.current.locked[nk]) { ui.current.sel = nk; return; }
    }
    selectNext(aw);
  };

  // ─── 연출 ───
  const floatAt = (key: string, text: string, bad: boolean, combo = 0) => {
    const el = cellEls.current[key], wrap = wrapRef.current;
    if (!el || !wrap) return;
    const a = el.getBoundingClientRect(), b = wrap.getBoundingClientRect();
    const f: Float = { id: ++fid.current, x: a.left - b.left + a.width / 2, y: a.top - b.top - (combo ? 22 : 8), text, bad, combo };
    setFloats(v => [...v, f]);
    setTimeout(() => setFloats(v => v.filter(x => x.id !== f.id)), 1300);
  };
  const wordPops = (done: CompletedWord[]) => done.forEach(d => {
    const p: WordPop = { id: ++fid.current, word: board.words[d.index].answer, bonus: d.bonus };
    setPops(v => [...v, p]);
    setTimeout(() => setPops(v => v.filter(x => x.id !== p.id)), 1350);
  });

  // ─── 끝 ───
  const checkWin = () => {
    if (ui.current.phase !== 'play' || !isComplete(board, core.current)) return;
    const ms = elapsed();
    clock.current = { base: ms, runStart: null };
    ui.current.phase = 'done';
    ui.current.sel = null;
    const sec = Math.max(1, Math.floor(ms / 1000));
    if (timeRef.current) timeRef.current.textContent = fmtTime(sec);
    rerender();
    setTimeout(() => {
      const done: Session = { ...sess.current, activeMs: ms, phase: 'done', summary: summarize(board, core.current, sec) };
      sess.current = done;
      finish(done);
      markCelebrate(); // 결과 화면이 연출을 한 번 재생하고, 끝나면 알림 팝업을 띄운다
      router.push('/result');
    }, 800);
  };

  const record = (e: GameEvent) => { sess.current = { ...sess.current, events: [...sess.current.events, e] }; };

  const placeTile = (L: string, key: string) => {
    const r = applyPlace(board, core.current, key, L);
    if (!r) return;
    record({ k: 'p', c: key, l: L, t: elapsed() });
    if (r.ok) {
      advance(key);
      rerender();
      play(cellEls.current[key], 'pop');
      floatAt(key, `+${r.pts}`, false, r.combo >= 2 ? r.combo : 0);
      wordPops(r.completed);
    } else {
      rerender();
      play(cellEls.current[key], 'miss');
      play(keyEls.current[L], 'miss');
      floatAt(key, `−${r.penalty}`, true);
    }
    persist();
    checkWin();
  };

  const jokerAt = (key: string) => {
    ui.current.joker = false;
    const r = applyJoker(board, core.current, key);
    if (!r) return;
    record({ k: 'j', c: key, t: elapsed() });
    if (r.penalty) setTimeout(() => floatAt(key, `−${r.penalty}`, true), 0);
    wordPops(r.completed);
    if (ui.current.sel === key) advance(key);
    rerender();
    play(cellEls.current[key], 'pop');
    persist();
    checkWin();
  };

  const tapCell = (key: string) => {
    if (ui.current.phase !== 'play') return;
    const cell = board.cells[key], u = ui.current;
    if (u.joker) {
      if (!core.current.locked[key]) {
        u.sel = key;
        if (cell.words[u.dir] == null) u.dir = cell.words.A != null ? 'A' : 'D';
        jokerAt(key);
      }
      return;
    }
    if (u.sel === key && cell.words.A != null && cell.words.D != null) u.dir = u.dir === 'A' ? 'D' : 'A';
    else { u.sel = key; if (cell.words[u.dir] == null) u.dir = cell.words.A != null ? 'A' : 'D'; }
    rerender();
  };

  const tapTile = (L: string) => {
    if (ui.current.phase !== 'play' || !(core.current.inv[L] > 0)) return;
    ui.current.joker = false;
    // 칸 먼저, 그다음 글자: 고른 칸이 이미 차 있으면 같은 단어의 다음 빈칸에 넣는다
    let k = ui.current.sel;
    if (k && core.current.locked[k]) { const aw = activeWord(); k = aw ? aw.cells.find(c => !core.current.locked[c]) ?? null : null; if (k) ui.current.sel = k; }
    if (k && !core.current.locked[k]) placeTile(L, k); else rerender();
  };

  const tapJoker = () => {
    if (ui.current.phase !== 'play') return;
    const u = ui.current;
    if (u.joker) { u.joker = false; rerender(); return; }
    if (u.sel && !core.current.locked[u.sel]) { jokerAt(u.sel); return; }
    u.joker = true;
    rerender();
  };

  // ─── 시간 / 일시정지 ───
  const pause = useCallback(() => {
    if (ui.current.phase !== 'play' || clock.current.runStart == null) return;
    clock.current = { base: elapsed(), runStart: null };
    persist();
    setPaused(true);
  }, [persist]); // eslint-disable-line react-hooks/exhaustive-deps
  const resume = () => {
    if (clock.current.runStart != null) return;
    clock.current.runStart = Date.now();
    setPaused(false);
  };

  useEffect(() => {
    // 시작: 토큰(서버 시작 시각) 받기 + 첫 칸 선택 + 시계 시작
    if (!sess.current.token) {
      api.startPlay(sess.current.puzzleId).then(r => { sess.current = { ...sess.current, token: r.token }; persist(); }).catch(() => {});
    }
    if (!ui.current.sel || core.current.locked[ui.current.sel] || !board.cells[ui.current.sel]) selectNext(null);
    clock.current.runStart = document.hidden ? null : Date.now();
    if (document.hidden) setPaused(true);
    persist();
    rerender();
    const tick = setInterval(() => {
      if (timeRef.current && ui.current.phase === 'play') timeRef.current.textContent = fmtTime(Math.floor(elapsed() / 1000));
    }, 250);
    const onVis = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', pause);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', pause);
      // 화면을 떠나면 멈춘 상태로 저장 (홈에서 "이어서 풀기")
      if (ui.current.phase === 'play') { clock.current = { base: elapsed(), runStart: null }; persist(); }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 물리 키보드: 글자 키 = 화면 키를 누른 것과 같음
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ui.current.phase !== 'play' || paused || rules || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('.s-sheetOv')) return;
      if (e.key === 'Escape') { ui.current.joker = false; rerender(); return; }
      const L = e.key.length === 1 ? e.key.toUpperCase() : '';
      if (!/^[A-Z]$/.test(L)) return;
      e.preventDefault();
      if (!(core.current.inv[L] > 0)) { play(keyEls.current[L], 'nope'); return; }
      const before = core.current.misses;
      tapTile(L);
      if (core.current.misses === before) play(keyEls.current[L], 'press');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  // ─── 판 크기: 남은 공간에 맞춰 정사각형 칸 ───
  useLayoutEffect(() => {
    const w = wrapRef.current;
    if (!w) return;
    const size = () => {
      const pad = 10;
      const aw = w.clientWidth - pad, ah = (w.clientHeight || w.clientWidth) - pad;
      const gap = Math.min(aw, ah) > 420 ? 4 : 3;
      const c = Math.max(10, Math.min(Math.floor((aw - gap * (N - 1)) / N), Math.floor((ah - gap * (N - 1)) / N)));
      setCs(p => (p.cw === c && p.gap === gap ? p : { cw: c, gap }));
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(w);
    return () => ro.disconnect();
  }, [N, mode, short]);

  // ─── 그리기 ───
  const s = core.current, u = ui.current;
  const aw = activeWord();
  const inWord = useMemo(() => new Set(aw ? aw.cells : []), [aw]);
  const cells = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const key = `${r},${c}`, cell = board.cells[key];
    if (!cell) { cells.push(<div key={key} className="cell void" />); continue; }
    const lk = s.locked[key], m = board.mult[key];
    const cls = ['cell', m ? 'mult' : '', lk ? 'locked' : '', lk === 'j' || lk === 'p' ? 'joker' : '', lk === 'p' ? 'pjoker' : '',
      s.color[key] === 'A' ? 'cA' : '', s.color[key] === 'D' ? 'cD' : '', inWord.has(key) ? 'inword' : '', u.sel === key ? 'sel' : ''].filter(Boolean).join(' ');
    cells.push(
      <button key={key} type="button" className={cls} ref={el => { cellEls.current[key] = el; }} onClick={() => tapCell(key)}
        aria-label={`${r + 1}행 ${c + 1}열${m ? `, 점수 ${m}배 칸` : ''}${lk ? `, ${cell.ans}` : ''}`}>
        {m ? <span className="xm">×{m}</span> : null}
        <span className="L">{lk ? cell.ans : ''}</span>
      </button>,
    );
  }

  let clue: React.ReactNode;
  if (aw) {
    let pre = '', rest = '', gap = false;
    aw.cells.forEach(k => { const ch = s.locked[k] ? board.cells[k].ans : null; if (ch && !gap) pre += ch; else { gap = true; rest += ch || '_'; } });
    const [before, ...after] = aw.exampleEn.split('___');
    clue = (
      <section className="clue" aria-live="polite">
        <div className="crow"><div className="cko">{aw.meaningKo}</div><span className="tag">{aw.dir === 'A' ? '가로' : '세로'} · {aw.answer.length}글자{s.doneWords[aw.index] ? ' · 완성' : ''}</span></div>
        <div className="cex">{before}<b>{pre}</b><i>{rest}</i>{after.join('___')}</div>
      </section>
    );
  } else {
    clue = <section className="clue empty" aria-live="polite"><div className="cko">모든 단어를 완성했어요</div></section>;
  }

  const paid = s.jokers <= 0;
  return (
    <div className="stage">
      <div className={`app L-${mode}${short ? ' short' : ''}`}>
        <section className="stats" aria-label="현재 기록">
          <div className="stat">
            <button className="pauseBtn" type="button" aria-label="일시정지" onClick={pause}><IconPause /></button>
            <b ref={timeRef}>{fmtTime(Math.floor(elapsed() / 1000))}</b>
          </div>
          <div className="stat"><small className="en">COMBO</small><b>{s.combo}</b></div>
          <div className="stat"><small className="en">SCORE</small><b>{liveScore(s).toLocaleString()}</b></div>
        </section>

        {clue}

        <div className="boardWrap" ref={wrapRef}>
          <div className="boardCard">
            <div className={`board${u.joker ? ' joker-mode' : ''}`} role="grid" aria-label="퍼즐 판"
              style={{ ['--n' as string]: N, ['--cw' as string]: `${cs.cw}px`, ['--ch' as string]: `${cs.cw}px`, ['--cs' as string]: `${cs.cw}px`, ['--gap' as string]: `${cs.gap}px` }}>
              {cells}
            </div>
          </div>
          {floats.map(f => (
            <div key={f.id} className={`float${f.bad ? ' bad' : ''}`} style={{ left: f.x, top: f.y }}>
              <span className="pts">{f.text}</span>{f.combo ? <span className="cmb">COMBO {f.combo}</span> : null}
            </div>
          ))}
          {pops.map(p => <div key={p.id} className="wordPop"><b>{p.word}</b><small>+{p.bonus}</small></div>)}
        </div>

        <section className="keys" aria-label="알파벳">
          {ALPHA.map(L => {
            const n = s.inv[L] || 0;
            return (
              <button key={L} type="button" className="key" ref={el => { keyEls.current[L] = el; }} disabled={n <= 0}
                aria-label={n > 0 ? `${L}, ${n}개 남음` : `${L}, 남은 개수 없음`} onClick={() => tapTile(L)}>
                {L}{n > 0 ? <span className="badge">{n}</span> : null}
              </button>
            );
          })}
          <button type="button" className={`key jk${paid ? ' paid' : ''}${u.joker ? ' on' : ''}`} onClick={tapJoker}
            aria-label={paid ? `조커, 사용 시 ${paidCost(s.paidJokers)}점 차감` : `조커 ${s.jokers}장 남음`} aria-pressed={u.joker}>
            <IconJester /><small>JOKER</small><span className="badge">{paid ? `−${paidCost(s.paidJokers)}` : s.jokers}</span>
          </button>
        </section>

        {rules ? (
          <div className="overlay rules">
            <div className="sheet" role="dialog" aria-modal="true" aria-label="도움말">
              <div className="grab" />
              <h3>도움말</h3>
              <HelpRules />
              <button className="btn" type="button" onClick={() => setRules(false)} autoFocus>확인</button>
            </div>
          </div>
        ) : null}

        {paused ? (
          <div className="overlay pauseOv">
            <div className="pauseBox" role="dialog" aria-modal="true" aria-label="일시정지">
              <small>일시정지</small>
              <b>{fmtTime(Math.floor(clock.current.base / 1000))}</b>
              <button className="btn" type="button" onClick={resume} autoFocus>계속하기</button>
              <button className="btn line" type="button" onClick={() => setRules(true)}>도움말</button>
              <button className="pauseQuit" type="button" onClick={() => router.push('/')}>그만두기</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
