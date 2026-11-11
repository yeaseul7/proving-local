'use client';
import { useEffect, useRef, useState } from 'react';
import type { VisitorCounts } from '@/lib/blog-visitors';

export function ProfileVisitorCounts({ handle }: { handle: string }) {
  const [counts, setCounts] = useState<VisitorCounts | null>(null);
  const request = useRef<{ handle: string; result: Promise<VisitorCounts | null> } | null>(null);
  useEffect(() => {
    let active = true;
    setCounts(null);
    // Share the in-flight request across React's effect replay so a first
    // visitor without a cookie is not counted twice.
    if (request.current?.handle !== handle) {
      request.current = { handle, result: fetch(`/api/public/visit?handle=${encodeURIComponent(handle)}`, { method: 'POST', cache: 'no-store' })
        .then(response => response.ok ? response.json() : null).catch(() => null) };
    }
    void request.current.result.then(value => { if (active) setCounts(value); });
    return () => { active = false; };
  }, [handle]);
  return <dl className="blog-owner-visits" aria-label="프로필 방문객">
    <div><dt>총 방문객</dt><dd>{counts?.total.toLocaleString('ko-KR') ?? '—'}</dd></div>
    <div><dt>오늘 방문객</dt><dd>{counts?.today.toLocaleString('ko-KR') ?? '—'}</dd></div>
  </dl>;
}
