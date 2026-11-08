import type { Metadata } from 'next';
import { ProfileView } from '@/views/ProfileView';

export const metadata: Metadata = { title: '프로필', robots: { index: false, follow: false }, alternates: { canonical: '/profile' } };

export default function ProfilePage() {
  return <ProfileView />;
}
