'use client';
import {cachedExam,cachedExamPage,cacheSavedExam,invalidateExamCache} from '@/lib/exam-cache';
import { useCallback,useEffect,useRef,useState } from 'react';
import { useAccountSession } from './account-session';
import {pendingMemoQuestions} from '@/lib/exam-feedback';
import { useLanguage } from './language-provider';
import { ExamPrintButton } from './exam-print-button';
import { StudyExamPaper } from './study-exam-paper';
import { EXAM_MODEL,EXAM_PAGE_SIZE,validExam,validExamProgress,type ExamAttempt,type ExamListItem } from '@/lib/study-exam';
async function examRequest(url:string,account:string,init:RequestInit={}){
 const response=await fetch(url,{...init,signal:init.signal??AbortSignal.timeout(20000),cache:'no-store',headers:{'Content-Type':'application/json',...init.headers}});
 const data=await response.json();if(!response.ok){if([401,403,409].includes(response.status))invalidateExamCache(account);throw new Error(data.error||'시험지를 불러오지 못했습니다.');}if(data.account!==account)throw new Error('계정이 변경되었습니다. 다시 로그인해주세요.');return data;
}
function ExamVisibilityToggle({account,id,isPublic=false,onSaved}:{account:string;id:string;isPublic?:boolean;onSaved:(attempt:ExamAttempt)=>void}){
 const {language}=useLanguage();const en=language==='en';
 const [value,setValue]=useState(isPublic),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const running=useRef(false);
 useEffect(()=>setValue(isPublic),[isPublic]);
 async function toggle(){
  if(running.current)return;running.current=true;setBusy(true);setError('');setValue(!isPublic);
  try{
   const data=await examRequest(`/api/exams/${id}`,account,{method:'PATCH',body:JSON.stringify({account,isPublic:!isPublic})});
   cacheSavedExam(account,data.attempt);onSaved(data.attempt);setValue(!!data.attempt.isPublic);
  }catch(error){setValue(isPublic);setError(error instanceof Error?error.message:'공개 설정을 저장하지 못했습니다.');}
  finally{running.current=false;setBusy(false);}
 }
 return <div className="exam-visibility"><button type="button" role="switch" aria-label={en?'Publish exam':'시험지 공개'} aria-checked={value} disabled={busy} onClick={()=>void toggle()}><span className="exam-visibility-track" aria-hidden="true"/><span>{busy?(en?'Saving…':'저장 중…'):value?(en?'Public':'공개'):(en?'Private':'비공개')}</span></button>{error&&<small role="alert">{error}</small>}</div>;
}
export function StudyExamLibrary({account,initialId,onRecordSelect}:{account:string;initialId?:string|null;onRecordSelect?:()=>void}){
 const {language}=useLanguage();const en=language==='en';
 const [items,setItems]=useState<ExamListItem[]>([]),[selected,setSelected]=useState<string|null>(initialId??null),[offset,setOffset]=useState(0),[total,setTotal]=useState(0),[loading,setLoading]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{if(initialId)setSelected(initialId);},[initialId]);
 useEffect(()=>{if(selected)return;let active=true;setLoading(true);setError('');cachedExamPage(account,offset,()=>examRequest(`/api/exams?offset=${offset}`,account)).then(data=>{if(active){setItems(data.exams);setTotal(data.total??offset+data.exams.length+(data.hasMore?1:0));}}).catch(error=>{if(active)setError(error.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[account,offset,selected,reload]);
 const page=offset/EXAM_PAGE_SIZE+1,pages=Math.max(1,Math.ceil(total/EXAM_PAGE_SIZE));
 const pageNumbers=Array.from({length:pages},(_,i)=>i+1).filter(n=>n===1||n===pages||Math.abs(n-page)<=1);
 function goToPage(n:number){setLoading(true);setOffset((n-1)*EXAM_PAGE_SIZE);}
 if(selected)return <SavedExam key={`${account}:${selected}`} id={selected} account={account} onBack={()=>setSelected(null)}/>;
 return <section className="exam-library"><header className="page-heading"><div><h1>{en?'Exams':'시험지'}</h1></div><button type="button" className="button secondary" onClick={onRecordSelect}>{en?'Create from notes':'기록에서 시험지 만들기'}</button></header>
 <div className="exam-list-toolbar"><span>{en?`${total} exams`:`전체 ${total}개`}</span><span>{en?'Unsubmitted first · Newest':'미제출 먼저 · 최신순'} <button type="button" className="text-button" disabled={loading} onClick={()=>{invalidateExamCache(account);setReload(n=>n+1);}}>{en?'Refresh':'새로고침'}</button></span></div>
 {loading?<p role="status">{en?'Loading exams…':'시험지를 불러오는 중'}</p>:error?<p role="alert">{error} <button className="text-button" onClick={()=>setReload(n=>n+1)}>{en?'Retry':'다시 불러오기'}</button></p>:items.length?<div className="exam-list">{items.map(item=><article key={item.id} className={`exam-list-item ${item.submitted?'is-submitted':'is-pending'}`}><div className="exam-card-top"><ExamVisibilityToggle account={account} id={item.id} isPublic={item.isPublic} onSaved={attempt=>setItems(current=>current.map(row=>row.id===attempt.id?{...row,isPublic:attempt.isPublic}:row))}/><span className={`exam-list-result ${item.submitted?'graded':''}`}><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{item.submitted?<path d="m3.5 8 3 3 6-6"/>:<><circle cx="8" cy="8" r="5.5"/><path d="M8 4.5V8l2.5 1.5"/></>}</svg>{item.submitted?(en?'Submitted':'제출 완료'):(en?'Unsubmitted':'미제출')}</span></div><button type="button" className="exam-card-open" onClick={()=>setSelected(item.id)}>
 <span className="exam-card-body"><strong>{item.title}</strong><small>{item.sourceTitles.join(' · ')}</small></span>
 <span className="exam-card-footer"><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString(en?'en-US':'ko-KR')}</time><span>{item.submitted?<><b>{item.score*10}</b>{en?' pts':'점'}</>:(en?'Continue →':'이어서 풀기 →')}</span></span>
 </button></article>)}</div>:<div className="empty-state"><h3>{en?'No exams yet':'아직 시험지가 없어요'}</h3><p>{en?'Select up to 3 saved notes to generate a 10-question exam.':'기록에서 노트를 최대 3개 선택하면 10문항 시험지를 만들 수 있어요.'}</p></div>}
 {!error&&pages>1&&<nav className="exam-pagination" aria-label={en?'Exam pages':'시험지 목록 페이지'}><button type="button" disabled={loading||page===1} onClick={()=>goToPage(page-1)}>{en?'Previous':'이전'}</button>{pageNumbers.map((n,i)=><span key={n}>{i>0&&n>pageNumbers[i-1]+1&&<span className="exam-page-gap">…</span>}<button type="button" aria-label={en?`Page ${n}`:`${n}페이지`} aria-current={n===page?'page':undefined} disabled={loading} onClick={()=>{if(n!==page)goToPage(n);}}>{n}</button></span>)}<button type="button" disabled={loading||page>=pages} onClick={()=>goToPage(page+1)}>{en?'Next':'다음'}</button></nav>}</section>;
}
function SavedExam({id,account,onBack}:{id:string;account:string;onBack:()=>void}){
 const {getSession}=useAccountSession();
 const [feedbackBusy,setFeedbackBusy]=useState(false),[feedbackError,setFeedbackError]=useState('');
 const feedbackRunning=useRef(false);
 const {language}=useLanguage();const en=language==='en';
 const [attempt,setAttempt]=useState<ExamAttempt|null>(null),[error,setError]=useState(''),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[retry,setRetry]=useState(0);
 const draft=useRef<ExamAttempt|null>(null),persisted=useRef(''),revision=useRef(0),worker=useRef<Promise<boolean>|null>(null),mounted=useRef(true),changeKind=useRef<'answer'|'memo'>('answer');
 const signature=(value:ExamAttempt)=>JSON.stringify({answers:value.answers,memos:value.memos,submitted:value.submitted});
 useEffect(()=>{let active=true;cachedExam(account,id,async()=>{const data=await examRequest(`/api/exams/${id}`,account);return data.attempt;},retry>0).then(attempt=>{const data={attempt};if(!active)return;draft.current=data.attempt;revision.current=data.attempt.revision;persisted.current=signature(data.attempt);setAttempt(data.attempt);setError('');setSaved(true);}).catch(error=>{if(active)setError(error.message);});return()=>{active=false;};},[id,account,retry]);
 const save=useCallback(():Promise<boolean>=>{
  if(worker.current)return worker.current;
  if(!draft.current||signature(draft.current)===persisted.current)return Promise.resolve(true);
  setSaving(true);setSaved(false);
  const task=(async()=>{
   try{
    if(draft.current&&signature(draft.current)!==persisted.current){
     const current=draft.current,payload={account,revision:revision.current,answers:current.answers,memos:current.memos,submitted:current.submitted},sent=signature(current),body=JSON.stringify(payload);
     const data=await examRequest(`/api/exams/${id}`,account,{method:'PATCH',body,keepalive:new TextEncoder().encode(body).length<60000});
     cacheSavedExam(account,data.attempt);revision.current=data.attempt.revision;persisted.current=sent;
     const latest=draft.current;draft.current={...data.attempt,exam:{...data.attempt.exam,memoFeedback:data.attempt.exam.memoFeedback??latest.exam.memoFeedback},isPublic:latest.isPublic,answers:latest.answers,memos:latest.memos,submitted:latest.submitted};
     if(mounted.current)setAttempt(draft.current);
    }
    const clean=!!draft.current&&signature(draft.current)===persisted.current;
    if(mounted.current){setSaved(clean);setError('');}return clean;
   }catch(error){if(mounted.current)setError(error instanceof Error?error.message:'저장하지 못했습니다.');return false;}
   finally{worker.current=null;if(mounted.current)setSaving(false);}
  })();worker.current=task;return task;
 },[account,id]);
 // 명시적 저장은 진행 중 요청이 끝난 뒤 남은 변경도 저장한다.
 const flush=useCallback(async()=>{if(worker.current)await worker.current;return save();},[save]);
 useEffect(()=>{mounted.current=true;const leave=()=>void flush();window.addEventListener('pagehide',leave);return()=>{mounted.current=false;window.removeEventListener('pagehide',leave);void flush();};},[flush]);
 useEffect(()=>{if(!attempt||signature(attempt)===persisted.current)return;const timer=setTimeout(()=>void save(),changeKind.current==='memo'?3000:500);return()=>clearTimeout(timer);},[attempt,save]);
 function change(next:ExamAttempt,kind:'answer'|'memo'='answer'){changeKind.current=kind;draft.current=next;setAttempt(next);setSaved(false);}
 async function generateFeedback(){
  if(feedbackRunning.current||!draft.current?.submitted||!pendingMemoQuestions(draft.current).length)return;
  feedbackRunning.current=true;setFeedbackBusy(true);setFeedbackError('');
  try{
   if(!await flush())throw new Error('메모 저장 후 다시 요청해주세요.');
   const session=await getSession();if(session.account!==account)throw new Error('계정이 변경되었습니다.');
   const plan=!session.canChat&&session.chatgptPlan?.connected;
   const data=await examRequest('/api/chat',account,{method:'POST',body:JSON.stringify({account,examFeedback:true,examId:id,model:plan?`plan:${EXAM_MODEL}`:EXAM_MODEL,language}),signal:AbortSignal.timeout(150000)});
   if(!data.attempt?.exam||!validExam(data.attempt.exam))throw new Error('추가 해설을 확인하지 못했습니다.');
   cacheSavedExam(account,data.attempt);
   if(mounted.current&&draft.current){draft.current={...draft.current,exam:{...draft.current.exam,memoFeedback:data.attempt.exam.memoFeedback}};setAttempt(draft.current);}
  }catch(error){if(mounted.current)setFeedbackError(error instanceof Error?error.message:'추가 해설을 만들지 못했습니다.');}
  finally{feedbackRunning.current=false;if(mounted.current)setFeedbackBusy(false);}
 }
 async function submit(){
  if(!draft.current)return;
  change({...draft.current,submitted:true});
  if(await flush())await generateFeedback();
 }
 if(!attempt)return <section className="exam-library"><button className="text-button" onClick={onBack}>← {en?'Exam list':'시험지 목록'}</button>{error?<p role="alert">{error} <button className="text-button" onClick={()=>setRetry(n=>n+1)}>다시 불러오기</button></p>:<p role="status">시험지를 불러오는 중</p>}</section>;
 return <section className="exam-workspace"><div className="exam-workspace-toolbar"><button type="button" className="text-button" onClick={async()=>{if(await flush())onBack();}}>← {en?'Exam list':'시험지 목록'}</button><span className="exam-save-status" role="status">{saving?(en?'Saving…':'저장 중…'):saved?(en?'Saved to account':'계정에 저장됨'):(en?'Unsaved changes':'저장 대기 중')}</span><span className="exam-model-badge">GPT-6.1 Sol · medium</span><ExamVisibilityToggle account={account} id={id} isPublic={attempt.isPublic} onSaved={value=>{if(draft.current){draft.current={...draft.current,isPublic:value.isPublic};setAttempt(draft.current);}}}/><ExamPrintButton exam={attempt.exam} english={en}/></div>{error&&<p className="exam-save-error" role="alert">{error} <button type="button" className="text-button" onClick={()=>void flush()}>저장 다시 시도</button></p>}{feedbackBusy&&<p role="status">{en?'Creating explanations for questions with notes…':'메모가 있는 문항의 추가 해설을 만드는 중…'}</p>}{feedbackError&&<p role="alert">{feedbackError}</p>}<StudyExamPaper attempt={attempt} onChange={change} onMemoClose={()=>void flush()}/><div className="exam-submit-bar">{!attempt.submitted&&<p>{en?'Answer all 10 questions, then submit to grade.':'10문항에 모두 답한 뒤 제출하면 채점합니다.'}</p>}{!attempt.submitted&&<button type="button" className="button primary" disabled={saving||attempt.answers.some(value=>value===null)} onClick={()=>void submit()}>{en?'Submit and grade':'제출하고 채점하기'}</button>}{attempt.submitted&&pendingMemoQuestions(attempt).length>0&&<button type="button" className="button secondary" disabled={feedbackBusy||saving} onClick={()=>void generateFeedback()}>{feedbackBusy?(en?'Generating…':'해설 생성 중…'):(en?'Explain my notes':'메모 추가 해설 만들기')}</button>}</div></section>;
}
