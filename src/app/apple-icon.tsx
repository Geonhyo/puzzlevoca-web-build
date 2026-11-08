import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2b4bd9' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', width: 120, gap: 9 }}>
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} style={{ width: 34, height: 34, borderRadius: 9, background: Math.floor(i / 3) + (i % 3) === 2 ? '#fff' : '#5c76f0' }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
