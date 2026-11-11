import 'server-only';
import { randomUUID } from 'node:crypto';
import type { NextResponse } from 'next/server';
import { validOwnerId } from './public-blog.ts';
import { siteUrl } from './site.ts';

// 로그인 없이 방문자를 구분하는 익명 쿠키. 공개 프로필 방문 수, 요약 조회수와 반응에 함께 쓴다.
export const VISITOR_COOKIE = 'proving-visitor';

export function existingVisitor(request: Request): string | undefined {
  const value = request.headers.get('cookie')?.match(/(?:^|;\s*)proving-visitor=([^;]*)/)?.[1];
  return validOwnerId(value) ? value : undefined;
}

export const visitorFor = (request: Request) => existingVisitor(request) ?? randomUUID();

export function rememberVisitor(response: NextResponse, visitor: string) {
  response.cookies.set(VISITOR_COOKIE, visitor, {
    httpOnly: true, secure: siteUrl.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 365 * 86400,
  });
  return response;
}
