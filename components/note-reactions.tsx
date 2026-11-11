'use client';
import { useEffect, useState } from 'react';
import { publishSummaryEngagement } from '@/lib/summary-engagement-client';

const reactions = [
  { value: 'like', ko: '좋아요', en: 'Like' },
  { value: 'disappointed', ko: '아쉬워요', en: 'Could be better' },
] as const;

type Reaction = (typeof reactions)[number]['value'];
type Engagement = { views: number; likes: number; disappointed: number; mine: Reaction | null };

export function ReactionIcon({ reaction, size = 18 }: { reaction: Reaction; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {reaction === 'like'
      ? <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>
      : <><circle cx="12" cy="12" r="9"/><path d="M8 16a4.5 4.5 0 0 1 8 0M9 9h.01M15 9h.01"/></>}
  </svg>;
}

export function ViewIcon({ size = 15 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>;
}

// publicId가 있으면 서버에 저장된 반응 수를 보여주고 서버에 남긴다(countView면 조회수도 1회 센다).
// 공개하지 않은 기록은 이전처럼 이 브라우저에만 내 반응을 남긴다.
export function NoteReactions({ noteId, publicId, countView = false, showViews = true, language }: { noteId: string; publicId?: string | null; countView?: boolean; showViews?: boolean; language: 'ko' | 'en' }) {
  const storageKey = `proving-note-reaction:${noteId}`;
  const [selected, setSelected] = useState<Reaction | null>(() => {
    if (publicId) return null;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === 'like' || saved === 'disappointed' ? saved : null;
    } catch {
      return null;
    }
  });
  const [counts, setCounts] = useState<Engagement | null>(null);
  const [busy, setBusy] = useState(false);
  const en = language === 'en';

  useEffect(() => {
    if (!publicId) return;
    const controller = new AbortController();
    const base = `/api/public/summaries/${publicId}`;
    fetch(countView ? `${base}/view` : `${base}/reaction`, { method: countView ? 'POST' : 'GET', cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then((data: Engagement | null) => { if (data && !controller.signal.aborted) { setCounts(data); setSelected(data.mine); publishSummaryEngagement(publicId, data); } })
      .catch(() => {});
    return () => controller.abort();
  }, [publicId, countView]);

  async function toggle(reaction: Reaction) {
    const next = selected === reaction ? null : reaction;
    if (!publicId) {
      setSelected(next);
      try {
        if (next) localStorage.setItem(storageKey, next);
        else localStorage.removeItem(storageKey);
      } catch {
        // Keep the selection for this view if browser storage is unavailable.
      }
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/public/summaries/${publicId}/reaction`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reaction: next }),
      });
      if (response.ok) { const data: Engagement = await response.json(); setCounts(data); setSelected(data.mine); publishSummaryEngagement(publicId, data); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="note-reactions" role="group" aria-label={en ? 'Note reactions' : '노트 반응'}>
      {reactions.map(reaction => {
        const count = counts ? (reaction.value === 'like' ? counts.likes : counts.disappointed) : null;
        return <button
          key={reaction.value}
          type="button"
          className="button secondary"
          aria-pressed={selected === reaction.value}
          aria-label={count === null ? reaction[language] : `${reaction[language]} ${count}`}
          title={reaction[language]}
          disabled={busy}
          onClick={() => void toggle(reaction.value)}
        >
          <ReactionIcon reaction={reaction.value} />
          {count !== null && <span aria-hidden="true">{count}</span>}
        </button>;
      })}
      {counts && showViews && <span className="note-views" aria-label={en ? `${counts.views} views` : `조회 ${counts.views}`}><ViewIcon />{counts.views}</span>}
    </div>
  );
}

// 공개 요약 페이지 머리말용 조회수. 열 때 방문자당 한 번 세고, 늘어난 값을 보여준다.
export function SummaryViews({ publicId }: { publicId: string }) {
  const [views, setViews] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/public/summaries/${publicId}/view`, { method: 'POST', cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then((data: Engagement | null) => { if (data && !controller.signal.aborted) { setViews(data.views); publishSummaryEngagement(publicId, data); } })
      .catch(() => {});
    return () => controller.abort();
  }, [publicId]);
  return views === null ? null : <span className="note-views" aria-label={`조회 ${views}`}><ViewIcon />{views}</span>;
}
