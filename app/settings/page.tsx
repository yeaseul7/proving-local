import { syncUrl } from '@/lib/local-config.mjs';
export default function Settings(){return <main style={{padding:32}}><h1>계정 설정</h1><p>프로필·연결된 기기는 사이트에서 관리합니다.</p><a href={`${syncUrl}/settings`} target="_blank" rel="noreferrer">사이트 설정 열기</a><form action="/api/logout" method="post"><button type="submit">이 PC에서 ChatGPT 로그아웃</button></form><p><a href="/">공부로 돌아가기</a></p></main>;}
