'use client';
import { StudyExamLibrary } from './study-exam-library';
import { StudyExamButton, useExamSelection } from './study-exam';
import { summaryPath } from '@/lib/summary-path';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSummaryEngagement, getServerSummaryEngagement, subscribeSummaryEngagement, studyNoteViews } from '@/lib/summary-engagement-client';
import { useAccountSession } from './account-session';
import { useLanguage } from '@/components/language-provider';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { dateKey, isStudyNote, markdown, transcript, STORAGE_KEY, streak, type StudyNote } from '@/lib/study';

import { NoteDownload } from '@/components/note-download';
import { RecordVisibility } from '@/components/record-visibility';
import { RecordComments } from '@/components/record-comments';
import { NoteReactions } from '@/components/note-reactions';
import { invalidateExploreCache } from '@/components/explore-summaries';
import { EmptyNotebook } from '@/components/empty-notebook';
import { ExploreRecords } from '@/components/explore-records';
import { EggGarden } from '@/components/egg-garden';
import { ProfileEditor } from '@/components/profile-editor';
import { StudyMarkdown } from '@/components/study-markdown';
import { writeStudy, type StoredStudyNote } from '@/lib/study-sync-client';
import { StudyChat, type Account } from '@/components/study-chat';
import type { PublicBlog } from '@/lib/public-blog';

