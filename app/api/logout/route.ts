import { getAuth } from '@/lib/auth';
import { COOKIE, logout as disconnectChatgpt } from '@/lib/chat-auth';
import { chatgptPlanAvailable } from '@/lib/runtime-mode';

export async function POST(request: Request) {
  const auth = getAuth();
  const response = await auth.logout(request);
  // 로컬에서 연결한 ChatGPT 플랜도 함께 끊어, 다음에 로그인한 사람이 이전 사람의 플랜을 쓰지 않게 한다.
  if (response.ok && chatgptPlanAvailable()) {
    await disconnectChatgpt().catch(() => {});
    response.headers.append('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  }
  return response;
}
