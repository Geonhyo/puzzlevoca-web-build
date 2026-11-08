'use client';
/** 시트: 휴대폰은 아래에서 올라오고, 600px 부터는 가운데 모달 */
import { useEffect, useRef, useState } from 'react';
import { Avatar, CHARS } from './Avatar';
import { HelpRules } from './HelpRules';
import { IconBell, IconDownload, IconShare, IconX } from './icons';
import { Countdown } from './site';
import { api, ApiError } from '@/lib/api';
import { drawShareCard, shareText } from '@/lib/share-card';
import { useApp } from '@/state/app';

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function Shell({ label, children }: { label: string; children: React.ReactNode }) {
  const { closeSheet } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const f = ref.current?.querySelector<HTMLElement>('input, .btn');
    f?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSheet(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [closeSheet]);
  return (
    <div className="s-sheetOv">
      <div className="s-dim" onClick={closeSheet} />
      <div className="s-sheet" role="dialog" aria-modal="true" aria-label={label} ref={ref}>
        <div className="s-grab" />
        <button type="button" className="s-x" aria-label="닫기" onClick={closeSheet}><IconX /></button>
        {children}
      </div>
    </div>
  );
}

const Head = ({ title, note, center }: { title: string; note?: string; center?: boolean }) => (
  <div className={`s-sheetHead${center ? ' center' : ''}`}><h2 className="s-sheetH">{title}</h2>{note ? <p className="s-note">{note}</p> : null}</div>
);

function Field(props: { id: string; label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete: string }) {
  return (
    <div className="s-field">
      <label htmlFor={props.id}>{props.label}</label>
      <input id={props.id} name={props.id} type={props.type} value={props.value} placeholder={props.placeholder} autoComplete={props.autoComplete}
        autoCapitalize="none" spellCheck={false} onChange={e => props.onChange(e.target.value)} />
    </div>
  );
}

function LoginSheet({ reason }: { reason?: string }) {
  const { authenticate, closeSheet, openSheet, updateMe } = useApp();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginId = id.trim();
    if (!/^[a-z0-9_]{4,16}$/.test(loginId)) { setErr('아이디는 영소문자, 숫자, _ 로 4~16자예요.'); return; }
    if (pw.length < 8) { setErr('비밀번호는 8자 이상이에요.'); return; }
    setBusy(true); setErr('');
    try {
      const m = await authenticate(loginId, pw);
      if (reason === 'notify') {
        // 로그인 → 메일이 있으면 바로 켜고, 없으면 메일 입력으로
        if (m?.user.email) { await updateMe({ notifyEnabled: true }).catch(() => {}); closeSheet(); }
        else openSheet('notify');
      } else closeSheet();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : '잠시 후 다시 시도해주세요');
    } finally { setBusy(false); }
  };
  const note = reason === 'notify' ? '로그인하면 알림을 받을 수 있어요.' : '처음 쓰는 아이디면 그대로 가입돼요.';
  return (
    <Shell label="로그인">
      <form className="s-form" onSubmit={submit} noValidate>
        <Head title="로그인" note={note} />
        <Field id="lid" label="아이디" type="text" value={id} onChange={setId} autoComplete="username" placeholder="영소문자, 숫자, _ 4~16자" />
        <Field id="lpw" label="비밀번호" type="password" value={pw} onChange={setPw} autoComplete="current-password" placeholder="8자 이상" />
        <p className="s-err" role="alert">{err}</p>
        <button type="submit" className="btn" disabled={busy}>로그인</button>
        <button type="button" className="s-textBtn" onClick={() => openSheet('reset')}>비밀번호를 잊었어요</button>
      </form>
    </Shell>
  );
}

