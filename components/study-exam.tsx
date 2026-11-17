'use client';
import {cacheSavedExam} from '@/lib/exam-cache';
import { useEffect,useRef,useState } from 'react';
import { useAccountSession } from './account-session';
import { useLanguage } from './language-provider';
import type { StudyNote } from '@/lib/study';
import { EXAM_MODEL,validExam } from '@/lib/study-exam';
export function StudyExamButton({notes,account,onCreated}:{notes:StudyNote[];account:string;onCreated?:(id:string)=>void}){
 const {language}=useLanguage();const en=language==='en';const {getSession}=useAccountSession();
 const dialog=useRef<HTMLDialogElement>(null),controller=useRef<AbortController|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function generate(){
  if(busy||notes.length<1||notes.length>3)return;
  setBusy(true);setError('');const abort=new AbortController();controller.current=abort;
  try{
   const session=await getSession();if(session.account!==account)throw new Error('계정이 변경되었습니다. 다시 로그인해주세요.');
   const plan=!session.canChat&&session.chatgptPlan?.connected;
   const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({exam:true,examId:crypto.randomUUID(),sources:notes.map(({id,title,content})=>({id,title,content})),account,model:plan?`plan:${EXAM_MODEL}`:EXAM_MODEL,language}),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(150000)])});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'시험지를 생성하지 못했습니다.');
   if(data.account!==account||!data.attempt?.id||!validExam(data.attempt.exam,notes.map(note=>note.id)))throw new Error('저장된 시험지를 확인하지 못했습니다.');
   const current=await getSession(true);if(current.account!==account)throw new Error('계정이 변경되었습니다.');
   cacheSavedExam(account,data.attempt,true);
   dialog.current?.close();onCreated?.(data.attempt.id);
  }catch(error){if(!abort.signal.aborted)setError(error instanceof Error?error.message:'시험지를 생성하지 못했습니다.');}
  finally{setBusy(false);}
 }
 return <><button type="button" className="button primary" disabled={!notes.length||notes.length>3} onClick={()=>{setError('');dialog.current?.showModal();}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h5"/></svg>{en?'Generate exam':'시험지 생성'}</button><dialog ref={dialog} className="editor-dialog exam-dialog exam-create-dialog" onClose={()=>controller.current?.abort()}><div className="dialog-heading"><h2>{en?'Generate exam':'시험지 생성'}</h2><button type="button" className="close-button" aria-label={en?'Close':'닫기'} onClick={()=>dialog.current?.close()}>×</button></div><div className="exam-editor"><ul className="exam-create-guide"><li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3H5v18h14V8l-5-5H8m6 0v5h5M8 12h8M8 16h5"/></svg><span>{en?<>AI turns your selected study notes into <strong>10 questions</strong>.</>:<>AI가 선택한 공부 기록을 바탕으로 <strong>10문항</strong>을 만듭니다.</>}</span></li><li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z"/></svg><span>{en?<>Add <strong>notes or questions</strong> to each problem for more helpful grading and explanations.</>:<>문제마다 남긴 <strong>메모와 질문</strong>을 채점과 해설에 반영합니다.</>}</span></li><li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7zM17 11h.01"/></svg><span>{en?<>You can <strong>save as PDF or print</strong> your exam for review.</>:<>완성한 시험지는 <strong>PDF로 저장하거나 인쇄</strong>해 복습할 수 있습니다.</>}</span></li></ul><fieldset disabled={busy}><legend>{en?'Selected notes':'선택한 기록'} <span className="exam-source-count">{notes.length}{en?' selected':'개'}</span></legend><ul className="exam-source-titles">{notes.map(note=><li key={note.id}>{note.title}</li>)}</ul><p className="exam-fixed-model">{en?'Model':'사용 모델'} · GPT-6.1 Sol <span>medium</span></p><button type="button" className="button primary" disabled={busy||!notes.length} onClick={()=>void generate()}>{busy?(en?'Generating and saving…':'출제하고 저장하는 중…'):(en?'Generate exam':'시험지 생성')}</button></fieldset>{error&&<p role="alert">{error}</p>}</div></dialog></>;
}
export function useExamSelection(account:string|null|undefined,active:boolean){
 const [state,setState]=useState<{account:string;ids:string[]}|null>(null);
 // 기존에 저장한 선택은 복원하지 않고 기록 화면을 보는 동안만 유지한다.
 useEffect(()=>{setState(null);if(account){try{localStorage.removeItem(`proving-exam-selection:${account}`);}catch{/* 저장된 선택은 읽지 않는다. */}}},[account,active]);
 const ids=active&&state&&state.account===account?state.ids:[];
 function toggle(id:string){if(!account||!active)return;setState(current=>{const ids=current?.account===account?current.ids:[];return {account,ids:ids.includes(id)?ids.filter(n=>n!==id):ids.length<3?[...ids,id]:ids};});}
 return {ids,toggle,ready:!!account&&active};
}
