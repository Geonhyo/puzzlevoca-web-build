import { ImageResponse } from 'next/og';
import { loadKoreanFont } from './og-font';

export const alt = '퍼즐보카 · 하루 한 판, 영단어가 쌓여요';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 목업 토큰 값 (OG 이미지는 CSS 변수를 못 읽어서 여기에 적는다: --color-brand 등)
const BRAND = '#2b4bd9', PALE = '#dde4ff', INK = '#16161d', BG = '#f4f3f7', TINT = '#cfd8ff', GOLD = '#ffe9b0';

// 미니 퍼즐 모양 (목업 퍼즐과 같은 칸)
const CELLS = new Set('6,1 6,2 6,3 6,4 6,5 6,6 6,7 6,8 6,9 1,3 2,3 3,3 4,3 5,3 7,3 8,3 0,9 1,9 2,9 3,9 4,9 5,9 2,0 2,1 2,2 2,4 2,5 2,6 2,7 4,5 4,6 4,7 4,8 4,10 4,11 7,5 8,5 9,5 10,5 11,5 8,1 8,2 8,4 8,6 0,5 0,6 0,7 0,8 0,10 0,11 7,8 8,8 9,8 10,8 11,8 3,11 5,11 7,11 8,11'.split(' '));

export default async function OgImage() {
  const title = '하루 한 판, 영단어가 쌓여요';
  const sub = '매일 자정 열리는 영단어 크로스워드';
  const font = await loadKoreanFont(`퍼즐보카${title}${sub}`);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: BG, padding: 64, fontFamily: 'NotoKR' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', width: 74, gap: 4 }}>
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} style={{ width: 22, height: 22, borderRadius: 6, background: Math.floor(i / 3) + (i % 3) === 2 ? BRAND : PALE }} />
              ))}
            </div>
            <div style={{ fontSize: 52, fontWeight: 800, color: INK, display: 'flex' }}>퍼즐<span style={{ color: BRAND }}>보카</span></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontSize: 66, fontWeight: 800, color: INK, letterSpacing: -2, lineHeight: 1.15 }}>{title}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: BRAND }}>{sub}</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#6e6c78' }}>puzzlevoca.com</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 470, height: 502, background: '#fff', borderRadius: 40 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', width: 12 * 32 + 11 * 4, gap: 4 }}>
            {Array.from({ length: 144 }, (_, i) => {
              const k = `${Math.floor(i / 12)},${i % 12}`;
              return <div key={i} style={{ width: 32, height: 32, borderRadius: 8, background: !CELLS.has(k) ? 'transparent' : k === '6,5' || k === '2,3' || k === '4,9' ? GOLD : i % 5 === 0 ? TINT : '#efedf3' }} />;
            })}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: 'NotoKR', data: font, weight: 800, style: 'normal' }] : [] },
  );
}
