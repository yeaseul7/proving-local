'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { clearAccountBrowserData } from '@/lib/account-browser-data';
import { ProfileEditor } from '@/components/profile-editor';
import { ConnectedDevices } from '@/components/connected-devices';
import { ApiKeySettings } from '@/components/api-key-settings';
import { useAccountSession } from '@/components/account-session';

export default function Settings() {
  const router=useRouter();
  const {session,error:sessionError,getSession,clearSession}=useAccountSession();
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [signingOut,setSigningOut]=useState(false);
  const [deleting,setDeleting]=useState(false);
  const [confirmation,setConfirmation]=useState('');
  const [deletionError,setDeletionError]=useState('');
  const deletionDialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{void getSession().catch(()=>{});},[getSession]);
  async function signOut(){
    if(signingOut)return;
    setSigningOut(true);setError('');
    try {
      const response=await fetch('/api/logout',{method:'POST',signal:AbortSignal.timeout(15_000)});
      const data=await response.json();
      if(!response.ok)throw new Error();
      try {sessionStorage.removeItem('proving-ai-selection');} catch {}
      clearSession();
      if(data.revocationConfirmed===false)setNotice('이 기기에서는 로그아웃했습니다. 원격 토큰 폐기는 확인되지 않았습니다. ChatGPT 설정에서 앱 연결을 해제해주세요.');
      else router.replace('/workspace');
    } catch {setError('로그아웃하지 못했습니다. 다시 시도해주세요.');}
    finally {setSigningOut(false);}
  }
  async function deleteAccount(event:FormEvent){
    event.preventDefault();
    if(deleting||confirmation!=='탈퇴'||!session?.account)return;
    setDeleting(true);setDeletionError('');
    try {
      const response=await fetch('/api/account',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmation})});
      const data=await response.json();
      if(!response.ok||data.deleted!==true)throw new Error(data.error||'탈퇴하지 못했습니다. 잠시 후 다시 시도해주세요.');
      let localCleared=true;
      const accounts=[...new Set([session.account,...(Array.isArray(data.clearedAccounts)?data.clearedAccounts.filter((value:unknown)=>typeof value==='string'):[])])];
      for(const name of ['localStorage','sessionStorage'] as const){
        try {clearAccountBrowserData(accounts,window[name]);} catch {localCleared=false;}
      }
      deletionDialog.current?.close();
      clearSession();
      setNotice(localCleared?'계정 탈퇴가 완료되었습니다. 연결된 데이터와 이 브라우저의 공부 기록 사본을 삭제했습니다.':'계정과 서버 데이터는 삭제되었습니다. 브라우저 저장소에 접근할 수 없어 이 사이트의 로컬 데이터는 브라우저 설정에서 지워주세요.');
    } catch(error){setDeletionError(error instanceof Error?error.message:'탈퇴하지 못했습니다. 다시 시도해주세요.');}
    finally {setDeleting(false);}
  }
  return <div className="account-settings">
    {/* 화면에는 보이지 않지만 스크린리더가 페이지 제목으로 읽는다. */}
    <h1 style={{position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0 0 0 0)',whiteSpace:'nowrap'}}>설정</h1>
    {(error||sessionError)&&<p role="alert">{error||sessionError} {sessionError&&<button className="text-button" onClick={()=>void getSession(true).catch(()=>{})}>로그인 확인 다시 시도</button>}</p>}
    {notice&&<p role="status">{notice}</p>}
    {!session ? !sessionError&&<p>로그인 상태 확인 중</p> : !session.account
      ? <a className="button primary" href="/auth/login">로그인</a>
      : <>
        <section className="settings-section" aria-labelledby="settings-profile"><h2 id="settings-profile">프로필</h2>
          <ProfileEditor key={session.account} accountName={session.name} showSharingSettings onChanged={()=>window.dispatchEvent(new Event('proving-profile-updated'))}/>
        </section>
        <section className="settings-section" aria-labelledby="settings-gpt"><h2 id="settings-gpt">GPT API 키 관리</h2>
          <ApiKeySettings onChanged={()=>void getSession(true).catch(()=>{})}/>
        </section>
        {session.provider==='supabase'&&<ConnectedDevices key={session.account}/> }
        <div className="settings-account-actions">
          <button type="button" className="button secondary" disabled={signingOut||deleting} onClick={()=>void signOut()}>{signingOut?'로그아웃 중…':'로그아웃'}</button>
          {session.provider!=='chatgpt'&&!session.local&&<button type="button" className="text-button delete" disabled={signingOut||deleting} onClick={()=>{setConfirmation('');setDeletionError('');deletionDialog.current?.showModal();}}>계정 탈퇴</button>}
        </div>
      </>}
    <dialog ref={deletionDialog} className="account-deletion-dialog" aria-labelledby="account-deletion-title" onCancel={event=>{if(deleting)event.preventDefault();}}>
      <form onSubmit={deleteAccount}>
        <h2 id="account-deletion-title">계정을 탈퇴할까요?</h2>
        <p>공부 기록·원본 대화·초안·공개 요약·프로필·저장한 API 키·연결 기기와 로그인 정보를 모두 삭제합니다. 삭제 후에는 복구할 수 없습니다.</p>
        <p>현재 브라우저의 공부 기록 사본도 지웁니다. 다른 기기의 로컬 사본과 내려받은 파일은 해당 기기에서 직접 삭제해주세요.</p>
        <label>확인을 위해 ‘탈퇴’를 입력해주세요<input value={confirmation} onChange={event=>setConfirmation(event.target.value)} autoComplete="off" disabled={deleting}/></label>
        {deletionError&&<p role="alert">{deletionError}</p>}
        <div className="account-deletion-actions"><button type="button" className="button secondary" disabled={deleting} onClick={()=>deletionDialog.current?.close()}>취소</button><button type="submit" className="button account-delete-confirm" disabled={deleting||confirmation!=='탈퇴'}>{deleting?'삭제 중…':'모든 데이터 삭제 후 탈퇴'}</button></div>
      </form>
    </dialog>
  </div>;
}
