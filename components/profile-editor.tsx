'use client';
import { useEffect, useRef, useState } from 'react';
import { useAccountSession } from './account-session';
import type { VisitorCounts } from '@/lib/blog-visitors';
import { useLanguage } from '@/components/language-provider';
import { AVATAR_MAX, AVATAR_SIZE, EMPTY_PROFILE, INTRO_MAX, NAME_MAX, type Profile } from '@/lib/profile';

// 고른 사진을 가운데 기준 정사각형으로 잘라 256px WebP(안 되면 JPEG) data URL로 만든다.
async function resizeAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = AVATAR_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas');
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  for (const quality of [0.85, 0.7, 0.5]) {
    let url = canvas.toDataURL('image/webp', quality);
    if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', quality);
    if (url.length <= AVATAR_MAX) return url;
  }
  throw new Error('too large');
}

// 한 번 불러온 프로필은 탭이 열려 있는 동안 계정별로 재사용한다. 저장·공개 변경 때 함께 갱신한다.
// 계정별 프로필과 방문객 수. 화면을 오가도 다시 받지 않고, 방문객 수만 60초가 지나면 갱신한다.
const VISITS_FRESH_MS = 60_000;
type CacheEntry = { profile: Profile; visits: VisitorCounts | null; visitsAt: number };
// 메모리에 두고 sessionStorage에도 복사한다. 새로고침이나 다른 페이지에서 돌아와도
// 처음 그리는 순간부터 저장된 프로필을 보여줘 '불러오는 중'으로 깜빡이지 않게 한다.
const memoryCache = new Map<string, CacheEntry>();
const storageKey = (account: string) => `proving-profile-${account}`;
const profileCache = {
  get(account: string): CacheEntry | undefined {
    const hit = memoryCache.get(account);
    if (hit || typeof window === 'undefined') return hit;
    try {
      const stored = JSON.parse(sessionStorage.getItem(storageKey(account)) ?? 'null');
      if (stored?.profile && typeof stored.profile === 'object') { memoryCache.set(account, stored); return stored; }
    } catch { /* Storage may be unavailable or malformed. */ }
    return undefined;
  },
  set(account: string, entry: CacheEntry) {
    memoryCache.set(account, entry);
    try { sessionStorage.setItem(storageKey(account), JSON.stringify(entry)); } catch { /* Memory cache still works. */ }
  },
};

// 데스크톱은 hover·키보드 포커스로, 모바일은 탭으로 안내를 연다. 바깥을 누르거나 Esc로 닫는다.
function InfoTip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => { if (!(event.target instanceof Node && ref.current?.contains(event.target))) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <span ref={ref} className="info-tip" data-open={open || undefined}>
    <button type="button" aria-label={label} aria-expanded={open} aria-describedby="profile-sharing-info" onClick={() => setOpen(value => !value)}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>
    </button>
    <span id="profile-sharing-info" role="tooltip">{text}</span>
  </span>;
}

