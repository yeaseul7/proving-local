import { syncUrl } from '@/lib/local-config.mjs';
export default function Page(){return <main style={{padding:32}}><h1>개인정보 안내</h1><p>ChatGPT 인증 토큰은 이 PC의 .local 폴더에 보관합니다. 공부 대화와 기록은 연결한 proving 사이트로 전송되어 저장됩니다. AI 요청은 OpenAI에 전송됩니다.</p><a href={`${syncUrl}/privacy`}>사이트의 개인정보 안내 보기</a><p><a href="/">공부로 돌아가기</a></p></main>;}
