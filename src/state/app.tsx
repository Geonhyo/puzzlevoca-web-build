'use client';
/**
 * 앱 전역 상태: 로그인(me), 오늘 퍼즐, 이 기기의 플레이 기록(session), 시트.
 * - 플레이 기록은 localStorage 에 저장돼서 새로고침/앱 전환 후에도 이어서 풀 수 있다.
 * - 비로그인으로 다 풀면 기록을 들고 있다가 로그인하는 순간 서버에 제출한다.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, type Me, type Position } from '@/lib/api';
import { kstDate } from '@/lib/kst';
import { store } from '@/lib/storage';
import { buildBoard, type Board, type Dir, type GameEvent, type PuzzleData, type Summary } from '@/shared/game-core';
import type { Step } from '@/shared/rating';

export interface Session {
  v: 1;
  puzzleId: number;
  token: string | null;
  events: GameEvent[];
  activeMs: number; // 일시정지를 뺀 경과 시간
  phase: 'play' | 'done';
  summary: Summary | null;
  submitted: boolean;
  owner: string | null; // 제출한 계정
  selCell: string | null;
  dir: Dir;
}

export type SheetKind = 'login' | 'signup' | 'reset' | 'newPassword' | 'notify' | 'email' | 'popup' | 'share' | 'help' | 'avatar';
export interface SheetState { kind: SheetKind; reason?: string; prefill?: string }

export interface ResultView {
  summary: Summary;
  position: Position | null;
  fromServer: boolean;
}

interface Ctx {
  ready: boolean;
  me: Me | null;
  puzzle: PuzzleData | null;
  board: Board | null;
  puzzleError: string | null;
  session: Session | null;
  result: ResultView | null;
  played: boolean;
  noPopup: boolean;
  sheet: SheetState | null;
  refreshMe: () => Promise<Me | null>;
  authenticate: (identifier: string, password: string) => Promise<{ me: Me | null; usedTempPassword: boolean }>;
  signup: (email: string, loginId: string, password: string) => Promise<Me | null>;
  logout: () => Promise<void>;
  updateMe: (patch: Parameters<typeof api.updateMe>[0]) => Promise<Me>;
  saveSession: (s: Session) => void;
  newSession: () => Session | null;
  finish: (s: Session) => Promise<void>;
  setNoPopup: (v: boolean) => void;
  /** 게임을 막 끝낸 시각 (결과 화면 연출을 한 번만 재생하기 위한 메모리 표시, 새로고침하면 사라짐) */
  celebrate: number | null;
  markCelebrate: () => void;
  clearCelebrate: () => void;
  /** 결과 연출 중 헤더 티어 배지를 잠시 다른 단계로 보여줄 때 (null 이면 실제 값) */
  badgeOverride: Step | null;
  setBadgeOverride: (s: Step | null) => void;
  openSheet: (kind: SheetKind, reason?: string, prefill?: string) => void;
  closeSheet: () => void;
}

const AppContext = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp outside provider');
  return c;
};

