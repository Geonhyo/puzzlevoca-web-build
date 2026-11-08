import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION, SITE_NAME, TAGLINE } from '@/lib/config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} · ${TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: 'ko',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f3f7',
    theme_color: '#f4f3f7',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
