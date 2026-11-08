import Link from 'next/link';
import { Header } from '@/components/site';

export default function NotFound() {
  return (
    <div className="site">
      <Header />
      <main className="s-wrap one">
        <div className="s-col">
          <section className="s-card s-stack s-emptyCard">
            <h1 className="s-h2">찾는 페이지가 없어요</h1>
            <p className="s-note">주소를 다시 확인하거나 오늘의 퍼즐로 돌아가요.</p>
            <Link href="/" className="btn sm s-auto">오늘의 퍼즐로</Link>
          </section>
        </div>
      </main>
    </div>
  );
}
