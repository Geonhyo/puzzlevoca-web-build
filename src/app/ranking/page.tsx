import type { Metadata } from 'next';
import { serverApi } from '@/lib/api';
import { RankingView } from '@/views/RankingView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: '일일 랭킹',
  description: '오늘의 영단어 퍼즐 상위 100명. 매일 자정 새 퍼즐과 함께 랭킹이 새로 시작돼요.',
  alternates: { canonical: '/ranking' },
  openGraph: { url: '/ranking', title: '일일 랭킹 · 퍼즐보카' },
};

export default async function RankingPage() {
  return <RankingView initial={await serverApi.ranking(100)} />;
}
