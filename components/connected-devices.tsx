'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Device } from '@/lib/devices';
import styles from './connected-devices.module.css';

type LinkCode = { code: string; expiresAt: string };
const date = (value: string) => new Date(value).toLocaleString('ko-KR');

export function ConnectedDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [code, setCode] = useState<LinkCode | null>(null);
  const [now, setNow] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/devices', { cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.devices)) throw new Error(data.error || '기기 목록을 불러오지 못했습니다.');
      if (!signal?.aborted) setDevices(data.devices);
    } catch (error) {
      if (!signal?.aborted) setError(error instanceof Error ? error.message : '기기 목록을 불러오지 못했습니다.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  useEffect(() => {
    if (!code) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [code]);

  async function issueCode() {
    if (busy) return;
    setBusy(true); setError(''); setNotice(''); setCode(null);
    try {
      const response = await fetch('/api/devices', { method: 'POST', signal: AbortSignal.timeout(15_000) });
      const data = await response.json();
      if (!response.ok || typeof data.code !== 'string' || !Number.isFinite(Date.parse(data.expiresAt))) throw new Error(data.error || '연결 코드를 발급하지 못했습니다.');
      setNow(Date.now()); setCode(data);
    } catch (error) { setError(error instanceof Error ? error.message : '연결 코드를 발급하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/devices', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }), signal: AbortSignal.timeout(15_000) });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.devices)) throw new Error(data.error || '기기 연결을 해제하지 못했습니다. 목록을 새로고침해주세요.');
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
  return <section className="settings-section" aria-labelledby="settings-devices">
    <h2 id="settings-devices">연결된 기기</h2>
    <p>내 PC의 로컬 앱을 이 계정에 연결하면 공부 대화와 기록이 동기화됩니다. ChatGPT 로그인은 로컬 앱에서 진행합니다.</p>
    <div className={styles.actions}>
      <button type="button" className="button secondary" disabled={busy} onClick={()=>void issueCode()}>{busy && !confirmId ? '발급 중…' : '연결 코드 발급'}</button>
      <button type="button" className="text-button" disabled={loading || busy} onClick={()=>void refresh()}>기기 목록 새로고침</button>
    </div>
    {code && <div className={styles.codeBox}>
      {expired ? <p role="status">연결 코드가 만료되었습니다. 새 코드를 발급해주세요.</p> : <>
        <p>로컬 앱 폴더의 터미널에서 아래 명령을 실행하세요.</p>
        <code className={styles.command}>{command}</code>
        <button type="button" className="text-button" onClick={()=>void copyCommand()}>연결 명령 복사</button>
        <p>만료: <time dateTime={code.expiresAt}>{date(code.expiresAt)}</time> · 1회 사용</p>
        <p>새 코드를 발급하면 이전 코드는 무효가 됩니다. 연결 코드는 다른 사람에게 공유하지 마세요.</p>
        <p>연결 후 <code>npm run dev</code>로 실행하고 <a href="http://127.0.0.1:3005" target="_blank" rel="noreferrer">로컬 앱 열기</a>에서 ChatGPT로 로그인하세요.</p>
      </>}
    </div>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">기기 목록을 불러오는 중…</p> : devices.length ? <ul className={styles.list}>
      {devices.map(device=><li key={device.id} className={styles.device}>
        <div><strong>{device.name}</strong><p>연결: <time dateTime={device.createdAt}>{date(device.createdAt)}</time></p><p>마지막 동기화: {device.lastUsedAt ? <time dateTime={device.lastUsedAt}>{date(device.lastUsedAt)}</time> : '아직 없음'}</p></div>
        {confirmId === device.id ? <div><p>이 기기의 동기화를 중지할까요? 저장된 기록은 유지됩니다.</p><div className={styles.actions}><button type="button" className="button secondary" disabled={busy} onClick={()=>void revoke(device.id)}>연결 해제 확인</button><button type="button" className="text-button" disabled={busy} onClick={()=>setConfirmId(null)}>취소</button></div></div> : <button type="button" className="text-button" disabled={busy} aria-label={`${device.name} 연결 해제`} onClick={()=>setConfirmId(device.id)}>연결 해제</button>}
      </li>)}
    </ul> : !error && <p>연결된 기기가 없습니다.</p>}
  </section>;
}
