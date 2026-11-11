import { cookies } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { siwcAuth } from '@/lib/auth/siwc';
import { TRANSACTION_COOKIE } from '@/lib/chat-auth';
import { chatgptPlanAvailable } from '@/lib/runtime-mode';

// 같은 콜백 주소를 GitHub 로그인과 로컬 ChatGPT 플랜 연결이 함께 쓴다.
// ChatGPT 연결은 시작할 때 만든 거래 쿠키와 state 값으로 구분한다.
export async function GET(request: Request) {
  const chatgpt = chatgptPlanAvailable() && new URL(request.url).searchParams.has('state') && (await cookies()).has(TRANSACTION_COOKIE);
  if (!chatgpt) return getAuth().finishLogin(request);
  const response = await siwcAuth.finishLogin(request);
  const location = response.headers.get('location');
  if (location) {
    const next = new URL(location);
    const failed = next.searchParams.get('auth_error');
    next.pathname = '/workspace';
    next.search = failed ? '?chatgpt_error=1' : '';
    response.headers.set('location', next.href);
  }
  return response;
}
