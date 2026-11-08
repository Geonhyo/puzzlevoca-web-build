/**
 * 퍼즐 규칙과 점수 계산 (순수 함수).
 * web/src/shared 와 server/src/shared 에 똑같은 파일이 있다 — 브라우저는 즉시 판정에, 서버는 입력 기록 재검증에 쓴다.
 * 수정하면 반드시 양쪽에 복사할 것 (`pnpm check:shared` 가 검사).
 */

export const CFG = {
  JOKERS: 2,
  BASE: 10,
  PAID_JOKER_BASE: 20,
  PAID_JOKER_STEP: 10,
  PAID_JOKER_MAX: 100,
  COMBO_EVERY: 5,
  COMBO_STEP: 0.25,
  COMBO_MAX: 2.0,
  WORD_BONUS: 5,
  MISS_PENALTY: 15,
  TIME_TARGET: 420,
  TIME_RATE: 2,
} as const;

export type Dir = 'A' | 'D';
export type LockKind = 't' | 'j' | 'p'; // t: 직접 맞춤, j: 무료 조커, p: 유료 조커

export interface PuzzleWord {
  answer: string;
  row: number;
  col: number;
  dir: Dir;
  meaningKo: string;
  exampleEn: string;
}

export interface PuzzleData {
  id: number;
  no: number;
  date: string; // YYYY-MM-DD (KST)
  size: number;
  words: PuzzleWord[];
  multipliers: Record<string, number>; // "r,c" → 2 | 3
}

export interface Cell {
  r: number;
  c: number;
  ans: string;
  words: { A: number | null; D: number | null };
}

export interface BoardWord extends PuzzleWord {
  index: number;
  cells: string[];
  num: number;
}

export interface Board {
  size: number;
  words: BoardWord[];
  cells: Record<string, Cell>;
  keys: string[];
  mult: Record<string, number>;
  /** 단어 번호순 (가로 먼저) — 다음 단어로 넘어갈 때 쓰는 순서 */
  order: number[];
}

export const cellKey = (r: number, c: number) => `${r},${c}`;

export function buildBoard(p: Pick<PuzzleData, 'size' | 'words' | 'multipliers'>): Board {
  const cells: Record<string, Cell> = {};
  const words: BoardWord[] = p.words.map((w, index) => {
    const [dr, dc] = w.dir === 'A' ? [0, 1] : [1, 0];
    const list: string[] = [];
    for (let k = 0; k < w.answer.length; k++) {
      const r = w.row + dr * k, c = w.col + dc * k, key = cellKey(r, c);
      if (r < 0 || c < 0 || r >= p.size || c >= p.size) throw new Error(`단어가 판 밖으로 나가요: ${w.answer}`);
      const cell = cells[key] ?? (cells[key] = { r, c, ans: w.answer[k], words: { A: null, D: null } });
      if (cell.ans !== w.answer[k]) throw new Error(`겹치는 칸의 글자가 달라요: ${key}`);
      if (cell.words[w.dir] != null) throw new Error(`같은 방향 단어가 겹쳐요: ${key}`);
      cell.words[w.dir] = index;
      list.push(key);
    }
    return { ...w, index, cells: list, num: 0 };
  });
  const keys = Object.keys(cells).sort((a, b) => cells[a].r - cells[b].r || cells[a].c - cells[b].c);
  const starts = [...new Set(words.map(w => w.cells[0]))].sort((a, b) => cells[a].r - cells[b].r || cells[a].c - cells[b].c);
  const num: Record<string, number> = {};
  starts.forEach((k, i) => (num[k] = i + 1));
  words.forEach(w => (w.num = num[w.cells[0]]));
  const order = words.slice().sort((a, b) => a.num - b.num || (a.dir === 'A' ? -1 : 1)).map(w => w.index);
  const mult: Record<string, number> = {};
  for (const [k, v] of Object.entries(p.multipliers ?? {})) if (cells[k] && (v === 2 || v === 3)) mult[k] = v;
  return { size: p.size, words, cells, keys, mult, order };
}

