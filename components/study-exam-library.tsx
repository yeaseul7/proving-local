'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { useLanguage } from './language-provider';
import { StudyExamPaper } from './study-exam-paper';
import { validExam,validExamProgress,type ExamAttempt,type ExamListItem } from '@/lib/study-exam';
async function examRequest(url:string,account:string,init:RequestInit={}){
 const response=await fetch(url,{...init,signal:init.signal??AbortSignal.timeout(20000),cache:'no-store',headers:{'Content-Type':'application/json',...init.headers}});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'시험지를 불러오지 못했습니다.');if(data.account!==account)throw new Error('계정이 변경되었습니다. 다시 로그인해주세요.');return data;
}
export function StudyExamLibrary({account,initialId,onRecordSelect}:{account:string;initialId?:string|null;onRecordSelect?:()=>void}){
 const {language}=useLanguage();const en=language==='en';
 const [items,setItems]=useState<ExamListItem[]>([]),[selected,setSelected]=useState<string|null>(initialId??null),[offset,setOffset]=useState(0),[hasMore,setHasMore]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{if(initialId)setSelected(initialId);},[initialId]);
 useEffect(()=>{if(selected)return;let active=true;setLoading(true);setError('');examRequest(`/api/exams?offset=${offset}`,account).then(data=>{if(active){setItems(data.exams);setHasMore(data.hasMore);}}).catch(error=>{if(active)setError(error.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[account,offset,selected,reload]);
 if(selected)return <SavedExam key={`${account}:${selected}`} id={selected} account={account} onBack={()=>setSelected(null)}/>;
 return <section className="exam-library"><header className="page-heading"><div><h1>{en?'Exams':'시험지'}</h1></div><button type="button" className="button secondary" onClick={onRecordSelect}>{en?'Create from notes':'기록에서 시험지 만들기'}</button></header>
 {loading?<p role="status">{en?'Loading exams…':'시험지를 불러오는 중'}</p>:error?<p role="alert">{error} <button className="text-button" onClick={()=>setReload(n=>n+1)}>다시 불러오기</button></p>:items.length?<div className="exam-list">{items.map(item=><button key={item.id} type="button" className="exam-list-item" onClick={()=>setSelected(item.id)}><span className="exam-list-icon" aria-hidden="true">▤</span><span><strong>{item.title}</strong><small>{item.sourceTitles.join(' · ')}</small><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString(en?'en-US':'ko-KR')}</time></span><span className={`exam-list-result ${item.submitted?'graded':''}`}>{item.submitted?`${item.score*10}${en?' pts':'점'}`:en?'In progress':'미제출'}</span></button>)}</div>:<div className="empty-state"><h3>{en?'No exams yet':'아직 시험지가 없어요'}</h3><p>{en?'Select up to 3 saved notes to generate a 10-question exam.':'기록에서 노트를 최대 3개 선택하면 10문항 시험지를 만들 수 있어요.'}</p></div>}
 {(offset>0||hasMore)&&<nav className="explore-pagination" aria-label="시험지 목록 페이지"><button className="button secondary" disabled={loading||offset===0} onClick={()=>setOffset(n=>Math.max(0,n-20))}>이전</button><span>{offset/20+1}</span><button className="button secondary" disabled={loading||!hasMore} onClick={()=>setOffset(n=>n+20)}>다음</button></nav>}</section>;
}
function SavedExam({id,account,onBack}:{id:string;account:string;onBack:()=>void}){
 const {language}=useLanguage();const en=language==='en';
 const [attempt,setAttempt]=useState<ExamAttempt|null>(null),[error,setError]=useState(''),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[retry,setRetry]=useState(0);
 const draft=useRef<ExamAttempt|null>(null),persisted=useRef(''),revision=useRef(0),worker=useRef<Promise<boolean>|null>(null),mounted=useRef(true);
 const signature=(value:ExamAttempt)=>JSON.stringify({answers:value.answers,memos:value.memos,submitted:value.submitted});
 useEffect(()=>{let active=true;examRequest(`/api/exams/${id}`,account).then(data=>{if(!active)return;if(!validExam(data.attempt.exam)||!validExamProgress(data.attempt.answers,data.attempt.memos,data.attempt.submitted))throw new Error('시험지 형식을 확인하지 못했습니다.');draft.current=data.attempt;revision.current=data.attempt.revision;persisted.current=signature(data.attempt);setAttempt(data.attempt);setError('');setSaved(true);}).catch(error=>{if(active)setError(error.message);});return()=>{active=false;};},[id,account,retry]);
 const save=useCallback(():Promise<boolean>=>{
  if(worker.current)return worker.current;
  if(!draft.current||signature(draft.current)===persisted.current)return Promise.resolve(true);
  setSaving(true);setSaved(false);
  const task=(async()=>{
   try{
    while(draft.current&&signature(draft.current)!==persisted.current){
     const current=draft.current,payload={account,revision:revision.current,answers:current.answers,memos:current.memos,submitted:current.submitted},sent=signature(current),body=JSON.stringify(payload);
     const data=await examRequest(`/api/exams/${id}`,account,{method:'PATCH',body,keepalive:new TextEncoder().encode(body).length<60000});
     revision.current=data.attempt.revision;persisted.current=sent;
     const latest=draft.current;draft.current={...data.attempt,answers:latest.answers,memos:latest.memos,submitted:latest.submitted};
     if(mounted.current)setAttempt(draft.current);
    }
    if(mounted.current){setSaved(true);setError('');}return true;
   }catch(error){if(mounted.current)setError(error instanceof Error?error.message:'저장하지 못했습니다.');return false;}
   finally{worker.current=null;if(mounted.current)setSaving(false);}
  })();worker.current=task;return task;
 },[account,id]);
 useEffect(()=>{mounted.current=true;const flush=()=>void save();window.addEventListener('pagehide',flush);return()=>{mounted.current=false;window.removeEventListener('pagehide',flush);void save();};},[save]);
 useEffect(()=>{if(!attempt||signature(attempt)===persisted.current)return;const timer=setTimeout(()=>void save(),500);return()=>clearTimeout(timer);},[attempt,save]);
 function change(next:ExamAttempt){draft.current=next;setAttempt(next);setSaved(false);}
 if(!attempt)return <section className="exam-library"><button className="text-button" onClick={onBack}>← {en?'Exam list':'시험지 목록'}</button>{error?<p role="alert">{error} <button className="text-button" onClick={()=>setRetry(n=>n+1)}>다시 불러오기</button></p>:<p role="status">시험지를 불러오는 중</p>}</section>;
 return <section className="exam-workspace"><div className="exam-workspace-toolbar"><button type="button" className="text-button" onClick={async()=>{if(await save())onBack();}}>← {en?'Exam list':'시험지 목록'}</button><span className="exam-save-status" role="status">{saving?(en?'Saving…':'저장 중…'):saved?(en?'Saved to account':'계정에 저장됨'):(en?'Unsaved changes':'저장 대기 중')}</span><span className="exam-model-badge">GPT-6.1 Sol · medium</span></div>{error&&<p className="exam-save-error" role="alert">{error} <button type="button" className="text-button" onClick={()=>void save()}>저장 다시 시도</button></p>}<StudyExamPaper attempt={attempt} onChange={change}/><div className="exam-submit-bar"><p>{attempt.submitted?(en?'Review incorrect answers and keep adding notes.':'오답을 확인하고 메모 / 질문을 계속 남길 수 있어요.'):(en?'Answer all 10 questions, then submit to grade.':'10문항에 모두 답한 뒤 제출하면 채점합니다.')}</p>{!attempt.submitted&&<button type="button" className="button primary" disabled={saving||attempt.answers.some(value=>value===null)} onClick={()=>{change({...attempt,submitted:true});void save();}}>{en?'Submit and grade':'제출하고 채점하기'}</button>}</div></section>;
}
