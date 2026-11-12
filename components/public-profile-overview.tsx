'use client';
import { summaryPath } from '@/lib/summary-path';
import Link from 'next/link';
import { useTransition, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from './language-provider';
import { EggGarden } from './egg-garden';
import { ProfileVisitorCounts } from './profile-visitor-counts';
import { ReactionIcon, ViewIcon } from './note-reactions';
import { getSummaryEngagement, getServerSummaryEngagement, subscribeSummaryEngagement } from '@/lib/summary-engagement-client';
import { streak } from '@/lib/study';
import { PUBLIC_PROFILE_PAGE_SIZE, type PublicProfile } from '@/lib/profile';

export function PublicProfileOverview({ profile, today }: { profile: PublicProfile; today: string }) {
  const { language } = useLanguage();
  const en = language === 'en';
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const selectedDay = profile.selectedDay;
  const pageCount = Math.max(1, Math.ceil(profile.totalRecords / PUBLIC_PROFILE_PAGE_SIZE));
  function navigate(page: number, day = selectedDay) {
    const query = new URLSearchParams();
    if (page > 1) query.set('page', String(page));
    if (day) query.set('day', day);
    const search = query.toString();
    startTransition(() => router.push(`/u/${profile.handle}${search ? `?${search}` : ''}`, { scroll: false }));
  }
  const total = Object.values(profile.counts).reduce((sum, count) => sum + count, 0);
  const month = Object.entries(profile.counts).filter(([day]) => day.startsWith(today.slice(0, 7))).reduce((sum, [, count]) => sum + count, 0);
  const consecutive = streak(Object.keys(profile.counts).filter(day => profile.counts[day] > 0).map(date => ({ date })), today);
  const engagement=useSyncExternalStore(subscribeSummaryEngagement,getSummaryEngagement,getServerSummaryEngagement);
  const records = profile.records.map(record=>({...record,views:Math.max(record.views,engagement.get(record.id)?.views??0)}));
  return <section aria-label={en ? `${profile.displayName}'s overview` : `${profile.displayName}님의 개요`}>
    <header className="page-heading"><div><p>{en ? 'Explore · Public overview' : '탐색 · 공개 개요'}</p><h1>{en ? `${profile.displayName}'s overview` : `${profile.displayName}님의 개요`}</h1></div><Link href="/explore" className="text-button">{en ? 'All profiles' : '다른 프로필 탐색'}</Link></header>
    <section className="blog-owner" aria-label={en ? 'Profile' : '프로필'}>
      <div className="blog-owner-sidebar"><header className="blog-owner-header">
        {profile.avatar ? <img className="blog-owner-avatar" src={profile.avatar} alt="" width={64} height={64} /> : <span className="blog-owner-avatar blog-owner-initial" aria-hidden="true">{Array.from(profile.displayName)[0]}</span>}
        <div className="blog-owner-identity"><h2>{profile.displayName}</h2></div>
      </header><ProfileVisitorCounts handle={profile.handle} /></div>
      <div className="blog-owner-intro"><p className="profile-intro-text">{profile.intro || (en ? 'No introduction yet.' : '아직 소개가 없어요.')}</p></div>
    </section>
    <section className="stats" aria-label={en ? 'Public study statistics' : '공개 공부 통계'}>
      <article><p>{en ? 'Streak' : '연속 공개 기록'}</p><strong>{consecutive}<small>{en ? 'days' : '일'}</small></strong></article>
      <article><p>{en ? 'This month' : '이달 공개 기록'}</p><strong>{month}<small>{en ? 'notes' : '개'}</small></strong></article>
      <article><p>{en ? 'Past year' : '최근 1년 공개 기록'}</p><strong>{total}<small>{en ? 'notes' : '개'}</small></strong></article>
    </section>
    <EggGarden counts={profile.counts} today={today} selected={selectedDay} onSelect={day => navigate(1, day)} />
    <section className="notes-section" aria-busy={pending} aria-label={en ? 'Public study notes' : '공개 공부 요약'}>
      <div className="section-title"><h2>{selectedDay ? `${selectedDay} ${en ? 'study notes' : '공부 노트'}` : en ? 'Public study notes' : '공개 공부 요약'}</h2></div>
      {records.length ? <div className="notes-ledger public-ledger"><table><thead><tr><th>{en ? 'Date' : '날짜'}</th><th>{en ? 'Title' : '제목'}</th><th>{en ? 'Reactions' : '반응'}</th></tr></thead><tbody>{records.map(record => <tr key={record.id}><td><time dateTime={record.date}>{record.date.replaceAll('-', '.')}</time></td><td className="ledger-title"><Link href={summaryPath(record)}>{record.title}</Link></td><td className="public-ledger-stats">
        <span aria-label={en ? `${record.views} views` : `조회 ${record.views}`}><ViewIcon size={14}/>{record.views}</span>
        <span aria-label={en ? `${record.likes} likes` : `좋아요 ${record.likes}`}><ReactionIcon reaction="like" size={14}/>{record.likes}</span>
        <span aria-label={en ? `${record.disappointed} could be better` : `아쉬워요 ${record.disappointed}`}><ReactionIcon reaction="disappointed" size={14}/>{record.disappointed}</span>
      </td></tr>)}</tbody></table></div> : <p className="empty-state">{en ? 'No public study notes.' : '공개한 공부 요약이 없습니다.'}</p>}
      {pageCount > 1 && <nav className="explore-pagination" aria-label={en ? 'Study notes pages' : '공부 노트 페이지'}>
        <button type="button" className="button secondary" disabled={pending || profile.page <= 1} onClick={() => navigate(profile.page - 1)}>{en ? 'Previous' : '이전'}</button>
        <span role="status">{profile.page} / {pageCount}</span>
        <button type="button" className="button secondary" disabled={pending || profile.page >= pageCount} onClick={() => navigate(profile.page + 1)}>{en ? 'Next' : '다음'}</button>
      </nav>}
    </section>
  </section>;
}
