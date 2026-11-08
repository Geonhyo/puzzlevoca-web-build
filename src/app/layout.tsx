import type { Metadata, Viewport } from 'next';
import { Noto_Sans_KR, Urbanist } from 'next/font/google';
import { Sheets } from '@/components/Sheets';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, TAGLINE } from '@/lib/config';
import { AppProvider } from '@/state/app';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/site.css';
import '@/styles/game.css';

const urbanist = Urbanist({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-urbanist', display: 'swap' });
const notoKr = Noto_Sans_KR({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-noto-kr', display: 'swap', preload: false });

const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const naver = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} · ${TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ['퍼즐보카', '영단어', '영단어 퍼즐', '영어 크로스워드', '십자말풀이', '토익 단어', '비즈니스 영어', '영어 공부', '매일 영단어', '단어 게임', 'puzzlevoca'],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'education',
  formatDetection: { telephone: false, email: false, address: false },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/',
    siteName: SITE_NAME,
    title: `${SITE_NAME} · ${TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: `${SITE_NAME} · ${TAGLINE}`, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  verification: {
    ...(google ? { google } : {}),
    ...(naver ? { other: { 'naver-site-verification': naver } } : {}),
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f4f3f7',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${urbanist.variable} ${notoKr.variable}`}>
      <body>
        <AppProvider>
          {children}
          <Sheets />
        </AppProvider>
      </body>
    </html>
  );
}