export interface CoreState {
  locked: Record<string, LockKind>;
  missed: Record<string, true>;
  color: Record<string, Dir>;
  inv: Record<string, number>;
  doneWords: Record<number, true>;
  combo: number;
  maxCombo: number;
  misses: number;
  jokers: number;
  paidJokers: number;
  jokerPen: number;
  base: number;
  wordBonus: number;
}

export function initCore(board: Board): CoreState {
  const inv: Record<string, number> = {};
  for (const k of board.keys) inv[board.cells[k].ans] = (inv[board.cells[k].ans] ?? 0) + 1;
  return {
    locked: {}, missed: {}, color: {}, inv, doneWords: {},
    combo: 0, maxCombo: 0, misses: 0, jokers: CFG.JOKERS, paidJokers: 0, jokerPen: 0, base: 0, wordBonus: 0,
  };
}

export const comboMult = (c: number) => Math.min(CFG.COMBO_MAX, 1 + CFG.COMBO_STEP * Math.floor(c / CFG.COMBO_EVERY));
export const paidCost = (n: number) => Math.min(CFG.PAID_JOKER_MAX, CFG.PAID_JOKER_BASE + CFG.PAID_JOKER_STEP * n);
export const liveScore = (s: CoreState) => Math.max(0, s.base + s.wordBonus - s.misses * CFG.MISS_PENALTY - s.jokerPen);

export interface CompletedWord {
  index: number;
  dir: Dir;
  bonus: number;
}

export interface StepResult {
  ok: boolean; // 정답 여부 (조커는 항상 true)
  pts: number; // 얻은 글자 점수
  penalty: number; // 깎인 점수 (미스, 유료 조커)
  combo: number;
  completed: CompletedWord[];
}

function checkWords(board: Board, s: CoreState, key: string): CompletedWord[] {
  const out: CompletedWord[] = [];
  const cell = board.cells[key];
  for (const d of ['A', 'D'] as const) {
    const i = cell.words[d];
    if (i == null || s.doneWords[i]) continue;
    const w = board.words[i];
    if (w.cells.every(k => s.locked[k])) {
      s.doneWords[i] = true;
      w.cells.forEach(k => { if (!s.color[k]) s.color[k] = d; });
      const bonus = CFG.WORD_BONUS * w.answer.length;
      s.wordBonus += bonus;
      out.push({ index: i, dir: d, bonus });
    }
  }
  return out;
}

const consume = (s: CoreState, L: string) => { s.inv[L] = (s.inv[L] ?? 0) - 1; };

/** 글자 하나를 칸에 놓는다. 놓을 수 없는 입력이면 null. */
export function applyPlace(board: Board, s: CoreState, key: string, L: string): StepResult | null {
  const cell = board.cells[key];
  if (!cell || s.locked[key] || !(s.inv[L] > 0)) return null;
  if (L === cell.ans) {
    const pts = Math.round(CFG.BASE * (board.mult[key] ?? 1) * comboMult(s.combo));
    s.base += pts;
    s.combo++;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    s.locked[key] = 't';
    consume(s, L);
    return { ok: true, pts, penalty: 0, combo: s.combo, completed: checkWords(board, s, key) };
  }
  s.misses++;
  s.combo = 0;
  s.missed[key] = true;
  return { ok: false, pts: 0, penalty: CFG.MISS_PENALTY, combo: 0, completed: [] };
}

/** 조커로 칸 하나를 연다. 무료 조커가 없으면 점점 비싸지는 유료 조커. */
export function applyJoker(board: Board, s: CoreState, key: string): StepResult | null {
  const cell = board.cells[key];
  if (!cell || s.locked[key]) return null;
  let penalty = 0;
  if (s.jokers > 0) {
    s.jokers--;
    s.locked[key] = 'j';
  } else {
    penalty = paidCost(s.paidJokers);
    s.paidJokers++;
    s.jokerPen += penalty;
    s.locked[key] = 'p';
  }
  consume(s, cell.ans);
  return { ok: true, pts: 0, penalty, combo: s.combo, completed: checkWords(board, s, key) };
}

