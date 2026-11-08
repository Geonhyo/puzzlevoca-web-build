'use client';
/** 시트: 휴대폰은 아래에서 올라오고, 600px 부터는 가운데 모달 */
import { useEffect, useRef, useState } from 'react';
import { Avatar, CHARS } from './Avatar';
import { HelpRules } from './HelpRules';
import { IconBell, IconDownload, IconEye, IconEyeOff, IconLock, IconMail, IconShare, IconX } from './icons';
import { Countdown } from './site';
import { api, ApiError, type Me } from '@/lib/api';
import { drawShareCard, shareText } from '@/lib/share-card';
import { useApp } from '@/state/app';

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function Shell({ label, children }: { label: string; children: React.ReactNode }) {
  const { closeSheet } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const f = ref.current?.querySelector<HTMLElement>('input:not([type=checkbox])') ?? ref.current;
    f?.focus({ preventScroll: true });
    document.documentElement.classList.add('s-lock');
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSheet(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.documentElement.classList.remove('s-lock'); prev?.focus?.({ preventScroll: true }); };
  }, [closeSheet]);
  return (
    <div className="s-sheetOv">
      <div className="s-dim" onClick={closeSheet} />
      <div className="s-sheet" role="dialog" aria-modal="true" aria-label={label} ref={ref} tabIndex={-1}>
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

function Field(props: {
  id: string; label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete: string;
  aside?: React.ReactNode; inputMode?: 'email' | 'text'; onBlur?: () => void; noEye?: boolean; below?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const pw = props.type === 'password' && !props.noEye;
  return (
    <div className="s-field">
      <div className="s-fieldHead"><label htmlFor={props.id}>{props.label}</label>{props.aside}</div>
      <div className={pw ? 's-pw' : undefined}>
        <input id={props.id} name={props.id} type={pw && show ? 'text' : props.type} value={props.value} placeholder={props.placeholder} autoComplete={props.autoComplete}
          inputMode={props.inputMode} autoCapitalize="none" spellCheck={false} onChange={e => props.onChange(e.target.value)} onBlur={props.onBlur} />
        {pw ? (
          <button type="button" className="s-eye" aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'} aria-pressed={show} onClick={() => setShow(v => !v)}>
            {show ? <IconEyeOff /> : <IconEye />}
          </button>
        ) : null}
      </div>
      {props.below}
    </div>
  );
}

const ID_RE = /^[a-z0-9_]{4,16}$/;

/** 로그인 뒤 처리: 임시 비밀번호였으면 새 비밀번호 정하기, 알림 신청 중이었으면 알림 켜기 */
function useAfterAuth(reason?: string) {
  const { closeSheet, openSheet, updateMe } = useApp();
  return async (me: Me | null, usedTemp = false) => {
    if (usedTemp) { openSheet('newPassword'); return; }
    if (reason === 'notify') {
      if (me?.user.email) { await updateMe({ notifyEnabled: true }).catch(() => {}); closeSheet(); }
      else openSheet('notify');
      return;
    }
    closeSheet();
  };
}

function LoginSheet({ reason, prefill }: { reason?: string; prefill?: string }) {
  const { authenticate, openSheet } = useApp();
  const after = useAfterAuth(reason);
  const [id, setId] = useState(prefill ?? '');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim()) { setErr('이메일이나 아이디를 입력해주세요.'); return; }
    if (!pw) { setErr('비밀번호를 입력해주세요.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await authenticate(id.trim(), pw);
      await after(r.me, r.usedTempPassword);
    } catch (e2) {
      if (e2 instanceof ApiError && e2.status === 401) {
        // 로그인 실패: 이유를 구분하지 않는다. 아이디는 남기고 비밀번호는 비운 뒤 그 칸으로
        setErr('아이디나 비밀번호가 일치하지 않아요.');
        setPw('');
        requestAnimationFrame(() => document.getElementById('lpw')?.focus());
      } else {
        setErr(e2 instanceof ApiError ? e2.message : '잠시 후 다시 시도해주세요');
      }
    } finally { setBusy(false); }
  };
  return (
    <Shell label="로그인">
      <form className="s-form" onSubmit={submit} noValidate>
        <Head title="로그인" note={reason === 'notify' ? '로그인하면 알림을 받을 수 있어요.' : '이메일이나 아이디로 로그인해요.'} />
        <Field id="lid" label="이메일 또는 아이디" type="text" value={id} onChange={setId} autoComplete="username" inputMode="email" />
        <Field id="lpw" label="비밀번호" type="password" value={pw} onChange={setPw} autoComplete="current-password"
          aside={<button type="button" className="s-fieldLink" onClick={() => openSheet('reset', undefined, id.includes('@') ? id.trim() : undefined)}>비밀번호를 잊었어요</button>} />
        <p className="s-err" role="alert">{err}</p>
        <button type="submit" className="btn" disabled={busy}>로그인</button>
        <p className="s-switchLine">처음이라면 <button type="button" className="s-inlineBtn" onClick={() => openSheet('signup', reason)}>새 계정 만들기</button></p>
      </form>
    </Shell>
  );
}

type IdState = 'idle' | 'invalid' | 'checking' | 'ok' | 'taken';

function SignupSheet({ reason }: { reason?: string }) {
  const { signup, openSheet } = useApp();
  const after = useAfterAuth(reason);
  const [email, setEmail] = useState('');
  const [loginId, setLoginId] = useState('');
  const [pw, setPw] = useState('');
  const [idState, setIdState] = useState<IdState>('idle');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const id = loginId.trim().toLowerCase();

  // 이메일을 쓰면 아이디 추천 (아이디가 비어 있을 때)
  useEffect(() => {
    const e = email.trim();
    if (id || !validEmail(e)) { setSuggestion(null); return; }
    const ac = new AbortController();
    const t = setTimeout(() => api.idSuggest(e, ac.signal).then(r => setSuggestion(r.suggestion)).catch(() => {}), 300);
    return () => { clearTimeout(t); ac.abort(); };
  }, [email, id]);

  // 아이디를 치는 동안 쓸 수 있는지 확인
  useEffect(() => {
    if (!id) { setIdState('idle'); return; }
    if (!ID_RE.test(id)) { setIdState('invalid'); return; }
    setIdState('checking');
    const ac = new AbortController();
    const t = setTimeout(() => api.idCheck(id, ac.signal).then(r => setIdState(r.available ? 'ok' : 'taken')).catch(() => setIdState('idle')), 300);
    return () => { clearTimeout(t); ac.abort(); };
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validEmail(email.trim())) { setErr('이메일 주소를 확인해주세요.'); return; }
    if (!ID_RE.test(id)) { setErr('아이디는 영소문자, 숫자, _ 로 4~16자예요.'); return; }
    if (idState === 'taken') { setErr('이미 쓰고 있는 아이디예요.'); return; }
    if (pw.length < 8) { setErr('비밀번호는 8자 이상이에요.'); return; }
    setBusy(true); setErr('');
    try {
      await after(await signup(email.trim(), id, pw));
    } catch (e2) {
      if (e2 instanceof ApiError && e2.code === 'login_id_taken') setIdState('taken');
      setErr(e2 instanceof ApiError ? e2.message : '잠시 후 다시 시도해주세요');
    } finally { setBusy(false); }
  };
  const hint = idState === 'ok' ? <p className="s-hint ok">쓸 수 있는 아이디예요.</p>
    : idState === 'taken' ? <p className="s-hint err">이미 쓰고 있는 아이디예요.</p>
      : idState === 'invalid' ? <p className="s-hint err">영소문자, 숫자, _ 로 4~16자예요.</p> : null;
  return (
    <Shell label="새 계정 만들기">
      <form className="s-form" onSubmit={submit} noValidate>
        <Head title="새 계정 만들기" note="기록이 매일 쌓이고 순위에도 올라가요." />
        <Field id="semail" label="이메일" type="email" value={email} onChange={setEmail} placeholder="name@example.com" autoComplete="email" inputMode="email" />
        <Field id="sid" label="아이디" type="text" value={loginId} onChange={setLoginId} placeholder="영소문자, 숫자, _ 4~16자" autoComplete="username"
          below={<>{hint}{!id && suggestion ? (
            <div className="s-suggest"><span>추천</span><button type="button" className="s-chip" onClick={() => setLoginId(suggestion)}>{suggestion}</button></div>
          ) : null}</>} />
        <Field id="spw" label="비밀번호" type="password" value={pw} onChange={setPw} placeholder="8자 이상" autoComplete="new-password" />
        <p className="s-err" role="alert">{err}</p>
        <button type="submit" className="btn" disabled={busy}>가입하기</button>
        <p className="s-switchLine">이미 계정이 있다면 <button type="button" className="s-inlineBtn" onClick={() => openSheet('login', reason)}>로그인</button></p>
      </form>
    </Shell>
  );
}

function ResetSheet({ prefill }: { prefill?: string }) {
  const { openSheet } = useApp();
  const [email, setEmail] = useState(prefill ?? '');
  const [err, setErr] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validEmail(email.trim())) { setErr('이메일 주소를 확인해주세요.'); return; }
    setBusy(true); setErr('');
    try { setSentTo((await api.passwordReset(email.trim())).email); } catch (e2) { setErr(e2 instanceof ApiError ? e2.message : '잠시 후 다시 시도해주세요'); } finally { setBusy(false); }
  };
  if (sentTo) {
    return (
      <Shell label="임시 비밀번호를 보냈어요">
        <div className="s-bell"><IconMail /></div>
        <div className="s-sheetHead">
          <h2 className="s-sheetH">임시 비밀번호를 보냈어요</h2>
          <p className="s-note"><b>{sentTo}</b>로 보냈어요. 메일이 안 보이면 스팸함도 확인해주세요.</p>
        </div>
        <div className="s-infoBox">임시 비밀번호로 로그인하면 새 비밀번호를 정할 수 있어요.</div>
        <button type="button" className="btn" onClick={() => openSheet('login', undefined, sentTo)}>로그인하기</button>
      </Shell>
    );
  }
  return (
    <Shell label="비밀번호 찾기">
      <form className="s-form" onSubmit={submit} noValidate>
        <div className="s-bell"><IconLock /></div>
        <Head title="비밀번호 찾기" note="가입한 이메일을 입력하면 임시 비밀번호를 보내드려요." />
        <Field id="remail" label="이메일" type="email" value={email} onChange={setEmail} placeholder="name@example.com" autoComplete="email" inputMode="email" />
        <p className="s-err" role="alert">{err}</p>
        <button type="submit" className="btn" disabled={busy}>임시 비밀번호 받기</button>
        <button type="button" className="s-textBtn" onClick={() => openSheet('login')}>로그인으로 돌아가기</button>
      </form>
    </Shell>
  );
}

