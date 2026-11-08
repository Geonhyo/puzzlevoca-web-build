import { serverApi } from '@/lib/api';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, TAGLINE } from '@/lib/config';
import { HomeView } from '@/views/HomeView';

// 퍼즐/랭킹은 자정에 바뀌고 랭킹은 계속 바뀌므로 1분마다 다시 만든다 (ISR)
export const revalidate = 60;

export default async function HomePage() {
  const [shape, ranking] = await Promise.all([serverApi.shape(), serverApi.ranking(3)]);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: ['puzzlevoca', '퍼즐 보카'],
        description: SITE_DESCRIPTION,
        inLanguage: 'ko-KR',
      },
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: SITE_URL,
        description: `${TAGLINE}. ${SITE_DESCRIPTION}`,
        applicationCategory: 'EducationalApplication',
        applicationSubCategory: 'Word puzzle',
        operatingSystem: 'Web',
        inLanguage: 'ko-KR',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
        educationalUse: '영단어 학습',
        audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#org`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon.svg`,
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <HomeView shape={shape} ranking={ranking} />
    </>
  );
}