/** 입력 기록. t 는 일시정지를 뺀 경과 시간(ms). */
export type GameEvent = { k: 'p'; c: string; l: string; t: number } | { k: 'j'; c: string; t: number };

export function applyEvent(board: Board, s: CoreState, e: GameEvent): StepResult | null {
  return e.k === 'p' ? applyPlace(board, s, e.c, e.l) : applyJoker(board, s, e.c);
}

export const isComplete = (board: Board, s: CoreState) => board.keys.every(k => s.locked[k]);

export interface ReplayResult {
  state: CoreState;
  error: string | null;
}

/** 입력 기록을 처음부터 다시 적용한다. 규칙에 맞지 않는 입력이 있으면 error. */
export function replay(board: Board, events: GameEvent[]): ReplayResult {
  const state = initCore(board);
  let lastT = 0;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e || (e.k !== 'p' && e.k !== 'j') || typeof e.c !== 'string' || typeof e.t !== 'number' || !Number.isFinite(e.t)) {
      return { state, error: `잘못된 입력 형식 (#${i})` };
    }
    if (e.k === 'p' && (typeof e.l !== 'string' || !/^[A-Z]$/.test(e.l))) return { state, error: `잘못된 글자 (#${i})` };
    if (e.t < lastT) return { state, error: `입력 시간이 거꾸로예요 (#${i})` };
    lastT = e.t;
    if (isComplete(board, state)) return { state, error: `완성 뒤의 입력 (#${i})` };
    if (!applyEvent(board, state, e)) return { state, error: `놓을 수 없는 칸 (#${i})` };
  }
  return { state, error: null };
}

export interface CellResult {
  locked: Record<string, LockKind>;
  missed: string[];
}

export interface Summary {
  sec: number;
  base: number;
  wordBonus: number;
  timeBonus: number;
  misses: number;
  missPenalty: number;
  jokersUsed: number; // 무료 조커 사용 수
  paidJokers: number;
  jokerPenalty: number;
  maxCombo: number;
  learnedWords: number; // 이번 퍼즐에서 학습한 단어 수 = 완성한 단어 수 (미스·조커와 무관, 누적 단어에 더해짐)
  total: number;
  cells: CellResult;
}

export function learnedWordCount(board: Board, s: CoreState) {
  return Object.keys(s.doneWords).length;
}

export function summarize(board: Board, s: CoreState, sec: number): Summary {
  const timeBonus = Math.max(0, CFG.TIME_TARGET - sec) * CFG.TIME_RATE;
  const missPenalty = s.misses * CFG.MISS_PENALTY;
  const total = Math.max(0, s.base + s.wordBonus + timeBonus - missPenalty - s.jokerPen);
  return {
    sec,
    base: s.base,
    wordBonus: s.wordBonus,
    timeBonus,
    misses: s.misses,
    missPenalty,
    jokersUsed: CFG.JOKERS - s.jokers,
    paidJokers: s.paidJokers,
    jokerPenalty: s.jokerPen,
    maxCombo: s.maxCombo,
    learnedWords: learnedWordCount(board, s),
    total,
    cells: { locked: { ...s.locked }, missed: Object.keys(s.missed) },
  };
}

/** 단어별 표시: 오답노트에 오를 단어 (미스 또는 조커가 있었던 단어) */
export function flaggedWords(board: Board, cells: CellResult) {
  const missed = new Set(cells.missed);
  return board.words
    .map(w => ({
      word: w,
      miss: w.cells.some(k => missed.has(k)),
      joker: w.cells.some(k => cells.locked[k] === 'j' || cells.locked[k] === 'p'),
    }))
    .filter(x => x.miss || x.joker);
}
