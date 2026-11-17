'use client';
import {useState} from 'react';
import {LEGAL_VERSION} from '@/lib/legal';
import Image from 'next/image';
import Link from 'next/link';
import styles from './login-content.module.css';

export function LoginContent({next='/workspace',titleId='login-title',notice=false}:{next?:string;titleId?:string;notice?:boolean}) {
  const [terms,setTerms]=useState(false),[age,setAge]=useState(false);
  return <section className={styles.card} aria-labelledby={titleId}>
    <Link href="/" className={styles.brand} aria-label="proving 홈"><Image src="/proving-logo.png" alt="proving" width={1306} height={428} className={styles.lightLogo} priority/><Image src="/proving-logo-dark.png" alt="" width={1306} height={428} className={styles.darkLogo} priority/></Link>
    <h1 id={titleId}>내 공부방에 로그인</h1>
    <p>공부 대화와 기록을 저장하고<br/>어느 기기에서든 이어가세요.</p>
    <>{notice&&<p role="alert">로그인을 계속하려면 약관 동의와 연령을 확인해주세요.</p>}</><form method="post" action="/auth/login">
      <input type="hidden" name="next" value={next}/><input type="hidden" name="legalVersion" value={LEGAL_VERSION}/>
      <div className={styles.agreements}>
        <label><input type="checkbox" name="terms" value="accepted" required checked={terms} onChange={e=>setTerms(e.target.checked)}/><span>[필수] <Link href="/terms" target="_blank" rel="noopener">이용약관</Link>에 동의합니다.</span></label>
        <label><input type="checkbox" name="age" value="confirmed" required checked={age} onChange={e=>setAge(e.target.checked)}/><span>[필수] 만 14세 이상입니다.</span></label>
      </div>
      <p className={styles.privacyNotice}>계정과 기록은 서비스 제공을 위해 처리합니다.<br/><Link href="/privacy" target="_blank" rel="noopener">개인정보 처리·국외 이전 안내</Link>를 확인해주세요.</p>
    <div className={styles.actions}>
      <button type="submit" name="provider" value="kakao" className={styles.kakao} disabled={!terms||!age}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.2 4.7 6.6l-1 3.5 4.1-2.4 2.2.2c5.5 0 10-3.5 10-7.9S17.5 3 12 3Z"/></svg><span>카카오로 계속하기</span></button>
      <button type="submit" name="provider" value="github" className={styles.github} disabled={!terms||!age}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1.01.07 1.54 1.03 1.54 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg><span>GitHub로 계속하기</span></button>
    </div></form>
    <small>처음 로그인하면 계정이 만들어집니다.<br/>로그인할 때 현재 약관 동의를 확인합니다.</small>
  </section>;
}
