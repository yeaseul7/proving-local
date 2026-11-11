'use client';
import { useEffect, useState, type FormEvent } from 'react';
import styles from './api-key-settings.module.css';

export function ApiKeySettings({ onChanged, showConnectionStatus = true }: { onChanged?: () => void; showConnectionStatus?: boolean }) {
  const [status, setStatus] = useState<{ connected: boolean; lastFour: string | null } | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/api-key', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setStatus(data);
    }).catch(() => { if (!controller.signal.aborted) setMessage('키 연결 상태를 불러오지 못했습니다. 새로고침해주세요.'); });
    return () => controller.abort();
  }, []);
  async function update(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/api-key', { method: event ? 'PUT' : 'DELETE',
        headers: { 'Content-Type': 'application/json' }, ...(event ? { body: JSON.stringify({ key }) } : {}) });
      setKey('');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setStatus(data); setMessage(data.connected ? 'API 키를 연결했습니다.' : 'API 키를 삭제했습니다.');
      onChanged?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : '키를 저장하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="OpenAI API 키" className={styles.keySettings}>
    {showConnectionStatus && <div className={styles.connectionStatus} role="status">
      <span className={styles.connectionLabel}>{status ? status.connected ? 'API 키 연결됨' : '연결된 키가 없습니다.' : '연결 상태 확인 중'}</span>
      {status?.connected && <code className={styles.maskedKey} aria-label={`저장된 API 키 끝 네 자리 ${status.lastFour}`}>•••• •••• {status.lastFour}</code>}
    </div>}
    <form className={styles.keyForm} onSubmit={update}>
      <div>
        <a className={styles.issueLink} href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">API 키 발급받기 ↗</a>
        <p>OpenAI에 로그인한 뒤 <code className={styles.keyAction}>Create new secret key</code>로 키를 생성하고, 복사한 키를 아래에 붙여넣어주세요.</p>
      </div>
      <hr className={styles.keyDivider} />
      <label>API 키 {status?.connected ? '교체' : '입력'}
        <input type="password" autoComplete="off" autoCapitalize="none" spellCheck={false} value={key} onChange={e => setKey(e.target.value)} placeholder="sk-…" maxLength={1003} required disabled={busy || !status} />
      </label>
      <p className={styles.billingNotice}>본인 키로 AI 활용되며 사용량은 해당 OpenAI 계정에 청구됩니다.</p>
      <p>키는 서버에서 암호화해 보관하며, 저장 후에는 다시 표시하지 않습니다.</p>
      <button className="button primary" type="submit" disabled={busy || !status || !key.trim()}>{busy ? '처리 중…' : status?.connected ? '키 교체' : '키 연결'}</button>
    </form>
    {status?.connected && <button className="text-button delete" disabled={busy} onClick={() => void update()}>저장한 키 삭제</button>}
    {message && <p role="status">{message}</p>}
  </section>;
}
