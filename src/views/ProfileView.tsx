'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Avatar } from '@/components/Avatar';
import { IconChev, IconPencil } from '@/components/icons';
import { Header, StreakCard, TierBar, TierBig } from '@/components/site';
import { useApp } from '@/state/app';

export function ProfileView() {
  const { ready, me, openSheet, updateMe, logout } = useApp();
  const router = useRouter();
  useEffect(() => { if (ready && !me) router.replace('/'); }, [ready, me, router]);
  if (!me) return <div className="site" aria-busy="true"><Header /></div>;

  const st = me.stats;
  const toggleNotify = () => {
    if (!me.user.email) openSheet('email');
    else updateMe({ notifyEnabled: !me.user.notifyEnabled }).catch(() => {});
  };
  return (
    <div className="site" aria-busy={!ready}>
      <Header />
      <main className="s-wrap s-profile">
        <div className="s-col">
          <div className="s-idBig">
            <button type="button" className="s-idAva" aria-label="프로필 캐릭터 바꾸기" onClick={() => openSheet('avatar')}>
              <Avatar index={me.user.avatar} size={64} /><span className="ed"><IconPencil /></span>
            </button>
            <span>{me.user.loginId}</span>
          </div>
          <StreakCard me={me} withNext={false} />
          <section className="s-card s-stack s-tierCard"><TierBig me={me} /><TierBar me={me} big /></section>
          <section className="s-card s-trio">
            <div><span className="s-label">푼 퍼즐</span><b>{st.playedCount}</b></div>
            <div><span className="s-label">평균 점수</span><b>{st.avgScore != null ? st.avgScore.toLocaleString() : '-'}</b></div>
            <div><span className="s-label">최고 점수</span><b>{st.bestScore != null ? st.bestScore.toLocaleString() : '-'}</b></div>
          </section>
        </div>
        <div className="s-col">
          <section className="s-card s-settings">
            <button type="button" className="s-set" onClick={() => openSheet('email')}>
              <span>이메일<small>로그인, 비밀번호 찾기, 알림에 사용돼요</small></span>
              {me.user.email ? <span className="s-val gray">{me.user.email}<IconChev /></span> : <span className="s-val">등록하기<IconChev /></span>}
            </button>
            <button type="button" className="s-set" role="switch" aria-checked={me.user.notifyEnabled} onClick={toggleNotify}>
              <span>새 퍼즐 알림<small>매일 자정, 메일로 발송돼요</small></span>
              <span className={`s-tog ${me.user.notifyEnabled ? '' : 'off'}`} />
            </button>
          </section>
          <button type="button" className="s-textBtn" onClick={async () => { await logout(); router.push('/'); }}>로그아웃</button>
        </div>
      </main>
    </div>
  );
}
