'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useAccountSession } from './account-session';
import type { RecordComment } from '@/lib/record-comments';

export function RecordComments({publicId,language='ko'}:{publicId:string;language?:'ko'|'en'}) {
  const {session,getSession}=useAccountSession();
  const [comments,setComments]=useState<RecordComment[]>([]);
  const [content,setContent]=useState('');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const en=language==='en';
  const canWrite=Boolean(session?.account&&session.provider==='supabase');
  useEffect(()=>{void getSession().catch(()=>{});},[getSession]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setComments([]);setError('');setContent('');setNotice('');
    fetch(`/api/public/summaries/${publicId}/comments`,{signal:controller.signal,cache:'no-store'})
      .then(async response=>{if(!response.ok)throw new Error();const data=await response.json();if(!controller.signal.aborted)setComments(Array.isArray(data.comments)?data.comments:[]);})
      .catch(()=>{if(!controller.signal.aborted)setError(en?'Could not load comments.':'댓글을 불러오지 못했어요.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[publicId,en]);
  async function submit(event:FormEvent){
    event.preventDefault();if(busy||!canWrite||!content.trim())return;
    setBusy(true);setError('');setNotice('');
    try {
      const response=await fetch(`/api/public/summaries/${publicId}/comments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content}),signal:AbortSignal.timeout(15000)});
      const data=await response.json();
      if(!response.ok)throw new Error(en?'Could not post your comment. Please try again.':data.error);
      setComments(Array.isArray(data.comments)?data.comments:[]);setContent('');setNotice(en?'Comment posted.':'댓글을 남겼어요.');
    } catch(error){setError(error instanceof Error?error.message:(en?'Could not post comment.':'댓글을 저장하지 못했어요.'));}
    finally{setBusy(false);}
  }
  return <section className="record-comments" aria-label={en?'Comments':'댓글'}>
    <h3>{en?'Comments':'댓글'}{comments.length>0&&<small> {comments.length}</small>}</h3>
    {loading&&<p role="status">{en?'Loading…':'불러오는 중…'}</p>}
    <ul>{comments.map(comment=><li key={comment.id}><div className="comment-meta"><strong>{comment.name}</strong><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString(en?'en-US':'ko-KR')}</time></div><p>{comment.content}</p></li>)}</ul>
    {!loading&&comments.length===0&&!error&&<p className="comment-empty">{en?'Be the first to leave feedback.':'첫 피드백을 남겨보세요.'}</p>}
    {canWrite?<form className="comment-composer" onSubmit={submit}><input aria-label={en?'Comment':'댓글 내용'} placeholder={en?'Leave feedback on this note':'내용에 대한 피드백을 남겨주세요'} value={content} maxLength={2000} disabled={busy} onChange={event=>setContent(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&event.nativeEvent.isComposing)event.preventDefault();}}/><button type="submit" disabled={busy||!content.trim()} aria-label={en?'Post comment':'댓글 전송'} title={en?'Enter to send':'Enter로 전송'}>{busy?'…':'↑'}</button></form>:<a className="comment-login text-button" href="/auth/login">{en?'Log in with GitHub to comment':'GitHub 로그인 후 댓글 남기기'}</a>}
    {error&&<p className="comment-error" role="alert">{error}</p>}
    {notice&&<p role="status">{notice}</p>}
  </section>;
}
