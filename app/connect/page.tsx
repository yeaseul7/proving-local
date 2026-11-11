'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAccountSession } from '@/components/account-session';
import { syncUrl } from '@/lib/local-config.mjs';
export default function Connect(){
  const router=useRouter();
  const {getSession}=useAccountSession();
  const [code,setCode]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function submit(event:FormEvent){
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    try{
      const response=await fetch('/api/device-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code}),signal:AbortSignal.timeout(20_000)});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'연결하지 못했습니다.');
      await getSession(true);router.replace('/workspace');
    }catch(error){setError(error instanceof Error?error.message:'연결하지 못했습니다.');}finally{setBusy(false);}
  }
  return <main style={{maxWidth:520,margin:'48px auto',padding:24}}><h1>사이트 계정 연결</h1><p>사이트와 같은 프로필·기록·설정을 이 PC에서 사용합니다.</p><p><a href={`${syncUrl}/settings`} target="_blank" rel="noreferrer">사이트 설정에서 연결 코드 발급</a></p><form onSubmit={submit} style={{display:'grid',gap:16}}><label>연결 코드<input aria-label="연결 코드" value={code} onChange={event=>setCode(event.target.value)} maxLength={32} autoComplete="off" spellCheck={false} required disabled={busy}/></label><button className="button primary" disabled={busy||!code.trim()}>{busy?'연결 중…':'이 계정으로 연결'}</button></form>{error&&<p role="alert">{error}</p>}<p><a href="/workspace">돌아가기</a></p></main>;
}