function ResetSheet() {
  const { openSheet } = useApp();
  const [id, setId] = useState('');
  const [err, setErr] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginId = id.trim();
    if (!/^[a-z0-9_]{4,16}$/.test(loginId)) { setErr('아이디는 영소문자, 숫자, _ 로 4~16자예요.'); return; }
    setBusy(true); setErr('');
    try { setSentTo((await api.passwordReset(loginId)).email); } catch (e2) { setErr(e2 instanceof ApiError ? e2.message : '잠시 후 다시 시도해주세요'); } finally { setBusy(false); }
  };
  if (sentTo) {
    return (
      <Shell label="비밀번호 찾기">
        <div className="s-bell"><IconBell size={26} /></div>
        <Head title="임시 비밀번호를 보냈어요" note={`${sentTo} 메일함을 확인해 주세요. 임시 비밀번호로 로그인하면 그게 새 비밀번호가 돼요.`} center />
        <button type="button" className="btn" onClick={() => openSheet('login')}>로그인하러 가기</button>
      </Shell>
    );
  }
  return (
    <Shell label="비밀번호 찾기">
      <form className="s-form" onSubmit={submit} noValidate>
        <Head title="비밀번호 찾기" note="아이디를 입력하면 등록된 이메일로 임시 비밀번호를 보내드려요." />
        <Field id="rid" label="아이디" type="text" value={id} onChange={setId} autoComplete="username" />
        <p className="s-err" role="alert">{err}</p>
        <button type="submit" className="btn" disabled={busy}>임시 비밀번호 받기</button>
        <button type="button" className="s-textBtn" onClick={() => openSheet('login')}>로그인으로 돌아가기</button>
      </form>
    </Shell>
  );
}

function NotifySheet() {
  const { me, updateMe, closeSheet } = useApp();
  const [v, setV] = useState(me?.user.email ?? '');
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validEmail(v.trim())) { setErr('이메일 주소를 확인해주세요.'); return; }
    try { await updateMe({ email: v.trim(), notifyEnabled: true }); closeSheet(); } catch (e2) { setErr(e2 instanceof ApiError ? e2.message : '잠시 후 다시 시도해주세요'); }
  };
  return (
    <Shell label="알림 받기">
      <form className="s-form" onSubmit={submit} noValidate>
        <div className="s-bell"><IconBell size={26} /></div>
        <Head title="매일 잊지 않게 챙겨드릴게요" note="자정에 새 퍼즐이 열리면 메일로 알려드릴게요. 이 메일은 프로필에 저장돼요." />
        <Field id="nmail" label="이메일" type="email" value={v} onChange={setV} placeholder="name@example.com" autoComplete="email" />
        <p className="s-err" role="alert">{err}</p>
        <button type="submit" className="btn">알림 받기</button>
        <button type="button" className="s-textBtn" onClick={closeSheet}>다음에 할게요</button>
      </form>
    </Shell>
  );
}

function EmailSheet() {
  const { me, updateMe, closeSheet } = useApp();
  const has = !!me?.user.email;
  const [v, setV] = useState(me?.user.email ?? '');
  const [err, setErr] = useState('');
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validEmail(v.trim())) { setErr('이메일 주소를 확인해주세요.'); return; }
    try { await updateMe({ email: v.trim() }); closeSheet(); } catch (e2) { setErr(e2 instanceof ApiError ? e2.message : '잠시 후 다시 시도해주세요'); }
  };
  return (
    <Shell label={has ? '이메일 수정' : '이메일 등록'}>
      <form className="s-form" onSubmit={save} noValidate>
        <Head title={has ? '이메일' : '이메일 등록'} note="계정 찾기와 새 퍼즐 알림에 쓰는 메일이에요." />
        <Field id="email" label="이메일" type="email" value={v} onChange={setV} placeholder={has ? undefined : 'name@example.com'} autoComplete="email" />
        <p className="s-err" role="alert">{err}</p>
        <button type="submit" className="btn">{has ? '저장하기' : '등록하기'}</button>
        {has ? <button type="button" className="s-textBtn" onClick={async () => { await updateMe({ email: null }).catch(() => {}); closeSheet(); }}>이메일 삭제</button> : null}
      </form>
    </Shell>
  );
}

function PopupSheet() {
  const { me, closeSheet, openSheet, updateMe, noPopup, setNoPopup } = useApp();
  const title = me ? `${me.stats.streakDays}일째 이어가는 중이에요` : '첫 영어 퍼즐 완료!';
  const on = () => {
    if (!me) openSheet('login', 'notify');
    else if (me.user.email) { updateMe({ notifyEnabled: true }).catch(() => {}); closeSheet(); }
    else openSheet('notify');
  };
  return (
    <Shell label="다음 퍼즐 알림">
      <div className="s-bell"><IconBell size={26} /></div>
      <Head title={title} note="매일 꾸준히 학습할 수 있게 도와드릴게요." center />
      <div className="s-timerBox"><span className="s-label">다음 퍼즐까지</span><Countdown /></div>
      <div className="s-col8">
        {me?.user.notifyEnabled ? null : <button type="button" className="btn" onClick={on}><IconBell />알림 받기</button>}
        <button type="button" className="btn line" onClick={closeSheet}>닫기</button>
      </div>
      <label className="s-check"><input type="checkbox" checked={noPopup} onChange={e => setNoPopup(e.target.checked)} />다시 보지 않기</label>
    </Shell>
  );
}

