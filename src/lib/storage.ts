/** localStorage 는 사파리 비공개 모드 등에서 막힐 수 있어 항상 try 로 감싼다. */
export const store = {
  get<T>(key: string): T | null {
    try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장 불가 환경 */ }
  },
  remove(key: string) {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  },
};
