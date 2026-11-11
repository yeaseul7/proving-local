'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type BrowserSession = {
  account: string | null; name?: string; defaultName?: string; avatar?: string | null; provider?: string; canChat?: boolean;
  local?: boolean; publicBaseUrl?: string;
  chatgptPlan?: { connected: boolean };
};
type SessionState = {
  session: BrowserSession | null; error: string; identityVersion: number;
  getSession: (force?: boolean) => Promise<BrowserSession>;
  clearSession: () => void;
  updateProfile: (account: string, profile: { displayName: string | null; avatar: string | null }) => void;
};
const Context = createContext<SessionState | null>(null);

export function AccountSessionProvider({children}:{children:ReactNode}) {
  const [session,setSession]=useState<BrowserSession|null>(null);
  const [error,setError]=useState('');
  const [identityVersion,setIdentityVersion]=useState(0);
  const current=useRef<BrowserSession|null>(null);
  const pending=useRef<Promise<BrowserSession>|null>(null);
  const generation=useRef(0);
  const getSession=useCallback(function loadSession(force=false):Promise<BrowserSession>{
    if(pending.current&&!force)return pending.current;
    if(current.current&&!force)return Promise.resolve(current.current);
    if(force)generation.current++;
    const requestGeneration=generation.current;
    const work=(async()=>{
      try {
        const response=await fetch('/api/session',{cache:'no-store',signal:AbortSignal.timeout(12_000)});
        if(!response.ok)throw new Error('로그인 상태를 확인하지 못했습니다. 다시 시도해주세요.');
        const next:BrowserSession=await response.json();
        if(next.account!==null&&typeof next.account!=='string')throw new Error('로그인 응답을 확인하지 못했습니다.');
        if(requestGeneration!==generation.current)return loadSession();
        if(current.current&&current.current.account!==next.account)setIdentityVersion(value=>value+1);
        // 내용이 같으면 기존 객체를 그대로 둬, 창 포커스마다 화면 전체가 다시 그려지지 않게 한다.
        if(current.current&&JSON.stringify(current.current)===JSON.stringify(next)){setError('');return current.current;}
        current.current=next;setSession(next);setError('');return next;
      } catch(error) {
        if(requestGeneration===generation.current)setError(error instanceof Error&&error.name!=='TimeoutError'?error.message:'로그인 확인이 지연되고 있습니다. 다시 시도해주세요.');
        throw error;
      }
    })();
    pending.current=work;
    void work.finally(()=>{if(pending.current===work)pending.current=null;}).catch(()=>{});
    return work;
  },[]);
  const clearSession=useCallback(()=>{
    generation.current++;pending.current=null;
    const next={account:null,provider:current.current?.provider};
    current.current=next;setSession(next);setError('');setIdentityVersion(value=>value+1);
  },[]);
  const updateProfile=useCallback((account:string,profile:{displayName:string|null;avatar:string|null})=>{
    const previous=current.current;
    if(!previous||previous.account!==account)return;
    const name=profile.displayName?.trim()||previous.defaultName||previous.name;
    if(previous.name===name&&(previous.avatar??null)===profile.avatar)return;
    // A session response started before this save must not restore old data.
    generation.current++;pending.current=null;
    const next={...previous,name,avatar:profile.avatar};
    current.current=next;setSession(next);
  },[]);
  useEffect(()=>{
    // 창으로 돌아올 때 로그인 상태를 다시 확인하되, 30초 안에는 반복하지 않는다.
    let checkedAt=Date.now();
    const refresh=()=>{if(!current.current||Date.now()-checkedAt<30_000)return;checkedAt=Date.now();void getSession(true).catch(()=>{});};
    // 뒤로가기 캐시로 복원된 페이지는 로그아웃 뒤일 수 있어 항상 바로 확인한다.
    const show=(event:PageTransitionEvent)=>{if(event.persisted&&current.current){checkedAt=Date.now();void getSession(true).catch(()=>{});}};
    window.addEventListener('focus',refresh);window.addEventListener('pageshow',show);
    return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',show);};
  },[getSession]);
  const value=useMemo(()=>({session,error,identityVersion,getSession,clearSession,updateProfile}),[session,error,identityVersion,getSession,clearSession,updateProfile]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAccountSession(){
  const state=useContext(Context);
  if(!state)throw new Error('AccountSessionProvider is required');
  return state;
}
