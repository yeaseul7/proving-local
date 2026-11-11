'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import Home from './home';

// 같은 레이아웃 안에서 공부방을 유지한다. 설정·탐색은 사이드바 옆 본문에 보여주고 공부 상태는 그대로 둔다.
export function WorkspaceShell({children}:{children:ReactNode}){
  const path=usePathname();
  const settings=path==='/settings';
  const exploring=path==='/explore'||path.startsWith('/u/')||path.startsWith('/summaries/');
  return <Home workspace exploring={exploring} settings={settings} publicContent={exploring||settings?children:undefined}/>;
}
