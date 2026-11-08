import type { Metadata } from 'next';
import { GameView } from '@/game/GameView';

export const metadata: Metadata = { title: '오늘의 퍼즐 풀기', robots: { index: false, follow: true }, alternates: { canonical: '/play' } };

export default function PlayPage() {
  return <GameView />;
}
