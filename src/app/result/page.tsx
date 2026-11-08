import type { Metadata } from 'next';
import { ResultView } from '@/views/ResultView';

export const metadata: Metadata = { title: '오늘의 결과', robots: { index: false, follow: true }, alternates: { canonical: '/result' } };

export default function ResultPage() {
  return <ResultView />;
}