function ShareSheet() {
  const { result, board, puzzle, me } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const cv = useRef<HTMLCanvasElement | null>(null);
  const [dl, setDl] = useState('이미지 저장');
  const [sys, setSys] = useState('다른 앱으로 보내기');
  const [copy, setCopy] = useState('링크 복사');
  useEffect(() => {
    if (!result || !board || !puzzle) return;
    let alive = true;
    drawShareCard({ summary: result.summary, size: puzzle.size, cells: board.keys, loginId: me?.user.loginId ?? null }).then(c => {
      if (!alive) return;
      cv.current = c;
      setUrl(c.toDataURL('image/png'));
    });
    return () => { alive = false; };
  }, [result, board, puzzle, me?.user.loginId]);
  const name = `puzzlevoca-${puzzle?.no ?? ''}.png`;
  const blob = () => new Promise<Blob>((res, rej) => cv.current ? cv.current.toBlob(b => (b ? res(b) : rej(new Error('blob'))), 'image/png') : rej(new Error('no canvas')));
  const save = () => {
    if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setDl('저장했어요');
  };
  const send = async () => {
    if (!result) return;
    try {
      const file = new File([await blob()], name, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: shareText(result.summary) }); return; }
      if (navigator.share) { await navigator.share({ text: shareText(result.summary) }); return; }
      throw new Error('no share');
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      setSys('이 기기에서는 이미지 저장을 써주세요');
    }
  };
  const copyLink = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(shareText(result.summary)); setCopy('복사했어요'); } catch { setCopy('복사할 수 없는 환경이에요'); }
  };
  return (
    <Shell label="결과 카드 공유">
      <Head title="결과 카드" note="단어는 숨기고 판 모양만 보여줘요." center />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img className="s-shareImg" src={url} alt="오늘 결과 카드" /> : <div className="s-shareImg" aria-hidden="true" />}
      <div className="s-col8">
        <button type="button" className="btn" onClick={save} disabled={!url}><IconDownload />{dl}</button>
        <button type="button" className="btn line" onClick={send} disabled={!url}><IconShare />{sys}</button>
        <button type="button" className="s-textBtn" onClick={copyLink}>{copy}</button>
      </div>
    </Shell>
  );
}

function HelpSheet() {
  const { closeSheet } = useApp();
  return (
    <Shell label="도움말">
      <Head title="도움말" note="하루 한 판, 이렇게 풀어요." />
      <HelpRules bare />
      <button type="button" className="btn" onClick={closeSheet}>확인</button>
    </Shell>
  );
}

function AvatarSheet() {
  const { me, updateMe, closeSheet } = useApp();
  return (
    <Shell label="프로필 캐릭터">
      <Head title="프로필 캐릭터" note="퍼즐 칸에서 태어난 칸 친구들 중 하나를 골라요." />
      <div className="s-avaGrid">
        {CHARS.map((f, i) => (
          <button type="button" key={f.name} className={i === me?.user.avatar ? 'on' : ''} onClick={async () => { await updateMe({ avatar: i }).catch(() => {}); closeSheet(); }}>
            <Avatar index={i} size={56} /><span>{f.name}</span><small>{f.desc}</small>
          </button>
        ))}
      </div>
    </Shell>
  );
}

export function Sheets() {
  const { sheet } = useApp();
  if (!sheet) return null;
  switch (sheet.kind) {
    case 'login': return <LoginSheet key="login" reason={sheet.reason} />;
    case 'reset': return <ResetSheet key="reset" />;
    case 'notify': return <NotifySheet key="notify" />;
    case 'email': return <EmailSheet key="email" />;
    case 'popup': return <PopupSheet key="popup" />;
    case 'share': return <ShareSheet key="share" />;
    case 'help': return <HelpSheet key="help" />;
    case 'avatar': return <AvatarSheet key="avatar" />;
  }
}