export function ProfileEditor({ accountName = '', active = true, showSharingSettings = false, onChanged }: { accountName?: string; active?: boolean; showSharingSettings?: boolean; onChanged?: () => void }) {
  const { language } = useLanguage();
  const { session, updateProfile } = useAccountSession();
  const account = session?.account ?? null;
  const en = language === 'en';
  const cached = account ? profileCache.get(account) : undefined;
  const [visits, setVisits] = useState<VisitorCounts | null>(() => cached?.visits ?? null);
  const [saved, setSavedState] = useState<Profile | null>(() => cached?.profile ?? null);
  const [form, setForm] = useState<Profile>(() => cached?.profile ?? EMPTY_PROFILE);
  function setSaved(profile: Profile) {
    setSavedState(profile);
    if (account) profileCache.set(account, { visits: null, visitsAt: 0, ...profileCache.get(account), profile });
  }
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sharingBusy, setSharingBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [copyNotice, setCopyNotice] = useState('');
  useEffect(() => {
    if (!copyNotice) return;
    const timer = setTimeout(() => setCopyNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [copyNotice]);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!active || !account) return;
    const entry = profileCache.get(account);
    // 로그인 정보가 늦게 도착한 경우에도 캐시가 있으면 바로 채워 빈 화면을 거치지 않는다.
    if (entry) {
      setSavedState(current => current ?? entry.profile);
      setForm(current => current === EMPTY_PROFILE ? entry.profile : current);
      if (entry.visits) setVisits(entry.visits);
      if (Date.now() - entry.visitsAt < VISITS_FRESH_MS) return;
    }
    const controller = new AbortController();
    const visitsOnly = Boolean(entry);
    fetch(visitsOnly ? '/api/profile?visits=1' : '/api/profile', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (controller.signal.aborted) return;
        const profile: Profile = visitsOnly ? profileCache.get(account)?.profile ?? data.profile : data.profile;
        if (!visitsOnly) { setSavedState(profile); setForm(profile); }
        profileCache.set(account, { profile, visits: data.visits ?? null, visitsAt: Date.now() });
        setVisits(data.visits ?? null);
      })
      .catch(error => { if (!controller.signal.aborted) setMessage(error.message || (visitsOnly ? (en ? 'Could not refresh visitor counts.' : '방문객 수를 갱신하지 못했어요.') : (en ? 'Could not load your profile.' : '프로필을 불러오지 못했어요.'))); });
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 언어가 바뀌어도 다시 받지 않는다.
  }, [active, account]);

  const publicPath = saved?.isPublic && saved.handle ? `/u/${saved.handle}` : '';
  const introLength = Array.from(form.intro).length;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy || introLength > INTRO_MAX) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: form.displayName, avatar: form.avatar, intro: form.intro }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSaved(data.profile); setForm(data.profile); setEditing(false);
      if(session?.account)updateProfile(session.account,data.profile);
      onChanged?.();
      setMessage(en ? 'Profile saved.' : '프로필을 저장했어요.');
    } catch (error) {
      setMessage((error as Error).message || (en ? 'Could not save your profile.' : '프로필을 저장하지 못했어요.'));
    } finally { setBusy(false); }
  }

  async function pickAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage('');
    try { const avatar = await resizeAvatar(file); setForm(current => ({ ...current, avatar })); }
    catch { setMessage(en ? 'Could not use that image. Try a JPG or PNG.' : '이 이미지는 쓸 수 없어요. JPG나 PNG로 다시 올려주세요.'); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(new URL(publicPath, session?.publicBaseUrl || location.origin).href); setCopyNotice(en ? 'Link copied.' : '링크를 복사했어요.'); }
    catch { setCopyNotice(en ? 'Could not copy the link. Try again.' : '링크를 복사하지 못했어요. 다시 시도해주세요.'); }
  }

  async function toggleSharing() {
    if (!saved || sharingBusy) return;
    setSharingBusy(true); setMessage('');
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isPublic: !saved.isPublic }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSaved(data.profile); setForm(data.profile);onChanged?.();
      setMessage(data.profile.isPublic ? (en ? 'Your profile is now public.' : '프로필을 공개했어요.') : (en ? 'Your profile is now private.' : '프로필을 비공개로 변경했어요.'));
    } catch (error) { setMessage(error instanceof Error ? error.message : (en ? 'Could not update visibility.' : '공개 설정을 변경하지 못했어요.')); }
    finally { setSharingBusy(false); }
  }

  const nameOf = (profile: Profile) => profile.displayName || session?.defaultName || accountName || (en ? 'My profile' : '내 프로필');
  const avatar = (profile: Profile) => profile.avatar
    // data URL이라 next/image 최적화가 필요 없다.
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className="profile-avatar-large" src={profile.avatar} alt="" />
    : <span className="profile-avatar-large" aria-hidden="true">{Array.from(nameOf(profile).trim())[0]?.toUpperCase() ?? 'P'}</span>;
  const startEditing = () => { if (saved) { setForm(saved); setEditing(true); setMessage(''); } };

  return <section className={saved ? "profile-card profile-card-preview" : "profile-card"} aria-label={en ? 'My profile' : '내 프로필'}>
    {!saved ? <p className="muted">{message || (en ? 'Loading profile…' : '프로필을 불러오는 중')}</p> : !editing ? <>
      <div className="blog-owner profile-preview">
        <header className="profile-card-toolbar">
          <button type="button" className="profile-edit-button" onClick={startEditing} aria-label={en ? 'Edit profile' : '프로필 편집'} title={en ? 'Edit profile' : '프로필 편집'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14.5 5.5 4 4M4 20l1-5L16 4a2.1 2.1 0 0 1 3 3L8 18l-4 2Z"/></svg>
          </button>
        </header>
        <div className="blog-owner-sidebar">
          <header className="blog-owner-header">
            {avatar(saved)}
            <div className="blog-owner-identity">
              <h2>{publicPath ? <button type="button" className="profile-name-copy" onClick={copyLink} title={en ? 'Copy profile link' : '프로필 링크 복사'}>
                {nameOf(saved)}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></svg>
              </button> : nameOf(saved)}</h2>
              {copyNotice && <span className="link-copy-feedback" role="status">{copyNotice}</span>}
            </div>
          </header>
          <dl className="blog-owner-visits">
            <div><dt>{en ? 'Total visitors' : '총 방문객'}</dt><dd>{visits?.total.toLocaleString(language) ?? '—'}</dd></div>
            <div><dt>{en ? 'Today' : '오늘 방문객'}</dt><dd>{visits?.today.toLocaleString(language) ?? '—'}</dd></div>
          </dl>
        </div>
        <div className="blog-owner-intro">
          {saved.intro.trim()
            ? <p className="profile-intro-text">{saved.intro}</p>
            : <p className="muted">{en ? 'Add a short description about yourself.' : '나를 소개하는 짧은 설명을 적어보세요.'}</p>}
        </div>
      </div>
    </> : <form className="profile-form blog-owner profile-preview profile-edit" onSubmit={save}>
      <div className="blog-owner-sidebar profile-edit-identity">
        <div className="profile-edit-photo">
          {avatar(form)}
          <div className="profile-avatar-actions">
            <button type="button" className="button secondary" onClick={() => fileRef.current?.click()}>{en ? 'Choose photo' : '사진 선택'}</button>
            {form.avatar && <button type="button" className="text-button" onClick={() => setForm({ ...form, avatar: null })}>{en ? 'Remove' : '사진 삭제'}</button>}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickAvatar} />
          </div>
        </div>
        <label>{en ? 'Name' : '이름'}<input value={form.displayName ?? ''} maxLength={NAME_MAX} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder={en ? 'Shown on your profile' : '프로필에 보일 이름'} /></label>
      </div>
      <div className="blog-owner-intro profile-edit-description">
        <label>{en ? 'Description' : '설명'}<textarea value={form.intro} rows={5} maxLength={INTRO_MAX} onChange={e => setForm({ ...form, intro: e.target.value })} placeholder={en ? 'What you study and why…' : '요즘 공부하는 것과 이유를 적어보세요.'} aria-invalid={introLength > INTRO_MAX} /></label>
        <small className={introLength > INTRO_MAX ? 'profile-error' : 'muted'}>{introLength}/{INTRO_MAX}</small>
        <div className="profile-actions">
          <button type="button" className="button secondary" onClick={() => { setForm(saved); setEditing(false); setMessage(''); }}>{en ? 'Cancel' : '취소'}</button>
          <button className="button primary" disabled={busy || introLength > INTRO_MAX}>{busy ? (en ? 'Saving…' : '저장 중') : (en ? 'Save' : '저장')}</button>
        </div>
      </div>
    </form>}
    {showSharingSettings && saved && !editing && <section className="profile-sharing-settings" aria-label={en ? 'Profile visibility' : '프로필 공개 설정'}>
      <div className="profile-sharing-row"><h3>{en ? 'Public profile' : '프로필 공개'}<InfoTip label={en ? 'About public profile' : '프로필 공개 안내'} text={en ? 'Anyone can find your profile in Explore and view your published study summaries.' : '탐색과 프로필 링크에서 누구나 프로필과 공개한 공부 요약을 볼 수 있어요.'}/></h3>
        <button type="button" className="profile-sharing-toggle" role="switch" aria-label={en ? 'Public profile' : '프로필 공개'} aria-checked={saved.isPublic} disabled={sharingBusy} onClick={()=>void toggleSharing()}><span aria-hidden="true" /></button>
      </div>
      {!saved.isPublic && <p>{en ? 'Your profile link is private. Individually published summaries keep their own visibility.' : '프로필 링크는 비공개입니다. 개별 요약의 공개 여부는 각 기록에서 관리해요.'}</p>}
    </section>}
    {saved && message && <p className="profile-message" role="status">{message}</p>}
  </section>;
}