type View = 'home' | 'notes' | 'connect' | 'exams';
const homeLimit = 3;
type FontMode = 'readable' | 'handwriting';
const fontModeStorageKey = 'proving-font-mode';
const fontModes: FontMode[] = ['readable', 'handwriting'];
type Theme = 'light' | 'dark';
const themeStorageKey = 'proving-theme';
function ThemeIcon({name}: {name: Theme}) {
  return <svg className="pref-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name==='dark'?<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>:<><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></>}</svg>;
}
function PrefIcon({name}: {name: FontMode}) {
  return <svg className="pref-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name==='readable'?<path d="M4 19 9 5l5 14M6 14h6M15 19v-6.5a2.5 2.5 0 0 1 5 0V19m-5-3.5h5"/>:<path d="m14.5 5.5 4 4M4 20l1-5L16 4a2.1 2.1 0 0 1 3 3L8 18l-4 2Z"/>}</svg>;
}
// 공개 메인은 소유자의 공부 요약을 보여주고, /workspace는 로그인한 사용자의 개인 공간이다.
const hostedSite = /^https:/.test(process.env.NEXT_PUBLIC_SITE_URL ?? '');
type VisitorCounts = { total: number; today: number };
function BlogOwner({owner, visits}: {owner: PublicBlog['owner'] | null; visits: VisitorCounts | null}) {
  const { language } = useLanguage();
  const name = owner?.name?.trim() || 'proving';
  const intro = owner?.intro.trim();
  return <section className="blog-owner" aria-label={language === 'en' ? 'About' : '소개'}>
    <div className="blog-owner-sidebar">
      <header className="blog-owner-header">
      {owner?.avatar
        ? <img className="blog-owner-avatar" src={owner.avatar} alt="" width={64} height={64}/>
        : <span className="blog-owner-avatar blog-owner-initial" aria-hidden="true">{Array.from(name)[0]}</span>}
      <div className="blog-owner-identity">
        <h2>{name}</h2>
      </div>
      </header>
      <dl className="blog-owner-visits">
        <div><dt>{language === 'en' ? 'Total visitors' : '총 방문객'}</dt><dd>{visits?.total.toLocaleString(language) ?? '—'}</dd></div>
        <div><dt>{language === 'en' ? 'Today' : '오늘 방문객'}</dt><dd>{visits?.today.toLocaleString(language) ?? '—'}</dd></div>
      </dl>
    </div>
    <div className="blog-owner-intro">
      {intro && <StudyMarkdown>{intro}</StudyMarkdown>}
    </div>
  </section>;
}
function Icon({name, size=20}: {name: string; size?: number}) {
  if(name==='egg')return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8 6c3-3 6 0 9-1 5-2 9 2 8 6-1 3 5 5 3 9-2 4-5 3-7 6-3 3-6 0-9 1-4 0-5-4-8-6-3-4 1-6 1-9 0-3 1-5 3-6Z" fill="#fffaf0" stroke="#b7aa8b" strokeWidth="1.4"/><circle cx="16" cy="16" r="6" fill="#eebd45"/><path d="M13 13c1-1 2-1.5 3-1.5" stroke="#fff1b1" strokeWidth="1.2" strokeLinecap="round"/></svg>;
  const paths: Record<string, React.ReactNode> = {
    chat: <><path d="M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z"/><path d="M8 8h8M8 12h5"/></>,
    books: <><path d="M3 4h5v16H3zM8 6h5v14H8zM14 5l5-1 3 15-5 1Z"/><path d="M3 8h5M8 10h5m2-1 5-1M3 17h10m4-1 4-1"/></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></>,
    book: <><path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/></>,
    link: <><path d="m10 13 4-4M8 15l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 6 0M16 9l2-2a4 4 0 0 1 5 5l-5 5a4 4 0 0 1-6 0" transform="translate(0 -1) scale(.95)"/></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,
    leaf: <><path d="M20 3C8 2 2 7 5 15c8 5 15-2 15-12Z"/><path d="M3 21 15 9"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.book}</svg>;
}
const emptyDraft = (date: string) => ({title:'', date, subject:'',  content:''});
export default function Home(props: {workspace?:boolean;exploring?:boolean;settings?:boolean;publicContent?:ReactNode}) {
  const {identityVersion}=useAccountSession();
  // 계정이 바뀌면 이전 사용자의 화면 상태를 버리려고 다시 마운트한다.
  // 설정 화면에서는 로그아웃·탈퇴 결과 안내가 사라지지 않게 떠날 때까지 미룬다.
  const mounted=useRef(identityVersion);
  if(!props.settings)mounted.current=identityVersion;
  return <HomeContent key={mounted.current} {...props}/>;
}
function HomeContent({ workspace = false, exploring = false, settings = false, publicContent }: { workspace?: boolean; exploring?: boolean; settings?: boolean; publicContent?: ReactNode }) {
  const router=useRouter();
  const {session,getSession}=useAccountSession();
  const examSelection=useExamSelection(session?.account);
  // 설정은 사이드바를 유지한 채 본문 자리에 보여준다.
  const showExplore=!settings&&(exploring||session?.account===null);
  const {language,setLanguage,t}=useLanguage();
  const [sidebarOpen,setSidebarOpen]=useState(true);
  const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
  const [mobile,setMobile]=useState(false);
  const pathname=usePathname();
  const mobileMenuButton=useRef<HTMLButtonElement>(null);
  const sidebarRef=useRef<HTMLElement>(null);
  const shellRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const query=window.matchMedia('(max-width: 600px)');
    const update=()=>{setMobile(query.matches);if(!query.matches)setMobileMenuOpen(false);};
    update();query.addEventListener('change',update);
    return()=>query.removeEventListener('change',update);
  },[]);
  // 모바일 키보드는 layout viewport를 줄이지 않을 수 있어 실제 보이는 영역을 따른다.
  useEffect(()=>{
    if(!mobile)return;
    const viewport=window.visualViewport;
    let frame=0;
    const update=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        if(viewport&&viewport.scale!==1)return;
        shellRef.current?.style.setProperty('--mobile-viewport-height',`${viewport?.height??window.innerHeight}px`);
        shellRef.current?.style.setProperty('--mobile-viewport-top',`${viewport?.offsetTop??0}px`);
      });
    };
    update();
    viewport?.addEventListener('resize',update);
    viewport?.addEventListener('scroll',update);
    window.addEventListener('resize',update);
    return()=>{
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize',update);
      viewport?.removeEventListener('scroll',update);
      window.removeEventListener('resize',update);
      shellRef.current?.style.removeProperty('--mobile-viewport-height');
      shellRef.current?.style.removeProperty('--mobile-viewport-top');
    };
  },[mobile]);
  useEffect(()=>setMobileMenuOpen(false),[pathname]);
  useEffect(()=>{
    if(!mobileMenuOpen||!mobile)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    sidebarRef.current?.querySelector<HTMLButtonElement>('.mobile-menu-close')?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();setMobileMenuOpen(false);}
      if(event.key==='Tab'){
        const items=Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled)')??[]).filter(item=>item.getClientRects().length>0);
        const first=items[0],last=items.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',onKey);
    return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',onKey);mobileMenuButton.current?.focus();};
  },[mobileMenuOpen,mobile]);
  const [examId,setExamId]=useState<string|null>(null);
  const [view,setView]=useState<View>(hostedSite&&!workspace?'home':'connect');
  const [blog,setBlog]=useState<PublicBlog['owner']|null>(null);
  const [visits,setVisits]=useState<VisitorCounts|null>(null);
  const visitRequest=useRef<Promise<VisitorCounts|null>|null>(null);
  const siteMode=hostedSite&&!workspace;
  useEffect(()=>{if(siteMode)void getSession().catch(()=>{});},[siteMode,getSession]);
  const [fontMode, setFontMode] = useState<FontMode>('handwriting');
  // The layout's head script already applied the saved mode to <html>; sync state from it.
  useEffect(() => { if (document.documentElement.dataset.fontMode === 'readable') setFontMode('readable'); }, []);

  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => { if (document.documentElement.dataset.theme === 'dark') setTheme('dark'); }, []);
  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(themeStorageKey, next); } catch {}
  }

  function selectFontMode(mode: FontMode) {
    setFontMode(mode);
    document.documentElement.dataset.fontMode = mode;
    try { localStorage.setItem(fontModeStorageKey, mode); } catch {}
  }
  const engagement=useSyncExternalStore(subscribeSummaryEngagement,getSummaryEngagement,getServerSummaryEngagement);
  const [storedNotes,setNotes]=useState<StudyNote[]>([]);
  const notes=useMemo(()=>storedNotes.map(note=>({...note,views:studyNoteViews(note,engagement)})),[storedNotes,engagement]);
  const [ready,setReady]=useState(false);
  const [recordBusy,setRecordBusy]=useState(false);
  const [workspaceError,setWorkspaceError]=useState('');
  const [publicationNotice,setPublicationNotice]=useState('');
  const onRecordsLoaded=useCallback((records:StoredStudyNote[], ownerId:string)=>{
    setNotes(previous=>[
      ...records.map(record=>({...record,ownerId,views:record.views??0})),
      ...previous.filter(note=>!note.cloud && !records.some(record=>record.id===note.id)),
    ]);
  },[]);
  const [storageKey,setStorageKey]=useState(STORAGE_KEY);
  const [signedIn,setSignedIn]=useState(false);
  const [accountName,setAccountName]=useState('');
  const [profileRevision,setProfileRevision]=useState(0);
  useEffect(()=>{const changed=()=>setProfileRevision(value=>value+1);window.addEventListener('proving-profile-updated',changed);return()=>window.removeEventListener('proving-profile-updated',changed);},[]);
  const [accountId,setAccountId]=useState<string|null>(null);
  const onAccount=useCallback((account:Account|null)=>{
    setSignedIn(Boolean(account));setAccountId(account?.account??null);setAccountName(account?.name??'');
    if(!account)setView('connect');
    setStorageKey(account?`${STORAGE_KEY}-${account.account}`:STORAGE_KEY);
  },[]);
  const [today,setToday]=useState('');
  const [month,setMonth]=useState(new Date(2026,10,1));
  const [selectedDay,setSelectedDay]=useState<string|null>(null);
  const [search,setSearch]=useState('');
  const [sortBy,setSortBy]=useState<'latest'|'views'>('latest');
  const [subject,setSubject]=useState('전체');
  const [editing,setEditing]=useState<string|null>(null);
  const [editor,setEditor]=useState(false);
  const [draft,setDraft]=useState(emptyDraft(''));
  const [storedDetail,setDetail]=useState<StudyNote|null>(null);
  const detail=useMemo(()=>storedDetail?{...storedDetail,views:studyNoteViews(storedDetail,engagement)}:null,[storedDetail,engagement]);
  const [resume,setResume]=useState<{key:string;note:StudyNote}|null>(null);
  const [,setNotice]=useState('');
  const [detailView,setDetailView]=useState<'summary'|'original'>('summary');
  const [detailNotice,setDetailNotice]=useState('');
  useEffect(()=>{setDetailView('summary');setDetailNotice('');},[detail?.id]);
  useEffect(()=>{
    if(!siteMode||!session?.account)return;
    let active=true;
    visitRequest.current ??= fetch('/api/public/visit', { method: 'POST' })
      .then(response => response.ok ? response.json() : null).catch(() => null);
    void visitRequest.current.then(counts => { if(active) setVisits(counts); });
    fetch('/api/public').then(response=>response.ok?response.json():null).then((data:PublicBlog|null)=>{
      if(!active)return;
      if(data){
        setNotes(data.records.map(record=>({...record,cloud:true as const})));
        setBlog(data.owner);
      }
      setReady(true);
    }).catch(()=>{if(active)setReady(true);});
    return()=>{active=false;};
  },[siteMode,session?.account]);
  const [storageError,setStorageError]=useState(false);
  const dialogRef=useRef<HTMLDialogElement>(null);
  const detailRef=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const now=new Date();setToday(dateKey(now));setMonth(new Date(now.getFullYear(),now.getMonth(),1));
    // 블로그 모드는 공개 기록만 보여주므로 이 브라우저의 저장 기록은 읽지 않는다.
    if(!siteMode){
      setReady(false);setStorageError(false);
      try { const raw=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(raw)||!raw.every(isStudyNote))throw new Error();setNotes(previous=>{const restored=raw.map(note=>({...note,ownerId:note.ownerId??(storageKey.startsWith(`${STORAGE_KEY}-`)?storageKey.slice(STORAGE_KEY.length+1):undefined)}));const owner=storageKey.startsWith(`${STORAGE_KEY}-`)?storageKey.slice(STORAGE_KEY.length+1):undefined;const cloud=previous.filter(note=>note.cloud&&note.ownerId===owner);return [...cloud,...restored.filter(note=>!cloud.some(current=>current.id===note.id))];}); }
      catch {setNotes([]);setStorageError(true);setNotice('기존 기록을 읽지 못했습니다. 저장 공간을 확인한 뒤 새로고침해주세요.');}
      setReady(true);
    }
    const timer=setInterval(()=>setToday(dateKey()),30000);return()=>clearInterval(timer);
  },[storageKey,siteMode]);
  useEffect(()=>{if(editor)dialogRef.current?.showModal();else dialogRef.current?.close();},[editor]);
  useEffect(()=>{if(detail)detailRef.current?.showModal();else detailRef.current?.close();},[detail]);
  function persist(next: StudyNote[]) {
    if(storageError){setNotice('기존 기록 보호를 위해 저장이 중지되었습니다. 저장 공간을 확인한 뒤 새로고침해주세요.');return false;}
    try {localStorage.setItem(storageKey,JSON.stringify(next.map(note=>note.cloud?{...note,messages:undefined}:note)));setNotes(next);return true;}
    catch {setNotice('저장하지 못했습니다. 브라우저 저장 공간을 확인해주세요.');return false;}
  }
  function openDetail(note:StudyNote){
    if(siteMode||note.cloud){setDetail(note);return;}
    const next={...note,views:(note.views??0)+1};
    if(persist(notes.map(n=>n.id===note.id?next:n))||note.cloud)setDetail(next);
  }
  function openEditor(note?: StudyNote){setDetail(null);setEditing(note?.id??null);setDraft(note?{title:note.title,date:note.date,subject:note.subject,content:note.content}:emptyDraft(today));setEditor(true);}
  async function save(e:FormEvent){
    e.preventDefault();
    if(recordBusy||!draft.title.trim()||!draft.content.trim())return;
    const note:StudyNote={...notes.find(note=>note.id===editing),...draft,title:draft.title.trim(),subject:draft.subject.trim()||'기타',id:editing||crypto.randomUUID(),updatedAt:new Date().toISOString(),ownerId:accountId??undefined};
    setRecordBusy(true);
    try {
      if (note.cloud && accountId) await writeStudy(accountId, {action:'edit-record',note});
      if (note.cloud) {
        setNotes(previous=>[note,...previous.filter(item=>item.id!==note.id)]);
        setEditor(false);
      } else if(persist([note,...notes.filter(item=>item.id!==note.id)])) setEditor(false);
    } catch(error) {
      setDetailNotice(error instanceof Error?error.message:'기록을 수정하지 못했습니다.');
    } finally { setRecordBusy(false); }
  }
  async function publishRecord(note: StudyNote, publish: boolean) {
    if (!accountId || note.ownerId !== accountId || !note.cloud || recordBusy) return;
    setRecordBusy(true);setDetailNotice('');setPublicationNotice('');
    try {
      const result = await writeStudy(accountId, { action: publish ? 'publish-record' : 'unpublish-record', id: note.id });
      invalidateExploreCache();
      const updated = { ...note, publicId: result.publicId, publicUrl: result.publicUrl, views: note.publicId===result.publicId?note.views:0 };
      setNotes(previous => previous.map(item => item.id === note.id ? updated : item));
      setDetail(previous => previous?.id === note.id ? updated : previous);
      const message=publish ? (language==='en'?'Summary is public and included in public collections.':'공개로 설정했습니다. 전체 공개 목록과 공개 프로필에 표시됩니다.') : (language==='en'?'Summary is private and removed from public collections.':'비공개로 설정했습니다. 공개 목록과 공유 주소에서 제외됩니다.');
      setDetailNotice(message);setPublicationNotice(message);
    } catch (error) {
      const message=error instanceof Error ? error.message : '공개 설정을 변경하지 못했습니다.';
      setDetailNotice(message);setPublicationNotice(message);
    }
    finally { setRecordBusy(false); }
  }

  async function removeRecord(note:StudyNote, originalOnly:boolean) {
    if (!accountId || note.ownerId!==accountId || recordBusy) return;
    const message = originalOnly
      ? (language==='en'?'Delete the original conversation? The summary will remain.':'원본 대화를 삭제할까요? 공부 요약은 남습니다.')
      : (language==='en'?'Delete this note?':'이 노트를 삭제할까요?');
    if(!confirm(message))return;
    setRecordBusy(true);
    try {
      if(note.cloud) await writeStudy(accountId,{action:originalOnly?'delete-original':'delete-record',id:note.id});
      const updated={...note,messages:undefined};
      const next=originalOnly?notes.map(item=>item.id===note.id?updated:item):notes.filter(item=>item.id!==note.id);
      const persisted=persist(next);
      if(persisted||note.cloud){
        if(!persisted)setNotes(next);
        setDetail(originalOnly?updated:null);
        if(originalOnly)setDetailNotice(language==='en'?'Original conversation deleted.':'원본 대화를 삭제했습니다.');
      }
    } catch(error) {
      setDetailNotice(error instanceof Error?error.message:'기록을 삭제하지 못했습니다.');
    } finally { setRecordBusy(false); }
  }

  function download(note:StudyNote){const url=URL.createObjectURL(new Blob([markdown(note,language)],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${note.date}-${note.title.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_')}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('Markdown 파일을 내려받았어요.');}
  function downloadOriginal(note:StudyNote){
    if(!accountId||note.ownerId!==accountId||!note.messages?.length)return;
    const url=URL.createObjectURL(new Blob([transcript(note,language)],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=`${note.date}-${note.title.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_')}-${language==='en'?'conversation':'원본대화'}.txt`;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);setDetailNotice(t('원본 대화를 TXT로 내려받았습니다.'));
  }
  async function copyOriginal(note:StudyNote){
    if(!accountId||note.ownerId!==accountId||!note.messages?.length)return;
    try{await navigator.clipboard.writeText(transcript(note,language));setDetailNotice(t('원본 대화를 복사했습니다.'));}
    catch{setDetailNotice(t('복사하지 못했습니다. 아래 텍스트를 선택해 복사하거나 TXT로 내려받아주세요.'));}
  }
  // 공개한 기록의 페이지 주소(배포 사이트 기준 publicUrl)를 복사한다. 비공개 기록은 링크로 열 수 없으므로 공개를 안내한다.
  async function copyRecordLink(note:StudyNote){
    if(!note.publicId){setDetailNotice(language==='en'?'Make this note public to share its link.':'공개로 바꾸면 링크를 공유할 수 있어요.');return;}
    try{await navigator.clipboard.writeText(note.publicUrl||new URL(summaryPath({id:note.publicId!,title:note.title}),location.origin).href);setDetailNotice(language==='en'?'Link copied.':'링크를 복사했어요.');}
    catch{setDetailNotice(language==='en'?'Could not copy the link. Try again.':'링크를 복사하지 못했어요. 다시 시도해주세요.');}
  }
  const sorted=[...notes].sort((a,b)=>{
    const rank=view==='notes'&&sortBy==='views'?(b.views??0)-(a.views??0):0;
    return rank||b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt);
  });
  const monthPrefix=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}`;
  const monthNotes=notes.filter(n=>n.date.startsWith(monthPrefix));
  const daysStudied=new Set(monthNotes.map(n=>n.date)).size;
  const filtered=sorted.filter(n=>(subject==='전체'||n.subject===subject)&&(!selectedDay||n.date===selectedDay)&&`${n.title} ${n.content} ${n.subject}`.toLowerCase().includes(search.toLowerCase()));
  // 개요는 최근(또는 선택한 날짜의) 노트 3개만 보여주고 나머지는 기록 화면에서 본다.
  function showMore(){setView('notes');setSearch('');setSubject('전체');}
  function changeView(next:View){setMobileMenuOpen(false);if(siteMode?next==='connect':next!=='connect'&&!signedIn)return;if(exploring||settings){router.push('/workspace');if(next===view)return;}setView(next);setSelectedDay(null);setSearch('');setSubject('전체');}
  const sourceNote=detail?.sourceId?notes.find(note=>note.id===detail.sourceId):undefined;
  const ownsDetail=Boolean(accountId&&detail?.ownerId===accountId);
  const sidebarToggle = (
    <button className="sidebar-toggle" type="button" aria-expanded={sidebarOpen} aria-controls="workspace-sidebar"
      aria-label={language==='en'?(sidebarOpen?'Close sidebar':'Open sidebar'):(sidebarOpen?'사이드바 닫기':'사이드바 열기')}
      title={language==='en'?(sidebarOpen?'Close sidebar':'Open sidebar'):(sidebarOpen?'사이드바 닫기':'사이드바 열기')}
      onClick={()=>setSidebarOpen(open=>!open)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>
        <path d={sidebarOpen?'m15 9-3 3 3 3':'m13 9 3 3-3 3'}/>
      </svg>
    </button>
  );
  return <div ref={shellRef} className={`app-shell ${!settings&&!showExplore&&view==='connect'?'study-layout':''} ${sidebarOpen?'':'sidebar-collapsed'} ${mobileMenuOpen?'mobile-menu-open':''}`}>
    <header className="mobile-topbar" inert={mobileMenuOpen}>
      <button ref={mobileMenuButton} className="mobile-menu-button" type="button" aria-label={language==='en'?'Open menu':'메뉴 열기'} aria-expanded={mobileMenuOpen} aria-controls="workspace-sidebar" onClick={()=>setMobileMenuOpen(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <Link href="/" className="mobile-brand" aria-label={t('proving 홈')}><Image src="/proving-logo.png" alt="Proving" width={1306} height={428} className="brand-logo brand-logo-light"/><Image src="/proving-logo-dark.png" alt="" width={1306} height={428} className="brand-logo brand-logo-dark"/></Link>
    </header>
    {!sidebarOpen&&sidebarToggle}
    <aside ref={sidebarRef} id="workspace-sidebar" className="sidebar" inert={mobile?!mobileMenuOpen:!sidebarOpen} role={mobile&&mobileMenuOpen?'dialog':undefined} aria-modal={mobile&&mobileMenuOpen?true:undefined} aria-label={mobile&&mobileMenuOpen?(language==='en'?'Menu':'메뉴'):undefined}><header className="sidebar-header"><button type="button" className="mobile-menu-close" aria-label={language==='en'?'Close menu':'메뉴 닫기'} onClick={()=>setMobileMenuOpen(false)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><a className="brand" href="/" aria-label={t('proving 홈')}><Image src="/proving-logo.png" alt="Proving" width={1306} height={428} sizes="100px" className="brand-logo brand-logo-light" /><Image src="/proving-logo-dark.png" alt="" width={1306} height={428} sizes="100px" className="brand-logo brand-logo-dark" /></a>{sidebarOpen&&sidebarToggle}</header><nav aria-label={t('메인 메뉴')} onClick={event=>{if((event.target as HTMLElement).closest('a,button'))setMobileMenuOpen(false);}}>{([{id:'connect',icon:'chat',label:t('공부 중')},{id:'home',icon:'egg',label:t('프로필')},{id:'notes',icon:'books',label:t('기록')},{id:'exams',icon:'books',label:language==='en'?'Exams':'시험지'}] as const).filter(item=>Boolean(session?.account)&&(siteMode?item.id!=='connect':signedIn)).map(item=><button key={item.id} className={!settings&&!showExplore&&view===item.id?'nav-item active':'nav-item'} onClick={()=>{if(item.id==='exams')setExamId(null);changeView(item.id);}}><Icon name={item.icon}/>{item.label}{item.id==='notes'&&<span className="nav-count">{notes.length}</span>}</button>)}<Link href="/explore" className={showExplore?'nav-item active':'nav-item'} aria-current={showExplore?'page':undefined}><Icon name="search"/>{language==='en'?'Explore':'탐색'}</Link></nav><div className="sidebar-bottom">
      <div className="sidebar-preferences">
        <div className="language-switch font-mode-switch" role="group" aria-label={language==='ko'?'글꼴 모드':'Font mode'}>
          {fontModes.map(mode=>(
            <label key={mode} title={mode==='readable'?(language==='ko'?'가독성 모드':'Reading'):(language==='ko'?'필기 모드':'Handwriting')}>
              <input type="radio" name="font-mode" value={mode} checked={fontMode===mode} onChange={()=>selectFontMode(mode)} />
              <span><PrefIcon name={mode}/><span className="pref-label">{mode==='readable'?(language==='ko'?'가독성 모드':'Reading'):(language==='ko'?'필기 모드':'Handwriting')}</span></span>
            </label>
          ))}
        </div>
        <div className="language-switch" data-language={language} role="group" aria-label={language==='ko'?'언어 선택':'Language'}>
          <button aria-pressed={language==='ko'} title="한국어" onClick={()=>setLanguage('ko')}><span className="pref-icon pref-glyph" aria-hidden="true">가</span><span className="pref-label">한국어</span></button>
          <button aria-pressed={language==='en'} title="English" onClick={()=>setLanguage('en')}><span className="pref-icon pref-glyph" aria-hidden="true">A</span><span className="pref-label">English</span></button>
        </div>
        <button className="theme-toggle" aria-pressed={theme==='dark'} title={language==='ko'?'다크 모드':'Dark mode'} onClick={toggleTheme}><ThemeIcon name={theme==='dark'?'dark':'light'}/><span className="pref-label">{language==='ko'?'다크 모드':'Dark mode'}</span></button>
      </div>
      {siteMode&&<a className="button secondary" href="/workspace">{language==='en'?'My workspace · GitHub sign in':'내 공부방 · GitHub 로그인'}</a>}
      <div id="sidebar-account"/>
    </div></aside>
    <div className="main-shell" inert={mobile&&mobileMenuOpen}>
    <main>
    {settings&&<div className="explore-content settings-content">{publicContent}</div>}
    {showExplore&&<div className="explore-content">{exploring?publicContent:<ExploreRecords/>}</div>}
    <div className="workspace-content" hidden={settings||showExplore||siteMode&&!session}>

    {!siteMode&&signedIn&&view!=='connect'&&workspaceError&&<p role="alert" className="chat-error">{workspaceError} <button className="text-button" onClick={()=>changeView('connect')}>연결 다시 확인</button></p>}
    {!siteMode&&signedIn&&<div hidden={view!=='home'}><ProfileEditor key={`${accountId}-${profileRevision}`} accountName={accountName} active={!exploring&&view==='home'}/></div>}
    {(signedIn||siteMode)&&view==='home'&&<>
      {siteMode&&<BlogOwner owner={blog} visits={visits}/>}
      <section className="stats" aria-label={t('공부 통계')}>
        <article><p>{language==='ko'?'연속':'Streak'}</p><strong>{today?streak(notes,today):0}<small>{language==='ko'?'일':today&&streak(notes,today)===1?'day':'days'}</small></strong></article>
        <article><p>{language==='ko'?`${month.getMonth()+1}월 횟수`:`${month.toLocaleDateString('en-US',{month:'short'})} sessions`}</p><strong>{monthNotes.length}<small>{language==='ko'?'회':monthNotes.length===1?'session':'sessions'}</small></strong></article>
        <article><p>Total</p><strong>{notes.length}<small>{language==='ko'?'개':notes.length===1?'note':'notes'}</small></strong></article>
      </section>
      <EggGarden notes={notes} today={today} selected={selectedDay} onSelect={setSelectedDay}/>
    </>}
    {(signedIn||siteMode)&&(view==='home'||view==='notes')&&<section className={`notes-section ${view==='notes'?'full-notes':''}`}>{view!=='notes'&&<div className="section-title"><div><h2>{selectedDay?(language==='ko'?`${selectedDay.slice(0,4)}년${selectedDay.slice(5,7)}월${selectedDay.slice(8,10)}일 공부노트`:`Study notes · ${new Date(`${selectedDay}T12:00:00`).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})}`):view==='home'?t('최근 공부 노트'):t('저장한 노트')}{!selectedDay&&<span className="inline-count">{view==='home'?notes.length:filtered.length}</span>}</h2></div></div>}{view==='notes'&&session?.account&&<div className="exam-toolbar"><div><span>{language==='en'?'Selected':'선택한 기록'} {examSelection.ids.length}/3</span><div className="exam-selected">{examSelection.ids.map(id=><button type="button" className="exam-selected-chip" key={id} onClick={()=>examSelection.toggle(id)} aria-label={`${language==='en'?'Deselect':'선택 해제'}: ${notes.find(n=>n.id===id)?.title??id}`}>{notes.find(n=>n.id===id)?.title??(language==='en'?'Selected record':'선택한 기록')} ×</button>)}</div></div><StudyExamButton key={session.account} notes={notes.filter(n=>examSelection.ids.includes(n.id)&&(!n.ownerId||n.ownerId===session.account))} account={session.account} onCreated={id=>{setExamId(id);changeView('exams');}}/>{examSelection.error&&<p role="alert">{language==='en'?'Could not save selected notes.':'기록 선택을 브라우저에 저장하지 못했습니다.'}</p>}</div>}{view==='notes'&&<div className="notes-tools"><label className="search-box"><Icon name="search" size={18}/><input aria-label={t('노트 검색')} placeholder={t('제목, 주제, 내용 검색')} value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label={language==='en'?'Sort notes':'노트 정렬'} value={sortBy} onChange={e=>setSortBy(e.target.value as 'latest'|'views')}><option value="latest">{language==='en'?'Newest':'최신순'}</option><option value="views">{language==='en'?'Most viewed':'조회수 많은순'}</option></select><span className="notes-result-count">{filtered.length}{language==='en'?' notes':'개'}</span></div>}{!ready?<div className="empty-state">{t('기록을 불러오고 있어요.')}</div>:filtered.length?<div className="notes-ledger">{publicationNotice&&<p className="publication-notice" role="status">{publicationNotice}</p>}<table><thead><tr>{view==='notes'&&session?.account&&<th scope="col" className="exam-select-cell">{language==='en'?'Select':'선택'}</th>}<th scope="col">{language==='en'?'Date':'날짜'}</th><th scope="col">{language==='en'?'Title':'제목'}</th>{!siteMode&&<th scope="col" className="ledger-views">{language==='en'?'Views':'조회'}</th>}{!siteMode&&<th scope="col" className="ledger-visibility">{language==='en'?'Visibility':'공개 여부'}</th>}<th scope="col"><span className="ledger-download-heading">{language==='en'?'Download':'다운로드'}</span></th></tr></thead><tbody>{(view==='home'?filtered.slice(0,homeLimit):filtered).map(note=><tr key={note.id}>{view==='notes'&&session?.account&&<td className="exam-select-cell"><input type="checkbox" aria-label={`${language==='en'?'Select record':'기록 선택'}: ${note.title}`} checked={examSelection.ids.includes(note.id)} disabled={!examSelection.ready||(!examSelection.ids.includes(note.id)&&(examSelection.ids.length>=3||note.content.length>30000||!!note.ownerId&&note.ownerId!==session.account))} onChange={()=>examSelection.toggle(note.id)}/></td>}<td><time dateTime={note.date}>{note.date.replaceAll('-','.')}</time></td><td className="ledger-title">{siteMode?<a href={summaryPath(note)}>{note.title}</a>:<button onClick={()=>openDetail(note)}>{note.title}</button>}</td>{!siteMode&&<td className="ledger-views">{note.views??0}</td>}{!siteMode&&<td>{note.cloud&&note.ownerId===accountId?<RecordVisibility title={note.title} isPublic={Boolean(note.publicId)} disabled={recordBusy} english={language==='en'} showLabel={false} onChange={value=>void publishRecord(note,value)}/>:<span className="muted" title={language==='en'?'Stored only on this device':'이 기기에만 저장된 기록입니다.'}>{language==='en'?'Private · local':'비공개 · 기기 저장'}</span>}</td>}<td><NoteDownload iconOnly note={note} english={language==='en'} onMarkdown={()=>download(note)} onOriginal={accountId===note.ownerId&&note.messages?.length?()=>downloadOriginal(note):undefined}/></td></tr>)}</tbody></table>{view==='home'&&filtered.length>homeLimit&&<button className="text-button notes-more" onClick={showMore}>{t('기록에서 더보기')} <Icon name="arrow" size={16}/></button>}</div>:<div className="empty-state">{selectedDay&&selectedDay<today?<><EmptyNotebook/><h3>{language==='en'?`No study records for ${selectedDay.replaceAll('-','.')}.`:`${selectedDay.replaceAll('-','.')}에는 공부 기록이 존재하지 않아요`}</h3></>:<><h3>{search||subject!=='전체'||selectedDay?t('아직 해당하는 기록이 없어요'):t('아직 공부 노트가 없습니다')}</h3><p>{search||subject!=='전체'?t('검색어나 주제를 바꿔보세요.'):t('공부한 내용을 기록하면 이곳에 표시됩니다.')}</p>{!siteMode&&<button className="text-button" onClick={()=>changeView('connect')}>{t('GPT와 공부하기')} <Icon name="arrow" size={16}/></button>}</>}</div>}</section>}
    {session?.account&&view==='exams'&&<StudyExamLibrary key={session.account} account={session.account} initialId={examId} onRecordSelect={()=>changeView('notes')}/>}
    {!siteMode&&<div className="study-container" hidden={view!=='connect'}><StudyChat onWorkspaceError={setWorkspaceError} resume={resume} onAccount={onAccount} onRecordsLoaded={onRecordsLoaded} onRecord={note=>{invalidateExploreCache();setNotes(previous=>[{...note,ownerId:accountId??undefined},...previous.filter(n=>n.id!==note.id)]);}}/></div>}
    </div>{!exploring&&!settings&&<footer><span>proving</span><span>{t('개인 공부 기록')}</span></footer>}</main></div>
    <dialog ref={dialogRef} className="editor-dialog" onCancel={()=>setEditor(false)} onClick={e=>{if(e.target===e.currentTarget)setEditor(false);}}><form onSubmit={save}><div className="dialog-heading"><div><h2>{editing?t('공부 노트 수정'):t('공부 기록하기')}</h2></div><button type="button" className="close-button" aria-label={t('닫기')} onClick={()=>setEditor(false)}>×</button></div><label>{t('무엇을 공부했나요?')}<input autoFocus required maxLength={100} placeholder={language==='en'?'e.g. PostgreSQL primary and foreign keys':'예: PostgreSQL의 기본 키와 외래 키'} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><div><label>{t('공부 날짜')}<input type="date" required max={today} value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label></div><label>{t('주제')}<input maxLength={40} placeholder={language==='en'?'e.g. Databases, English, reading':'예: 데이터베이스, 영어, 독서'} value={draft.subject} onChange={e=>setDraft({...draft,subject:e.target.value})}/></label><label>{t('공부 노트')}<span className="label-hint">{t('Markdown으로 작성할 수 있어요')}</span><textarea required rows={9} maxLength={100000} placeholder={language==='en'?'## What I learned\n\n## What needs clarification\n\n## Review questions':'## 오늘 배운 것\n\n## 헷갈렸던 내용\n\n## 다시 떠올려 볼 질문'} value={draft.content} onChange={e=>setDraft({...draft,content:e.target.value})}/></label>{detailNotice&&<p role="status">{detailNotice}</p>}<div className="form-bottom"><span>{language==='ko'?'기록하면 해당 날짜에 저장됩니다.':'Saved under the selected date.'}</span><button className="button primary" disabled={storageError||recordBusy} type="submit">{t('노트 저장하기')}<Icon name="check" size={17}/></button></div></form></dialog>
    <dialog ref={detailRef} className="detail-dialog" onCancel={()=>setDetail(null)} onClick={e=>{if(e.target===e.currentTarget)setDetail(null);}}>{detail&&<><div className="dialog-heading"><h2>{detail.title}</h2><button className="close-button" onClick={()=>setDetail(null)} aria-label={t('닫기')}>×</button></div><div className="detail-meta-row"><div className="detail-meta"><time>{detail.date}</time>{!siteMode&&<span>{language==='en'?'Views':'조회'} {detail.views??0}</span>}</div><div className="detail-actions">{!siteMode&&<button className="text-button delete" disabled={recordBusy} onClick={()=>void removeRecord(detail,false)}>{t('삭제')}</button>}<div>{ownsDetail&&detail.cloud&&<button type="button" className="button secondary detail-copy-link" title={detail.publicId?undefined:(language==='en'?'Public notes only':'공개한 기록만 링크로 볼 수 있어요')} onClick={()=>void copyRecordLink(detail)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>{detailNotice===(language==='en'?'Link copied.':'링크를 복사했어요.')?(language==='en'?'✓ Copied':'✓ 복사 완료'):(language==='en'?'Copy link':'링크 복사')}</button>}{!siteMode&&<button className="button secondary detail-edit" onClick={()=>openEditor(detail)}>{t('수정')}</button>}<NoteDownload note={detail} english={language==='en'} onMarkdown={()=>download(detail)} onOriginal={ownsDetail&&detail.messages?.length?()=>downloadOriginal(detail):undefined}/></div></div></div><div className="record-tabs-row"><div className="record-tabs" role="tablist" aria-label={t('기록 보기')}><button id="summary-tab" role="tab" aria-selected={detailView==='summary'} aria-controls="record-panel" onClick={()=>{setDetailView('summary');setDetailNotice('');}}>{t('공부 노트')}</button>{ownsDetail&&<button id="original-tab" role="tab" aria-selected={detailView==='original'} aria-controls="record-panel" onClick={()=>{setDetailView('original');setDetailNotice('');}}>{t('원본 대화')}</button>}</div>{ownsDetail&&detail.cloud&&<RecordVisibility title={detail.title} isPublic={Boolean(detail.publicId)} disabled={recordBusy} english={language==='en'} onChange={value=>void publishRecord(detail,value)}/>}</div><div id="record-panel" role="tabpanel" aria-labelledby={detailView==='summary'||!ownsDetail?'summary-tab':'original-tab'}>{detailView==='summary'||!ownsDetail?<div className="note-content"><StudyMarkdown>{detail.content}</StudyMarkdown></div>:detail.messages?.length?<div className="original-content"><pre className="original-transcript" tabIndex={0} aria-label={t('원본 대화 텍스트')}>{transcript(detail,language)}</pre><div className="original-actions"><button className="original-copy" onClick={()=>copyOriginal(detail)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></svg>{language==='en'?'Copy all':'전체 복사'}</button><button type="button" className="text-button delete" disabled={recordBusy} onClick={()=>void removeRecord(detail,true)}>{language==='en'?'Delete original conversation':'원본 대화 삭제'}</button></div></div>:<p className="original-empty">{t('이 기록에는 저장된 원본 대화가 없습니다. 앞으로 GPT 공부를 기록할 때 함께 저장됩니다.')}</p>}</div>{detailNotice&&<p className="detail-notice" role="status">{detailNotice}</p>}{ownsDetail&&sourceNote&&<p><button className="text-button" onClick={()=>openDetail(sourceNote)}>{language==='en'?'Previous study note':'이전 공부 노트'} · {sourceNote.title}</button></p>}{ownsDetail&&<div className="continue-study"><button className="button secondary" onClick={()=>{setResume({key:crypto.randomUUID(),note:detail});setDetail(null);changeView('connect');}}>{language==='en'?'Continue studying':'이어서 공부하기'} <Icon name="arrow" size={16}/></button></div>}
      {detailView==='summary'&&<NoteReactions key={`${detail.id}:${detail.publicId??''}`} noteId={detail.id} publicId={detail.publicId} showViews={false} language={language}/>}
      {detailView==='summary'&&detail.publicId&&<RecordComments key={detail.publicId} publicId={detail.publicId} language={language}/>}
    </>}</dialog>
  </div>;
}
