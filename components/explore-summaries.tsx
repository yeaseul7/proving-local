'use client';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { getSummaryEngagement, getServerSummaryEngagement, subscribeSummaryEngagement } from '@/lib/summary-engagement-client';
import { useLanguage } from './language-provider';
import { EmptyExplore } from './empty-explore';
import { introDescription } from '@/lib/profile';
import type { PublicBlog, PublicListItem } from '@/lib/public-blog';
import { ReactionIcon, ViewIcon } from './note-reactions';

// 탐색 목록은 화면을 오갈 때마다 다시 받지 않는다. 60초 안에는 저장해 둔 목록을 그대로 쓰고,
// 그보다 오래되면 저장된 목록을 먼저 보여준 뒤 뒤에서 새로 받는다. 검색은 받은 목록 안에서만 한다.
const FRESH_MS = 60_000;
let cache: { records: PublicListItem[]; at: number } | null = null;
let inflight: Promise<PublicListItem[]> | null = null;

// 내가 공개 설정을 바꾸면 같은 탭에서는 다음에 탐색을 열 때 바로 새로 받는다.
export function invalidateExploreCache() { cache = null; }

function loadRecords(): Promise<PublicListItem[]> {
  inflight ??= fetch('/api/public')
    .then(async response => {
      if (!response.ok) throw new Error();
      const data: PublicBlog = await response.json();
      if (!Array.isArray(data.records)) throw new Error();
      cache = { records: data.records, at: Date.now() };
      return data.records;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export function ExploreSummaries() {
  const { language } = useLanguage();
  const en = language === 'en';
  const [records, setRecords] = useState<PublicListItem[]>(() => cache?.records ?? []);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(() => !cache);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = (force = false) => {
      if (!force && cache && Date.now() - cache.at < FRESH_MS) return;
      if (!cache) setLoading(true);
      setError(false);
      loadRecords()
        .then(next => { if (active) setRecords(next); })
        // 저장된 목록이 있으면 새로 받기에 실패해도 그대로 보여준다.
        .catch(() => { if (active && !cache) setError(true); })
        .finally(() => { if (active) setLoading(false); });
    };
    refresh(retry > 0);
    // 다른 탭에 있다가 돌아왔을 때 목록이 오래됐으면 새로 받는다.
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; document.removeEventListener('visibilitychange', onVisible); };
  }, [retry]);

  const engagement = useSyncExternalStore(subscribeSummaryEngagement, getSummaryEngagement, getServerSummaryEngagement);
  const search = query.trim().toLocaleLowerCase();
  const filtered = records.map(record => ({ ...record, ...engagement.get(record.id) })).filter(record =>
    `${record.title} ${record.subject} ${record.content}`.toLocaleLowerCase().includes(search));
  // 페이지 제목(탐색)이 이미 설명하므로 섹션 제목과 검색 라벨은 화면에 다시 쓰지 않는다.
  return <section className="explore-summaries" aria-label={en ? 'Public study notes' : '공개 공부 기록'}>
    <label className="explore-search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
      <input type="search" aria-label={en ? 'Search study notes' : '공부 기록 검색'} value={query} onChange={event => setQuery(event.target.value)} placeholder={en ? 'Search by title, topic or content' : '제목, 주제, 내용으로 검색'} />
    </label>
    {loading ? <p role="status">{en ? 'Loading study notes…' : '공부 기록을 불러오는 중'}</p>
      : error ? <p role="alert">{en ? 'Could not load study notes.' : '공부 기록을 불러오지 못했습니다.'} <button className="text-button" onClick={() => setRetry(value => value + 1)}>{en ? 'Retry' : '다시 시도'}</button></p>
      : filtered.length ? <div className="explore-profiles">{filtered.map(record =>
        <Link key={record.id} href={`/summaries/${record.id}`} className="explore-profile-card explore-summary-card">
          <h3>{record.title}</h3>
          <p className="explore-summary-preview">{introDescription(record.content, 120)}</p>
          <div className="explore-summary-meta">
            <small>{record.author && <><span className="explore-summary-author">{record.author.name}</span> · </>}<time dateTime={record.date}>{record.date}</time> · {record.subject}</small>
            <small className="explore-summary-stats">
              <span aria-label={en ? `${record.views} views` : `조회 ${record.views}`}><ViewIcon size={14}/>{record.views}</span>
              <span aria-label={en ? `${record.likes} likes` : `좋아요 ${record.likes}`}><ReactionIcon reaction="like" size={14}/>{record.likes}</span>
              <span aria-label={en ? `${record.disappointed} could be better` : `아쉬워요 ${record.disappointed}`}><ReactionIcon reaction="disappointed" size={14}/>{record.disappointed}</span>
            </small>
          </div>
        </Link>)}</div>
      : <div className="explore-empty">
          <EmptyExplore/>
          {search && records.length
            ? <><h3>{en ? 'No matching study notes' : '찾는 공부 기록이 없어요'}</h3><p>{en ? 'Try a different word.' : '다른 단어로 검색해보세요.'}</p></>
            : <><h3>{en ? 'No public study notes yet' : '아직 공개된 공부 기록이 없어요'}</h3><p>{en ? 'Notes appear here once people make them public.' : '공부를 기록하고 공개하면 이곳에 모여요.'}</p></>}
        </div>}
  </section>;
}
