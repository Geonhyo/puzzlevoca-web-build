import type { PuzzleData, Summary } from '@/shared/game-core';
import type { RatingState, Tier } from '@/shared/rating';
import { API_URL } from './config';

export type PlaySummary = Summary & { puzzleId: number };
export interface Position { rank: number; total: number; pct: number }
export interface Me {
  user: { loginId: string; email: string | null; notifyEnabled: boolean; avatar: number; createdAt: string };
  rating: RatingState;
  stats: { streakDays: number; learnedWords: number; playedCount: number; avgScore: number | null; bestScore: number | null; week: boolean[] };
  today: { date: string; puzzleId: number | null; play: PlaySummary | null; position: Position | null };
  /** 현재 시즌 (3개월) */
  season: { no: number; startsOn: string; endsOn: string } | null;
  /** 지난 시즌 뱃지 (시즌이 끝날 때의 티어). 화면 표시는 디자인 확정 후 */
  badges: { seasonNo: number; tier: Tier; div: number }[];
}
export interface RankRow { rank: number; loginId: string; avatar: number; score: number; elapsedSec: number; tier: Tier | null; div: number; isMe: boolean }
export interface Ranking { puzzle: { id: number; no: number; date: string }; total: number; top: RankRow[]; me: RankRow | null; position: Position | null }
export interface PuzzleShape { id: number; no: number; date: string; size: number; wordCount: number; cells: string[] }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

async function request<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal; server?: boolean } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      credentials: 'include',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
      ...(init.server ? { next: { revalidate: 60 } } : { cache: 'no-store' }),
    } as RequestInit);
  } catch {
    throw new ApiError(0, 'network', '인터넷 연결을 확인해주세요');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? '잠시 후 다시 시도해주세요');
  return data as T;
}

export const api = {
  me: () => request<Me>('/api/me'),
  updateMe: (patch: Partial<{ email: string; notifyEnabled: boolean; avatar: number }>) => request<Me>('/api/me', { method: 'PATCH', body: patch }),
  /** 이메일 또는 아이디로 로그인 */
  login: (identifier: string, password: string) => request<{ ok: true; usedTempPassword: boolean }>('/api/auth/login', { method: 'POST', body: { identifier, password } }),
  signup: (email: string, loginId: string, password: string) => request<{ ok: true }>('/api/auth/signup', { method: 'POST', body: { email, loginId, password } }),
  idCheck: (loginId: string, signal?: AbortSignal) => request<{ valid: boolean; available: boolean }>(`/api/auth/id-check?loginId=${encodeURIComponent(loginId)}`, { signal }),
  idSuggest: (email: string, signal?: AbortSignal) => request<{ suggestion: string | null }>(`/api/auth/id-suggest?email=${encodeURIComponent(email)}`, { signal }),
  passwordReset: (email: string) => request<{ ok: true; email: string }>('/api/auth/password-reset', { method: 'POST', body: { email } }),
  setPassword: (password: string) => request<{ ok: true }>('/api/auth/password', { method: 'POST', body: { password } }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  puzzle: () => request<PuzzleData>('/api/puzzles/today'),
  startPlay: (puzzleId: number) => request<{ token: string }>('/api/plays/start', { method: 'POST', body: { puzzleId } }),
  submitPlay: (b: { token: string; events: unknown[]; elapsedSec: number }) => request<{ play: PlaySummary; position: Position | null }>('/api/plays', { method: 'POST', body: b }),
  ranking: (limit: number, score?: number | null) => request<Ranking>(`/api/rankings/today?limit=${limit}${score != null ? `&score=${score}` : ''}`),
};

/** 서버 컴포넌트용 (ISR 60초). 실패하면 null — 화면은 비어 있는 상태로 그린다. */
export const serverApi = {
  shape: () => request<PuzzleShape>('/api/puzzles/today/shape', { server: true }).catch(() => null),
  ranking: (limit: number) => request<Ranking>(`/api/rankings/today?limit=${limit}`, { server: true }).catch(() => null),
};
