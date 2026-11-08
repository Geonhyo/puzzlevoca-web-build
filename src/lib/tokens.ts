/** CSS 디자인 토큰(src/styles/tokens.css)을 JS(캔버스 등)에서 읽는다 — 값을 두 번 정의하지 않기 위해. */
export function cssVar(name: string, el: Element = document.documentElement) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}
