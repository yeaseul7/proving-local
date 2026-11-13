'use client';
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
   dialog.current?.close();onCreated?.(data.attempt.id);
  }catch(error){if(!abort.signal.aborted)setError(error instanceof Error?error.message:'시험지를 생성하지 못했습니다.');}
  finally{setBusy(false);}
 }
 return <><button type="button" className="button primary" disabled={!notes.length||notes.length>3} onClick={()=>{setError('');dialog.current?.showModal();}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h5"/></svg>{en?'Generate exam':'시험지 생성'}</button><dialog ref={dialog} className="editor-dialog exam-dialog" onClose={()=>controller.current?.abort()}><div className="dialog-heading"><h2>{en?'Create an exam':'시험지 만들기'}</h2><button type="button" className="close-button" aria-label={en?'Close':'닫기'} onClick={()=>dialog.current?.close()}>×</button></div><div className="exam-editor"><p>{en?'Generate 10 questions from up to 3 notes. Exams, answers and notes are saved to your account.':'선택한 기록을 바탕으로 10문항을 출제합니다. 시험지, 답안, 문제별 메모는 계정에 저장됩니다.'}</p><fieldset disabled={busy}><legend>{en?'Source notes':'출제할 기록'} ({notes.length}/3)</legend><ul className="exam-source-titles">{notes.map(note=><li key={note.id}>{note.title}</li>)}</ul><p className="exam-fixed-model">GPT-6.1 Sol <span>medium</span></p><button type="button" className="button primary" disabled={busy||!notes.length} onClick={()=>void generate()}>{busy?(en?'Generating and saving…':'출제하고 저장하는 중…'):(en?'Generate 10 questions':'시험지 만들기')}</button></fieldset>{error&&<p role="alert">{error}</p>}</div></dialog></>;
}
export function useExamSelection(account:string|null|undefined){
 const [state,setState]=useState<{account:string;ids:string[]}|null>(null);
 const [error,setError]=useState(false);
 useEffect(()=>{setError(false);if(!account){setState(null);return;}try{const raw=localStorage.getItem(`proving-exam-selection:${account}`);const ids:unknown=raw?JSON.parse(raw):[];setState({account,ids:Array.isArray(ids)?[...new Set(ids.filter((id):id is string=>typeof id==='string'&&id.length<=200))].slice(0,3):[]});}catch{setState({account,ids:[]});setError(true);}},[account]);
 const ids=state&&state.account===account?state.ids:[];
 function toggle(id:string){if(!account||state?.account!==account)return;const next=ids.includes(id)?ids.filter(n=>n!==id):ids.length<3?[...ids,id]:ids;setState({account,ids:next});try{localStorage.setItem(`proving-exam-selection:${account}`,JSON.stringify(next));setError(false);}catch{setError(true);}}
 return {ids,toggle,error,ready:!!account&&state?.account===account};
}