function NewPasswordSheet() {
  const { closeSheet } = useApp();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { setErr('비밀번호는 8자 이상이에요.'); return; }
    if (pw !== pw2) { setErr('두 비밀번호가 달라요.'); return; }
    setBusy(true); setErr('');
    try { await api.setPassword(pw); closeSheet(); } catch (e2) { setErr(e2 instanceof ApiError ? e2.message : '잠시 후 다시 시도해주세요'); } finally { setBusy(false); }
  };
  return (
    <Shell label="새 비밀번호를 정해주세요">
      <form className="s-form" onSubmit={submit} noValidate>
        <Head title="새 비밀번호를 정해주세요" note="임시 비밀번호로 로그인했어요. 앞으로 쓸 비밀번호로 바꿔주세요." />
        <Field id="npw" label="새 비밀번호" type="password" value={pw} onChange={setPw} placeholder="8자 이상" autoComplete="new-password" />
        <Field id="npw2" label="한 번 더" type="password" value={pw2} onChange={setPw2} autoComplete="new-password" />
        <p className="s-err" role="alert">{err}</p>
        <button type="submit" className="btn" disabled={busy}>바꾸기</button>
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
        <Head title={has ? '이메일' : '이메일 등록'} note="로그인, 비밀번호 찾기, 새 퍼즐 알림에 쓰는 메일이에요." />
        <Field id="email" label="이메일" type="email" value={v} onChange={setV} placeholder={has ? undefined : 'name@example.com'} autoComplete="email" />
        <p className="s-err" role="alert">{err}</p>
        <button type="submit" className="btn">{has ? '저장하기' : '등록하기'}</button>
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

/** 이 브라우저가 이미지 파일 공유(시스템 공유 시트)를 지원하는지. 화면 너비와 무관하게 기능으로만 판별한다. */
function canShareFiles() {
  try {
    if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
    const probe = new File([new Uint8Array([137, 80, 78, 71])], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

function ShareSheet() {
  const { result, board, puzzle, me } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const cv = useRef<HTMLCanvasElement | null>(null);
  const [shareable, setShareable] = useState(canShareFiles);
  const [saved, setSaved] = useState(false);
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
  // 파일명: puzzlevoca_{아이디}_{YYMMDD}.png (비로그인은 아이디 없이), 날짜는 퍼즐 날짜
  const yymmdd = (puzzle?.date ?? '').replace(/-/g, '').slice(2);
  const name = ['puzzlevoca', me?.user.loginId, yymmdd].filter(Boolean).join('_') + '.png';
  const blob = () => new Promise<Blob>((res, rej) => cv.current ? cv.current.toBlob(b => (b ? res(b) : rej(new Error('blob'))), 'image/png') : rej(new Error('no canvas')));
  const save = () => {
    if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setSaved(true);
  };
  const share = async () => {
    if (!result) return;
    try {
      const file = new File([await blob()], name, { type: 'image/png' });
      await navigator.share({ files: [file], text: shareText(result.summary) });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return; // 사용자가 공유 창을 닫음
      setShareable(false); // 공유가 실패하면 저장만 보여준다
    }
  };
  return (
    <Shell label="결과 카드 공유">
      <Head title="결과 카드" note="단어는 숨기고 판 모양만 보여줘요." center />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img className="s-shareImg" src={url} alt="오늘 결과 카드" /> : <div className="s-shareImg" aria-hidden="true" />}
      {shareable ? (
        <div className="s-col8">
          <button type="button" className="btn" onClick={share} disabled={!url}><IconShare />카드 공유하기</button>
          <button type="button" className="s-textBtn" onClick={save} disabled={!url}>{saved ? '저장했어요' : '이미지로 저장'}</button>
        </div>
      ) : (
        <button type="button" className="btn" onClick={save} disabled={!url}><IconDownload />{saved ? '저장했어요' : '이미지 저장'}</button>
      )}
    </Shell>
  );
}

function HelpSheet() {
  const { closeSheet } = useApp();
  return (
    <Shell label="도움말">
      <Head title="도움말" />
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
    case 'login': return <LoginSheet key={`login${sheet.prefill ?? ''}`} reason={sheet.reason} prefill={sheet.prefill} />;
    case 'signup': return <SignupSheet key="signup" reason={sheet.reason} />;
    case 'reset': return <ResetSheet key="reset" prefill={sheet.prefill} />;
    case 'newPassword': return <NewPasswordSheet key="newPassword" />;
    case 'notify': return <NotifySheet key="notify" />;
    case 'email': return <EmailSheet key="email" />;
    case 'popup': return <PopupSheet key="popup" />;
    case 'share': return <ShareSheet key="share" />;
    case 'help': return <HelpSheet key="help" />;
    case 'avatar': return <AvatarSheet key="avatar" />;
  }
}
