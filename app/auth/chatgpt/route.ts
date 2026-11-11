import { siwcAuth } from '@/lib/auth/siwc';
import { chatgptPlanAvailable } from '@/lib/runtime-mode';

// 로컬 실행에서 ChatGPT 플랜을 AI로 연결한다. 로그인 계정(GitHub)은 바뀌지 않는다.
export function GET(request: Request) {
  if (!chatgptPlanAvailable()) return new Response('Not found', { status: 404 });
  return siwcAuth.startLogin(request);
}
