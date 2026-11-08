import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/ranking`, lastModified: now, changeFrequency: 'hourly', priority: 0.6 },
  ];
}
