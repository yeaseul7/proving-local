'use client';
import { useEffect, useId, useState, type FormEvent } from 'react';
import {useAccountSession} from './account-session';
import {readSetting,settingsCache,settingsKey} from '@/lib/settings-cache';
import {ApiKeyGuide} from './api-key-guide';
import styles from './api-key-settings.module.css';

export function ApiKeySettings({ onChanged, showConnectionStatus = true }: { onChanged?: () => void; showConnectionStatus?: boolean }) {
  const {session}=useAccountSession();const account=session?.account;const inputId=useId(),hintId=useId();
  type Status={connected:boolean;lastFour:string|null};
  const [status,setStatus]=useState<Status|null>(()=>account?settingsCache.peek<Status>(settingsKey(account,'api-key'))??null:null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if(!account)return;let active=true;setMessage('');
    setStatus(settingsCache.peek<Status>(settingsKey(account,'api-key'))??null);
    readSetting<Status>(account,'api-key').then(data=>{if(active)setStatus(data);}).catch(()=>{if(active)setMessage('키 연결 상태를 불러오지 못했습니다. 새로고침해주세요.');});
    return()=>{active=false;};
  },[account]);
  async function update(event?: FormEvent) {
    event?.preventDefault();
    if (busy||!account) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/api-key', { method: event ? 'PUT' : 'DELETE',
        headers: { 'Content-Type': 'application/json' }, ...(event ? { body: JSON.stringify({ key }) } : {}) });
      setKey('');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      settingsCache.put(settingsKey(account,'api-key'),{connected:data.connected,lastFour:data.lastFour});
      setStatus(data); setMessage(data.connected ? 'API 키를 연결했습니다.' : 'API 키를 삭제했습니다.');
      onChanged?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : '키를 저장하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="OpenAI API 키" className={styles.keySettings}>
    {showConnectionStatus&&<div className={styles.connectionStatus} role="status">
      <span className={styles.connectionLabel}><span className={status?.connected?styles.connectedDot:styles.statusDot} aria-hidden="true"/>{status?status.connected?'API 키 연결됨':'연결된 키가 없습니다.':'연결 상태 확인 중'}</span>
      {status?.connected&&<code className={styles.maskedKey} aria-label={`저장된 API 키 끝 네 자리 ${status.lastFour}`}>•••• {status.lastFour}</code>}
    </div>}
    <form className={styles.keyForm} onSubmit={update}>
      <div className={styles.inputHeading}>
        <label htmlFor={inputId}>API 키 {status?.connected?'교체':'입력'}</label>
        <a className={styles.issueLink} href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">API 키 발급받기 ↗</a>
      </div>
      <div className={styles.keyInputRow}>
        <input id={inputId} aria-describedby={hintId} type="password" autoComplete="off" autoCapitalize="none" spellCheck={false} value={key} onChange={e=>setKey(e.target.value)} placeholder="sk-…" maxLength={1003} required disabled={busy||!status}/>
        <button className={`button primary ${styles.saveButton}`} type="submit" disabled={busy||!status||!key.trim()}>{busy?'처리 중…':status?.connected?'키 교체':'키 연결'}</button>
      </div>
      <p id={hintId}>키는 암호화해 보관하며, 저장 후에는 다시 표시하지 않습니다.</p>
      <p className={styles.billingNotice}>API 사용 요금은 연결한 OpenAI 계정에 청구됩니다.</p>
    </form>
    <div className={styles.guideArea}><ApiKeyGuide/></div>
    {status?.connected&&<div className={styles.keyFooter}><button type="button" className="text-button delete" disabled={busy} onClick={()=>void update()}>저장한 키 삭제</button></div>}
    {message&&<p className={styles.message} role="status">{message}</p>}
  </section>;
}
