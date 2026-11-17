'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Device } from '@/lib/devices';
import {useAccountSession} from './account-session';
import {readSetting,settingsCache,settingsKey} from '@/lib/settings-cache';
import styles from './connected-devices.module.css';

type LinkCode = { code: string; expiresAt: string };
const date = (value:string,withTime=true) => new Date(value).toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',...(withTime?{hour:'2-digit',minute:'2-digit'}:{} )});
function DeviceIcon(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="15" height="11" rx="2"/><path d="M7 20h7m-3.5-5v5"/><rect x="16" y="10" width="6" height="11" rx="1.5"/></svg>;}

export function ConnectedDevices() {
  const {session}=useAccountSession();const account=session?.account;
  const [devices,setDevices]=useState<Device[]>(()=>account?settingsCache.peek<{devices:Device[]}>(settingsKey(account,'devices'))?.devices??[]:[]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [code, setCode] = useState<LinkCode | null>(null);
  const [now, setNow] = useState(0);
  const readVersion=useRef(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const refresh=useCallback(async(signal?:AbortSignal,force=false)=>{
    if(!account)return;const version=++readVersion.current;setLoading(true);setError('');
    try{
      const data=await readSetting<{devices:Device[]}>(account,'devices',force);
      if(!signal?.aborted&&version===readVersion.current)setDevices(data.devices);
    }catch(error){if(!signal?.aborted&&version===readVersion.current)setError(error instanceof Error?error.message:'기기 목록을 불러오지 못했습니다.');}
    finally{if(!signal?.aborted)setLoading(false);}
  },[account]);
  useEffect(()=>{if(!account)return;const cached=settingsCache.peek<{devices:Device[]}>(settingsKey(account,'devices'));setDevices(cached?.devices??[]);const controller=new AbortController();void refresh(controller.signal);return()=>controller.abort();},[refresh,account]);
  useEffect(() => {
    if (!code) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [code]);

  async function issueCode() {
    if (busy||!account) return;
    setBusy(true); setError(''); setNotice(''); setCode(null);
    try {
      const response = await fetch('/api/devices', { method: 'POST', signal: AbortSignal.timeout(15_000) });
      const data = await response.json();
      if (!response.ok || typeof data.code !== 'string' || !Number.isFinite(Date.parse(data.expiresAt))) throw new Error(data.error || '연결 코드를 발급하지 못했습니다.');
      settingsCache.invalidate(settingsKey(account,'devices'));
      setNow(Date.now()); setCode(data);
    } catch (error) { setError(error instanceof Error ? error.message : '연결 코드를 발급하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    if (busy||!account) return;
    readVersion.current++;setLoading(false);
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/devices', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }), signal: AbortSignal.timeout(15_000) });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.devices)) throw new Error(data.error || '기기 연결을 해제하지 못했습니다. 목록을 새로고침해주세요.');
      settingsCache.put(settingsKey(account,'devices'),{devices:data.devices});
      setDevices(data.devices); setConfirmId(null); setNotice('기기 연결을 해제했습니다. 해당 기기는 다시 연결해야 기록을 동기화할 수 있습니다.');
    } catch (error) { setError(error instanceof Error ? error.message : '기기 연결을 해제하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  const expired = code && now >= Date.parse(code.expiresAt);
  const command = code ? `npm run link -- ${code.code}` : '';
  async function copyCommand() {
    try { await navigator.clipboard.writeText(command); setNotice('연결 명령을 복사했습니다.'); }
    catch { setError('복사하지 못했습니다. 표시된 명령을 직접 선택해 복사해주세요.'); }
  }
  const remaining=code?Math.max(0,Math.ceil((Date.parse(code.expiresAt)-now)/1000)):0;
  const countdown=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
  async function copyCode(){
    if(!code||expired)return;
    try{await navigator.clipboard.writeText(code.code);setNotice('연결 코드를 복사했습니다.');}
    catch{setError('복사하지 못했습니다. 연결 코드를 직접 선택해 복사해주세요.');}
  }
  return <section className={`settings-section ${styles.section}`} aria-labelledby="settings-devices">
    <header className={styles.header}><div className={styles.heading}><span className={styles.headingIcon}><DeviceIcon/></span><h2 id="settings-devices">연결된 기기</h2></div>{!loading&&<span className={styles.count}>{devices.length}대 연결</span>}</header>
    <div className={styles.intro}><p>기기를 연결하면 공부 대화와 기록이 동기화됩니다.</p><span>ChatGPT 로그인은 로컬 앱에서 진행하세요.</span></div>
    <div className={styles.actions}>
      <button type="button" className={`button primary ${styles.issueButton}`} disabled={busy} onClick={()=>void issueCode()}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>{busy && !confirmId ? '발급 중…' : '연결 코드 발급'}</button>
      <button type="button" className={styles.refreshButton} aria-label="기기 목록 새로고침" disabled={loading || busy} onClick={()=>void refresh(undefined,true)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 6a8 8 0 0 1 13.3 4M4.6 14a8 8 0 0 0 13.3 4"/></svg>새로고침</button>
    </div>
    {code && <div className={styles.codeBox}>
      {expired ? <p role="status" className={styles.expired}>연결 코드가 만료되었습니다. 새 코드를 발급해주세요.</p> : <>
        <div className={styles.codeMeta}><span>일회용 연결 코드</span><span className={styles.countdown}><time dateTime={code.expiresAt} title={`${date(code.expiresAt)} 만료`}>{countdown}</time> 남음</span></div>
        <div className={styles.codeRow}><code className={styles.code}>{code.code}</code><button type="button" className={styles.copyButton} onClick={()=>void copyCode()} aria-label="연결 코드 복사"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></svg>복사</button></div>
        <ol className={styles.steps}><li>연결할 기기에서 <a href="http://127.0.0.1:3005/connect" target="_blank" rel="noreferrer">로컬 앱의 계정 연결 화면</a>을 엽니다.</li><li>위 코드를 입력하고 <strong>이 계정으로 연결</strong>을 누릅니다.</li></ol>
        <p className={styles.codeHint}>10분 동안 한 번만 사용할 수 있어요. 새 코드를 발급하면 이전 코드는 사용할 수 없습니다.</p>
        <details className={styles.terminal}><summary>터미널로 연결하기</summary><p>로컬 앱 폴더의 터미널에서 실행하세요.</p><div className={styles.commandRow}><code className={styles.command}>{command}</code><button type="button" className="text-button" onClick={()=>void copyCommand()}>연결 명령 복사</button></div></details>
      </>}
    </div>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {loading ? <p className={styles.loading} role="status">기기 목록을 불러오는 중…</p> : devices.length ? <ul className={styles.list}>
      {devices.map(device=><li key={device.id} className={styles.device}>
        <div className={styles.deviceMain}><span className={styles.deviceIcon}><DeviceIcon/></span><div className={styles.deviceInfo}><div className={styles.deviceName}><strong>{device.name}</strong><span className={styles.connected}>연결됨</span></div><div className={styles.deviceMeta}><span>연결일 <time dateTime={device.createdAt}>{date(device.createdAt,false)}</time></span><span>최근 동기화 <span>{device.lastUsedAt ? <time dateTime={device.lastUsedAt}>{date(device.lastUsedAt)}</time> : '아직 없음'}</span></span></div></div></div>
        {confirmId === device.id ? <div className={styles.confirm}><div><p>이 기기의 연결을 해제할까요?</p><span>계정에 저장된 공부 기록은 유지됩니다.</span></div><div className={styles.actions}><button type="button" className={styles.confirmButton} disabled={busy} onClick={()=>void revoke(device.id)}>연결 해제 확인</button><button type="button" className={styles.refreshButton} disabled={busy} onClick={()=>setConfirmId(null)}>취소</button></div></div> : <button type="button" className={styles.disconnect} disabled={busy} aria-label={`${device.name} 연결 해제`} onClick={()=>setConfirmId(device.id)}>연결 해제</button>}
      </li>)}
    </ul> : !error && <div className={styles.empty}><span className={styles.emptyIcon}><DeviceIcon/></span><p>연결된 기기가 없습니다.</p><span>연결 코드를 발급해 첫 번째 기기를 추가해 보세요.</span></div>}
  </section>;
}
