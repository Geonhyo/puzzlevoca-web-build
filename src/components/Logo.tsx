import { LOGO_GLYPHS, LOGO_TILES } from './logo-paths';

/** 퍼즐보카 워드마크 (3×3 칸 + 한글 로고타입). 색은 디자인 토큰. */
export function Logo({ className = 's-logo' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 13.8 215.4 46.4" className={className} role="img" aria-label="퍼즐보카">
      <g transform="translate(0 14.80) scale(0.6)">
        {LOGO_TILES.map(t => (
          <rect key={`${t.r}${t.c}`} x={t.c * 26} y={t.r * 26} width="22" height="22" rx="6" style={{ fill: t.on ? 'var(--color-brand)' : 'var(--color-brand-pale)' }} />
        ))}
      </g>
      <g transform="translate(-29.60 0)">
        {LOGO_GLYPHS.map((g, i) => <path key={i} d={g.d} style={{ fill: g.tone === 'ink' ? 'var(--color-ink)' : 'var(--color-brand)' }} />)}
      </g>
    </svg>
  );
}
