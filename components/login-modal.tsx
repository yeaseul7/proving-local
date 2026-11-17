'use client';
import { createContext, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { LoginContent } from './login-content';
import styles from './login-modal.module.css';

const Context=createContext<(()=>void)|null>(null);
export function LoginModalProvider({children,enabled}:{children:ReactNode;enabled:boolean}) {
  const pathname=usePathname();
  useEffect(()=>setNext(null),[pathname]);
  const dialog=useRef<HTMLDialogElement>(null);
  const [next,setNext]=useState<string|null>(null);
  const opener=useRef<HTMLElement|null>(null);
  const open=()=>{opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setNext(location.pathname+location.search+location.hash);};
  useEffect(()=>{
    if(next===null)return;
    const element=dialog.current;if(!element)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';element.showModal();
    return()=>{element.close();document.body.style.overflow=previous;opener.current?.focus();};
  },[next]);
  return <Context.Provider value={enabled?open:null}>{children}
    {next!==null&&<dialog ref={dialog} className={styles.dialog} aria-labelledby="modal-login-title" onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();setNext(null);}}} onCancel={()=>setNext(null)} onClose={()=>setNext(null)} onClick={event=>{if(event.target!==event.currentTarget)return;const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)setNext(null);}}>
      <div className={styles.handle} aria-hidden="true"/>
      <button type="button" className={styles.close} aria-label="로그인 닫기" onClick={()=>setNext(null)} autoFocus>×</button>
      <LoginContent next={next} titleId="modal-login-title"/>
    </dialog>}
  </Context.Provider>;
}
export function useLoginModal(){return useContext(Context);}
export function LoginLink({onClick,...props}:ComponentProps<'a'>){
  const open=useLoginModal();
  return <a {...props} onClick={event=>{onClick?.(event);if(!open||event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();open();}}/>;
}