const sessionKey = (puzzleId: number) => `pv:session:${puzzleId}`;
const PREF_NO_POPUP = 'pv:noPopup';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [puzzleError, setPuzzleError] = useState<string | null>(null);
  const [puzzleLoaded, setPuzzleLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [anonPosition, setAnonPosition] = useState<Position | null>(null);
  const [noPopup, setNoPopupState] = useState(false);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const [badgeOverride, setBadgeOverride] = useState<Step | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const dateRef = useRef(kstDate());
  const submitting = useRef(false);

  const board = useMemo(() => (puzzle ? buildBoard(puzzle) : null), [puzzle]);

  const refreshMe = useCallback(async () => {
    // 로그인 표시 쿠키(pv_auth)가 없으면 서버에 묻지 않는다
    if (typeof document !== 'undefined' && !/(?:^|;\s*)pv_auth=1/.test(document.cookie)) { setMe(null); setMeLoaded(true); return null; }
    try {
      const m = await api.me();
      setMe(m);
      return m;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setMe(null);
      return null;
    } finally {
      setMeLoaded(true);
    }
  }, []);

  const loadPuzzle = useCallback(async () => {
    try {
      const p = await api.puzzle();
      setPuzzle(p);
      setPuzzleError(null);
      const saved = store.get<Session>(sessionKey(p.id));
      setSession(saved?.v === 1 && saved.puzzleId === p.id ? saved : null);
      // 지난 퍼즐 기록은 정리
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k?.startsWith('pv:session:') && k !== sessionKey(p.id)) localStorage.removeItem(k);
        }
      } catch { /* noop */ }
    } catch (e) {
      setPuzzleError(e instanceof ApiError ? e.message : '퍼즐을 불러오지 못했어요');
    } finally {
      setPuzzleLoaded(true);
    }
  }, []);

  useEffect(() => {
    setNoPopupState(!!store.get<boolean>(PREF_NO_POPUP));
    refreshMe();
    loadPuzzle();
  }, [refreshMe, loadPuzzle]);

  // 자정이 지나면 새 퍼즐로 (게임 중이면 그 판은 끝까지 두고, 화면에 돌아왔을 때 바꾼다)
  useEffect(() => {
    const t = setInterval(() => {
      const d = kstDate();
      if (d !== dateRef.current && !location.pathname.startsWith('/play')) {
        dateRef.current = d;
        loadPuzzle();
        refreshMe();
      }
    }, 15_000);
    return () => clearInterval(t);
  }, [loadPuzzle, refreshMe]);

  const saveSession = useCallback((s: Session) => {
    setSession(s);
    store.set(sessionKey(s.puzzleId), s);
  }, []);

  const newSession = useCallback((): Session | null => {
    if (!puzzle) return null;
    const s: Session = { v: 1, puzzleId: puzzle.id, token: null, events: [], activeMs: 0, phase: 'play', summary: null, submitted: false, owner: null, selCell: null, dir: 'A' };
    saveSession(s);
    return s;
  }, [puzzle, saveSession]);

  /** 끝난 기록을 서버에 낸다 (로그인 상태일 때만). */
  const submit = useCallback(async (s: Session, who: Me | null) => {
    if (!who || s.phase !== 'done' || s.submitted || !s.summary || submitting.current) return;
    if (!s.token) { saveSession({ ...s, submitted: true, owner: who.user.loginId }); return; }
    submitting.current = true;
    try {
      await api.submitPlay({ token: s.token, events: s.events, elapsedSec: s.summary.sec });
      saveSession({ ...s, submitted: true, owner: who.user.loginId });
    } catch (e) {
      // 이미 기록이 있거나(다른 기기), 지난 퍼즐이거나, 검증 실패 → 이 기기 기록은 더 내지 않는다
      if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401) saveSession({ ...s, submitted: true, owner: who.user.loginId });
    } finally {
      submitting.current = false;
      await refreshMe();
    }
  }, [refreshMe, saveSession]);

  const finish = useCallback(async (s: Session) => {
    saveSession(s);
    await submit(s, me);
  }, [me, saveSession, submit]);

  // 로그인 직후/새로고침 때 아직 못 낸 기록이 있으면 제출
  useEffect(() => {
    if (me && session?.phase === 'done' && !session.submitted) submit(session, me);
  }, [me, session, submit]);

  const authenticate = useCallback(async (identifier: string, password: string) => {
    const r = await api.login(identifier, password);
    return { me: await refreshMe(), usedTempPassword: r.usedTempPassword };
  }, [refreshMe]);

  const signup = useCallback(async (email: string, loginId: string, password: string) => {
    await api.signup(email, loginId, password);
    return refreshMe();
  }, [refreshMe]);

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    // 다른 사람이 이 기기에서 로그인해도 내 기록이 넘어가지 않게, 제출한 기록은 지운다
    if (session?.submitted) { store.remove(sessionKey(session.puzzleId)); setSession(null); }
    setMe(null);
  }, [session]);

  const updateMe = useCallback(async (patch: Parameters<typeof api.updateMe>[0]) => {
    const m = await api.updateMe(patch);
    setMe(m);
    return m;
  }, []);

  // 결과: 서버 기록이 우선, 없으면 이 기기에서 끝낸 기록
  const serverPlay = me && puzzle && me.today.puzzleId === puzzle.id ? me.today.play : null;
  const localDone = session?.phase === 'done' && session.summary ? session.summary : null;
  const resultSummary = serverPlay ?? localDone;

  // 비로그인: 이 점수면 오늘 몇 등인지
  useEffect(() => {
    if (!resultSummary || serverPlay) { setAnonPosition(null); return; }
    api.ranking(1, resultSummary.total).then(r => setAnonPosition(r.position)).catch(() => {});
  }, [resultSummary?.total, serverPlay]); // eslint-disable-line react-hooks/exhaustive-deps

  const result: ResultView | null = resultSummary
    ? { summary: resultSummary, position: serverPlay ? me!.today.position : anonPosition, fromServer: !!serverPlay }
    : null;

  const value: Ctx = {
    ready: meLoaded && puzzleLoaded,
    me, puzzle, board, puzzleError, session, result, played: !!result, noPopup, sheet,
    refreshMe, authenticate, signup, logout, updateMe, saveSession, newSession, finish,
    setNoPopup: v => { setNoPopupState(v); store.set(PREF_NO_POPUP, v); },
    celebrate,
    markCelebrate: () => setCelebrate(Date.now()),
    clearCelebrate: () => setCelebrate(null),
    badgeOverride,
    setBadgeOverride,
    openSheet: (kind, reason, prefill) => setSheet({ kind, reason, prefill }),
    closeSheet: () => setSheet(null),
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
